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
import { ApiProperty } from '@nestjs/swagger';
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
import { Role as AccessLevel } from '@prisma/client';
import { IsBoolean } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  CustomerDetailResponseDto,
  CustomerOverviewStatsDto,
  CustomerQueryDto,
  CustomerResponseDto,
  CustomerSearchDto,
  UpdateCustomerDto,
} from './dto';

class SetActiveDto {
  @ApiProperty()
  @IsBoolean()
  active!: boolean;
}

@ApiTags('customers')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'customers', version: '1' })
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('customers.view')
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar clientes con filtros y búsqueda' })
  @ApiOkResponse({ description: 'Lista paginada de clientes.' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  list(
    @Query() query: CustomerQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.findMany(query, actor);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('customers.view')
  @Get('overview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'KPIs globales del CRM' })
  @ApiOkResponse({ type: CustomerOverviewStatsDto })
  overview(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CustomerOverviewStatsDto> {
    return this.service.overview(actor);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('customers.view')
  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Búsqueda rápida del POS (nombre / DNI / teléfono / email)',
  })
  @ApiOkResponse({ type: [CustomerResponseDto] })
  search(
    @Query() dto: CustomerSearchDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.search(dto, actor);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('customers.view')
  @Get('lookup/:document')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Búsqueda fiscal por número exacto de documento (DNI o RUC). Útil al elegir comprobante en el POS / checkout.',
  })
  @ApiOkResponse({
    description:
      'Cliente encontrado, o `null` si no existe (la UI puede crear uno nuevo con ese documento).',
  })
  async lookupByDocument(
    @Param('document') document: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CustomerResponseDto | null> {
    return this.service.lookupByDocument({
      documentNumber: document,
      actor,
    });
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('customers.view')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detalle del cliente con historial' })
  @ApiOkResponse({ type: CustomerDetailResponseDto })
  @ApiNotFoundResponse()
  getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.findById(id, actor);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('customers.create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un cliente (CRM o POS rápido)' })
  @ApiCreatedResponse({ type: CustomerResponseDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.create(dto, actor);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('customers.edit')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar un cliente' })
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('customers.edit')
  @Post(':id/active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activar o desactivar un cliente' })
  @ApiOkResponse({ type: CustomerResponseDto })
  setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetActiveDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.setActive(id, Boolean(dto.active), actor);
  }

  @Roles(AccessLevel.SUPER_ADMIN)
  @RequirePermissions('customers.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar cliente' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.service.remove(id, actor);
  }
}
