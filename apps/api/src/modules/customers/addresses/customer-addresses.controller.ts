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
  UseGuards,
} from '@nestjs/common';
import {
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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CustomerAddressesService } from './customer-addresses.service';
import {
  AddressResponseDto,
  CreateAddressDto,
  UpdateAddressDto,
} from './dto/address.dto';

/**
 * FASE 2 / F2.5 — CRUD de direcciones del cliente autenticado.
 *
 * Todos los endpoints resuelven el Customer del cliente por el JWT
 * (`Customer.userId === jwt.id`, FASE 1 unification). Anti-enumeration
 * uniforme con `404 Dirección no encontrada` para "no existe", "no es
 * tuya" y "está borrada".
 */
@ApiTags('Customer Addresses')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@UseGuards(JwtAuthGuard)
@Controller('customers/me/addresses')
export class CustomerAddressesController {
  constructor(private readonly service: CustomerAddressesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista las direcciones activas del cliente autenticado',
  })
  @ApiOkResponse({ type: [AddressResponseDto] })
  @ApiForbiddenResponse({ description: 'Usuario sin perfil de cliente' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<AddressResponseDto[]> {
    return this.service.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una dirección propia' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Dirección no encontrada' })
  @ApiForbiddenResponse({ description: 'Usuario sin perfil de cliente' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<AddressResponseDto> {
    return this.service.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una nueva dirección' })
  @ApiCreatedResponse({ type: AddressResponseDto })
  @ApiConflictResponse({
    description: 'Excede el máximo de direcciones activas',
  })
  @ApiForbiddenResponse({ description: 'Usuario sin perfil de cliente' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una dirección propia' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Dirección no encontrada' })
  @ApiForbiddenResponse({ description: 'Usuario sin perfil de cliente' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar (soft delete) una dirección propia',
    description:
      'Si la dirección era la default de su tipo, se promueve a default la siguiente activa más reciente del mismo tipo.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Dirección no encontrada' })
  @ApiForbiddenResponse({ description: 'Usuario sin perfil de cliente' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    await this.service.remove(user.id, id);
  }

  @Post(':id/default')
  @ApiOperation({
    summary: 'Marcar esta dirección como principal de su tipo',
    description:
      'La default anterior del mismo tipo se desmarca atómicamente dentro de la misma transacción.',
  })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Dirección no encontrada' })
  @ApiForbiddenResponse({ description: 'Usuario sin perfil de cliente' })
  setDefault(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<AddressResponseDto> {
    return this.service.setDefault(user.id, id);
  }
}
