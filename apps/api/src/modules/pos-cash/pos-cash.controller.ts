import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role as AccessLevel } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import {
  CashRegisterSummaryDto,
  CashSessionMovementDto,
  CashSessionResponseDto,
  CloseSessionDto,
  CreateCashMovementDto,
  OpenSessionDto,
} from './dto';
import { PosCashService } from './pos-cash.service';

@ApiTags('pos-cash')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'pos/cash', version: '1' })
export class PosCashController {
  constructor(private readonly service: PosCashService) {}

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.access')
  @Get('locations/:locationId/registers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar cajas de una sucursal' })
  @ApiOkResponse({ type: [CashRegisterSummaryDto] })
  listRegisters(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.findRegistersForLocation(locationId, actor);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.access')
  @Get('locations/:locationId/active-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener la sesión de caja actualmente abierta en la sucursal',
  })
  @ApiOkResponse({ type: CashSessionResponseDto })
  activeSession(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.findActiveSessionForLocation(locationId, actor);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.cash.open')
  @Post('locations/:locationId/sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abrir una sesión de caja' })
  @ApiCreatedResponse({ type: CashSessionResponseDto })
  open(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Body() dto: OpenSessionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.openSession({
      inventoryLocationId: locationId,
      cashRegisterId: dto.cashRegisterId,
      openingAmount: dto.openingAmount,
      notes: dto.notes,
      actor,
    });
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.cash.close')
  @Post('sessions/:sessionId/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar una sesión de caja' })
  @ApiOkResponse({ type: CashSessionResponseDto })
  close(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: CloseSessionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.closeSession({
      sessionId,
      closingAmount: dto.closingAmount,
      notes: dto.notes,
      actor,
    });
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.cash.movements')
  @Post('sessions/:sessionId/movements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar un ingreso o egreso manual en la sesión',
  })
  @ApiCreatedResponse({ type: CashSessionMovementDto })
  addMovement(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: CreateCashMovementDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.addMovement({ sessionId, dto, actor });
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.access')
  @Get('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener una sesión por id' })
  @ApiOkResponse({ type: CashSessionResponseDto })
  @ApiNotFoundResponse()
  getSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.getSession(sessionId, actor);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.reports.view')
  @Get('locations/:locationId/sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar las últimas sesiones de caja' })
  @ApiOkResponse({ type: [CashSessionResponseDto] })
  listSessions(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100) : 20;
    return this.service.listSessionsForLocation(locationId, actor, n);
  }
}
