import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OptionalCurrentUser } from '../auth/decorators/optional-current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  AdminRaffleQueryDto,
  CreateRaffleDto,
  RaffleQueryDto,
  UpdateRaffleDto,
} from './dto';
import {
  PaginatedRafflesResponseDto,
  RaffleResponseDto,
} from './dto/raffle-response.dto';
import { RafflesService } from './raffles.service';

@ApiTags('raffles')
@Controller({ path: 'raffles', version: '1' })
export class RafflesController {
  constructor(private readonly rafflesService: RafflesService) {}

  // ───── Public (optional auth) ─────
  //
  // F2.7-B — Estos endpoints son públicos pero ahora extraen el `userId`
  // del JWT cuando está presente (OptionalJwtAuthGuard NO bloquea si falta
  // el token). Esto permite que el bloque `pricing` se resuelva con
  // membresía activa para socios autenticados, sin perder accesibilidad
  // para visitantes anónimos.

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List published public raffles' })
  @ApiOkResponse({ type: PaginatedRafflesResponseDto })
  listPublic(
    @Query() query: RaffleQueryDto,
    @OptionalCurrentUser('id') userId?: string,
  ) {
    return this.rafflesService.findPublic(query, userId ?? null);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('slug/:slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a published raffle by slug' })
  @ApiOkResponse({ type: RaffleResponseDto })
  @ApiNotFoundResponse({ description: 'Raffle not found' })
  getBySlug(
    @Param('slug') slug: string,
    @OptionalCurrentUser('id') userId?: string,
  ) {
    return this.rafflesService.findBySlugPublic(slug, userId ?? null);
  }

  // ───── Admin ─────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List raffles (admin — includes drafts/private)' })
  @ApiOkResponse({ type: PaginatedRafflesResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listAdmin(@Query() query: AdminRaffleQueryDto) {
    return this.rafflesService.findAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get raffle by id (admin)' })
  @ApiOkResponse({ type: RaffleResponseDto })
  @ApiNotFoundResponse()
  getByIdAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.rafflesService.findByIdAdmin(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new raffle' })
  @ApiCreatedResponse({ type: RaffleResponseDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse({ description: 'Slug already in use' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  create(@Body() dto: CreateRaffleDto) {
    return this.rafflesService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a raffle' })
  @ApiOkResponse({ type: RaffleResponseDto })
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRaffleDto) {
    return this.rafflesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a raffle' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.rafflesService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a raffle' })
  @ApiOkResponse({ type: RaffleResponseDto })
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.rafflesService.publish(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a raffle (no more entries allowed)' })
  @ApiOkResponse({ type: RaffleResponseDto })
  @ApiNotFoundResponse()
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.rafflesService.close(id);
  }
}
