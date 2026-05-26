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
  CreatePosSaleDto,
  PosSaleResponseDto,
} from './dto';
import { PosSalesService } from './pos-sales.service';

@ApiTags('pos-sales')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'pos/sales', version: '1' })
export class PosSalesController {
  constructor(private readonly service: PosSalesService) {}

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.sales')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar una venta POS' })
  @ApiCreatedResponse({ type: PosSaleResponseDto })
  create(
    @Body() dto: CreatePosSaleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.createSale(dto, actor);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.reports.view')
  @Get('locations/:locationId/recent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Últimas ventas POS de la sucursal' })
  @ApiOkResponse({ type: [PosSaleResponseDto] })
  recent(
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    const n = limit ? Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100) : 20;
    return this.service.listRecent(locationId, actor, n);
  }
}
