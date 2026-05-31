import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReferralMeResponseDto } from './dto/referral-me.dto';
import { ReferralQueryDto } from './dto/referral-query.dto';
import { ReferralResponseDto } from './dto/referral-response.dto';
import { ReferralsService } from './referrals.service';

@ApiTags('referrals')
@Controller({ path: 'referrals', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ReferralsController {
  constructor(private readonly service: ReferralsService) {}

  /**
   * F2.7-C — Resumen del programa de referidos para el usuario autenticado.
   *
   * Endpoint accesible a CUALQUIER usuario logueado (sin @Roles). El payload
   * incluye su código único, link compartible, stats agregadas e historial
   * con nombres ofuscados (R8).
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Resumen de referidos del usuario autenticado (código, link, stats e historial)',
  })
  @ApiOkResponse({ type: ReferralMeResponseDto })
  @ApiUnauthorizedResponse()
  getMe(@CurrentUser('id') userId: string) {
    return this.service.getMeOverview(userId);
  }

  // ─── Admin ────────────────────────────────────────────────────────────

  @Get('admin/all')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar referidos (admin)' })
  @ApiOkResponse({ type: ReferralResponseDto, isArray: true })
  list(@Query() query: ReferralQueryDto) {
    return this.service.findMany(query);
  }
}
