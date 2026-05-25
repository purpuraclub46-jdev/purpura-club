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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
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
import {
  CreateTransferDto,
  PaginatedTransfersResponseDto,
  TransferQueryDto,
  TransferResponseDto,
} from './dto';
import { InventoryTransfersService } from './inventory-transfers.service';

@ApiTags('inventory-transfers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'inventory-transfers', version: '1' })
export class InventoryTransfersController {
  constructor(private readonly service: InventoryTransfersService) {}

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar transferencias de inventario' })
  @ApiOkResponse({ type: PaginatedTransfersResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  list(@Query() query: TransferQueryDto) {
    return this.service.findMany(query);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detalle de una transferencia' })
  @ApiOkResponse({ type: TransferResponseDto })
  @ApiNotFoundResponse()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Crear una transferencia entre dos ubicaciones (queda en estado PENDING)',
  })
  @ApiCreatedResponse({ type: TransferResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  create(
    @Body() dto: CreateTransferDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.create(dto, userId);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Completar transferencia: descuenta de origen, agrega a destino y registra TRANSFER_OUT/IN.',
  })
  @ApiOkResponse({ type: TransferResponseDto })
  @ApiBadRequestResponse({ description: 'Stock insuficiente en origen' })
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'Transferencia no está pendiente' })
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.complete(id, userId);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar una transferencia pendiente' })
  @ApiOkResponse({ type: TransferResponseDto })
  @ApiConflictResponse({ description: 'Sólo se cancelan las pendientes' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id);
  }
}
