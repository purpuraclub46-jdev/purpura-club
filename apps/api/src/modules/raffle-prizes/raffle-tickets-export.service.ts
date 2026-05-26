import { Injectable, NotFoundException } from '@nestjs/common';
import { EntryStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Genera un Excel con TODOS los tickets válidos (PAID) de un sorteo,
 * pensado para que el admin haga el sorteo manualmente en una plataforma
 * externa y regrese con el número de ticket ganador.
 *
 * Columnas: ticket, usuario, nombre, email, DNI, fecha, tipo, raffleId.
 */
@Injectable()
export class RaffleTicketsExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportTicketsXlsx(raffleId: string): Promise<{
    buffer: Buffer;
    filename: string;
  }> {
    const raffle = await this.prisma.raffle.findUnique({
      where: { id: raffleId },
      select: { id: true, title: true, slug: true },
    });
    if (!raffle) throw new NotFoundException('Sorteo no encontrado');

    const entries = await this.prisma.raffleEntry.findMany({
      where: { raffleId, status: EntryStatus.PAID },
      orderBy: { ticketNumber: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            dni: true,
          },
        },
      },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Púrpura Club';
    wb.lastModifiedBy = 'Púrpura Club';
    wb.created = new Date();

    const sheet = wb.addWorksheet(`Tickets - ${raffle.title}`.slice(0, 31));
    sheet.columns = [
      { header: 'Ticket', key: 'ticket', width: 10 },
      { header: 'Usuario ID', key: 'userId', width: 38 },
      { header: 'Nombre', key: 'fullName', width: 28 },
      { header: 'Email', key: 'email', width: 32 },
      { header: 'DNI', key: 'dni', width: 14 },
      { header: 'Fecha', key: 'createdAt', width: 22 },
      { header: 'Tipo participación', key: 'type', width: 22 },
      { header: 'Sorteo ID', key: 'raffleId', width: 38 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };

    for (const e of entries) {
      sheet.addRow({
        ticket: e.ticketNumber,
        userId: e.userId,
        fullName: `${e.user.firstName} ${e.user.lastName}`.trim(),
        email: e.user.email,
        dni: e.user.dni ?? '',
        createdAt: e.createdAt.toISOString(),
        type: e.type,
        raffleId,
      });
    }

    const arrayBuffer = await wb.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeSlug = raffle.slug.replace(/[^a-z0-9-]/gi, '-');
    const filename = `tickets-${safeSlug}-${Date.now()}.xlsx`;

    return { buffer, filename };
  }
}
