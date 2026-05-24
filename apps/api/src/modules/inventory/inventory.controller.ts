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
  ApiNoContentResponse,
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
  InventoryQueryDto,
  InventoryRowDto,
  MovementsQueryDto,
  PaginatedInventoryResponseDto,
  PaginatedMovementsResponseDto,
  TransferStockDto,
} from './dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'inventory', version: '1' })
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar inventario por sucursal/producto' })
  @ApiOkResponse({ type: PaginatedInventoryResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  list(@Query() query: InventoryQueryDto) {
    return this.service.findInventory(query);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ajustar stock manualmente (alta, baja o pérdida)',
  })
  @ApiOkResponse({ type: InventoryRowDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  adjust(
    @Body() dto: AdjustStockDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.adjust(dto, userId);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('transfer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Transferir stock entre sucursales' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  async transfer(
    @Body() dto: TransferStockDto,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.service.transfer(dto, userId);
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
