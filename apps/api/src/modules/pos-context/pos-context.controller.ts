import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
  PosBootstrapDto,
  PosLocationDto,
  PosLocationReceiptSeriesDto,
  PosReportsDto,
} from './dto/pos-context-response.dto';
import { PosContextService } from './pos-context.service';

@ApiTags('pos-context')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'pos/context', version: '1' })
export class PosContextController {
  constructor(private readonly service: PosContextService) {}

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.access')
  @Get('bootstrap')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener sucursales que el usuario puede operar en POS',
  })
  @ApiOkResponse({ type: PosBootstrapDto })
  bootstrap(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.bootstrap(actor);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.access')
  @Get('locations/:slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolver sucursal por slug + caja activa' })
  @ApiOkResponse({ type: PosLocationDto })
  resolve(
    @Param('slug') slug: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.resolveLocationBySlug(slug, actor);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.access')
  @Get('locations/:locationId/series')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Series de comprobantes de la sucursal' })
  @ApiOkResponse({ type: [PosLocationReceiptSeriesDto] })
  series(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.listReceiptSeries(locationId, actor);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.reports.view')
  @Get('locations/:locationId/reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'KPIs del POS para la sucursal' })
  @ApiOkResponse({ type: PosReportsDto })
  reports(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.reports(locationId, actor);
  }
}
