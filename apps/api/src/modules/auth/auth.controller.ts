import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { AUTH_CONFIG_KEY, AuthConfig } from '../../config/auth.config';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TokenHelper } from './helpers/token.helper';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  private readonly authConfig: AuthConfig;

  constructor(
    private readonly authService: AuthService,
    private readonly tokenHelper: TokenHelper,
    configService: ConfigService,
  ) {
    const config = configService.get<AuthConfig>(AUTH_CONFIG_KEY);

    if (!config) {
      throw new Error('Auth configuration is missing');
    }

    this.authConfig = config;
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'Account created — returns the authenticated user and tokens.',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Email already in use' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.tokens.refreshToken);
    return result;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Authentication successful — returns user and tokens.',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, result.tokens.refreshToken);
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate access & refresh tokens using a valid refresh token',
    description:
      'Accepts a refresh token from the request body or from the secure HTTP-only cookie. Rotates both tokens — the previous refresh token is invalidated.',
  })
  @ApiBody({ type: RefreshTokenDto, required: false })
  @ApiOkResponse({
    description: 'New token pair issued.',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const token = this.extractRefreshToken(dto, req);

    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const result = await this.authService.refresh(token);
    this.setRefreshCookie(res, result.tokens.refreshToken);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Invalidate the current session refresh token' })
  @ApiNoContentResponse({ description: 'Session terminated' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(userId);
    this.clearRefreshCookie(res);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return the currently authenticated user' })
  @ApiOkResponse({ description: 'Current user profile', type: AuthUserDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUserDto> {
    return this.authService.getProfile(user.id);
  }

  private extractRefreshToken(
    dto: RefreshTokenDto,
    req: Request,
  ): string | undefined {
    if (dto.refreshToken) {
      return dto.refreshToken;
    }

    const cookieName = this.authConfig.refreshCookie.name;
    const fromCookie = (req.cookies as Record<string, string> | undefined)?.[
      cookieName
    ];

    return fromCookie;
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(
      this.authConfig.refreshCookie.name,
      token,
      this.buildCookieOptions(),
    );
  }

  private clearRefreshCookie(res: Response): void {
    const options = this.buildCookieOptions();
    res.clearCookie(this.authConfig.refreshCookie.name, {
      domain: options.domain,
      path: options.path,
      secure: options.secure,
      sameSite: options.sameSite,
      httpOnly: true,
    });
  }

  private buildCookieOptions(): CookieOptions {
    const cookie = this.authConfig.refreshCookie;

    return {
      httpOnly: true,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
      ...(cookie.domain ? { domain: cookie.domain } : {}),
      maxAge: this.tokenHelper.getRefreshTokenMaxAgeMs(),
    };
  }
}
