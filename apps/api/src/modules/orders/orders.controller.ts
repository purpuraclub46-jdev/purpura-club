import {
  Body,
  Controller,
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
  CreateOrderDto,
  OrderQueryDto,
  OrderResponseDto,
  PaginatedOrdersResponseDto,
  UpdateOrderStatusDto,
} from './dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar pedidos' })
  @ApiOkResponse({ type: PaginatedOrdersResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  list(@Query() query: OrderQueryDto) {
    return this.service.findMany(query);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener un pedido por id' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un pedido manual (fundación POS)' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse()
  create(@Body() dto: CreateOrderDto) {
    return this.service.create(dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Actualizar el estado de un pedido. Al pasar a PAID se descuenta el stock.',
  })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.updateStatus(id, dto, userId);
  }
}
