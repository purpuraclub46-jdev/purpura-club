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
  ApiQuery,
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
  CreateCreditNoteDto,
  CreditNoteResponseDto,
  ReturnableOrderDto,
} from './dto';
import { PosCreditNotesService } from './pos-credit-notes.service';

@ApiTags('pos-credit-notes')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'pos/credit-notes', version: '1' })
export class PosCreditNotesController {
  constructor(private readonly service: PosCreditNotesService) {}

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.returns.view')
  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar venta POS para devolución por número, DNI o boleta',
  })
  @ApiQuery({ name: 'query', required: true })
  @ApiOkResponse({ type: ReturnableOrderDto })
  searchOrder(
    @Query('query') query: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.findReturnableOrder({ query, actor });
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.returns.create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Emitir nota de crédito / devolución / anulación' })
  @ApiCreatedResponse({ type: CreditNoteResponseDto })
  create(
    @Body() dto: CreateCreditNoteDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.createCreditNote(dto, actor);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.returns.view')
  @Get('locations/:locationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Historial de notas de crédito de la sucursal' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiOkResponse({ type: [CreditNoteResponseDto] })
  listForLocation(
    @Param('locationId', ParseUUIDPipe) inventoryLocationId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    const n = limit
      ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200)
      : 50;
    return this.service.listForLocation({
      inventoryLocationId,
      actor,
      limit: n,
    });
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('pos.returns.view')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detalle de una nota de crédito' })
  @ApiOkResponse({ type: CreditNoteResponseDto })
  getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.getById({ id, actor });
  }
}
