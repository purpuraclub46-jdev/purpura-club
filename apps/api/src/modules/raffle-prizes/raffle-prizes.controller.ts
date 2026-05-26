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
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  AssignWinnerDto,
  CreatePrizeDto,
  PrizeResponseDto,
  PublishWinnerDto,
  UpdatePrizeDto,
} from './dto';
import { RafflePrizesService } from './raffle-prizes.service';
import { RaffleTicketsExportService } from './raffle-tickets-export.service';

@ApiTags('raffle-prizes')
@Controller({ path: 'raffles', version: '1' })
export class RafflePrizesController {
  constructor(
    private readonly service: RafflePrizesService,
    private readonly exportService: RaffleTicketsExportService,
  ) {}

  // ─── PÚBLICO: ganadores oficiales ────────────────────────────────
  @Public()
  @Get('prizes/winners')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Ganadores oficiales publicados (para landing, panel usuario, ecommerce).',
  })
  @ApiOkResponse({ type: PrizeResponseDto, isArray: true })
  listPublishedWinners() {
    return this.service.listPublishedWinners();
  }

  // ─── ADMIN ───────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get(':raffleId/prizes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar premios del sorteo (admin).' })
  @ApiOkResponse({ type: PrizeResponseDto, isArray: true })
  listPrizes(@Param('raffleId', ParseUUIDPipe) raffleId: string) {
    return this.service.listByRaffle(raffleId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Post(':raffleId/prizes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear premio en el sorteo.' })
  createPrize(
    @Param('raffleId', ParseUUIDPipe) raffleId: string,
    @Body() dto: CreatePrizeDto,
  ) {
    return this.service.create(raffleId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get('prizes/:id')
  @HttpCode(HttpStatus.OK)
  getPrize(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Patch('prizes/:id')
  @HttpCode(HttpStatus.OK)
  updatePrize(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrizeDto,
  ) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Delete('prizes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePrize(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }

  // ─── ASIGNACIÓN MANUAL DE GANADOR ────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Post('prizes/:id/assign-winner')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Asigna manualmente al ganador del premio usando el número de ticket.',
  })
  assignWinner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignWinnerDto,
  ) {
    return this.service.assignWinner(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Post('prizes/:id/clear-winner')
  @HttpCode(HttpStatus.OK)
  clearWinner(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.clearWinner(id);
  }

  // ─── PUBLICACIÓN OFICIAL ─────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Post('prizes/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Publica oficialmente al ganador (foto, video, comunicado de entrega).',
  })
  publishWinner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishWinnerDto,
  ) {
    return this.service.publishWinner(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Post('prizes/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  unpublishWinner(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.unpublishWinner(id);
  }

  // ─── EXPORTACIÓN EXCEL ───────────────────────────────────────────
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get(':raffleId/export-tickets')
  @ApiOperation({
    summary:
      'Exporta TODOS los tickets pagados del sorteo en formato XLSX. Cada fila incluye usuario, nombre, email, DNI, ticket y tipo de participación.',
  })
  async exportTickets(
    @Param('raffleId', ParseUUIDPipe) raffleId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } =
      await this.exportService.exportTicketsXlsx(raffleId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}
