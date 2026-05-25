import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
  AdjustStockDto,
  MovementsQueryDto,
  PaginatedMovementsResponseDto,
  PaginatedStockResponseDto,
  ReserveStockDto,
  StockQueryDto,
  StockRowDto,
  UpdateMinimumStockDto,
} from './dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'inventory', version: '1' })
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('stock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar stock por ubicación' })
  @ApiOkResponse({ type: PaginatedStockResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listStock(@Query() query: StockQueryDto) {
    return this.service.findStock(query);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('stock/adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Ajustar stock manualmente (RESTOCK, ADJUSTMENT, LOSS) en una ubicación',
  })
  @ApiOkResponse({ type: StockRowDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  adjust(
    @Body() dto: AdjustStockDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.adjust(dto, userId);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('stock/minimum')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar stock mínimo de un producto en una ubicación' })
  @ApiOkResponse({ type: StockRowDto })
  setMinimum(@Body() dto: UpdateMinimumStockDto) {
    return this.service.setMinimum(dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('stock/reserve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Reservar stock disponible (para checkout ecommerce u operaciones POS).',
  })
  @ApiOkResponse({ type: StockRowDto })
  @ApiBadRequestResponse()
  reserve(
    @Body() dto: ReserveStockDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.reserve(dto, userId);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('stock/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liberar una reserva previa de stock' })
  @ApiOkResponse({ type: StockRowDto })
  @ApiBadRequestResponse()
  release(
    @Body() dto: ReserveStockDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.release(dto, userId);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('movements')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Historial de movimientos de inventario' })
  @ApiOkResponse({ type: PaginatedMovementsResponseDto })
  movements(@Query() query: MovementsQueryDto) {
    return this.service.findMovements(query);
  }
}
