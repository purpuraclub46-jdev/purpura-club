import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReceiptSeriesType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface IssuedReceipt {
  series: string;
  number: number;
  type: ReceiptSeriesType;
}

/**
 * Servicio enterprise para series de comprobantes SUNAT-ready.
 *
 * Garantiza que la numeración sea atómica y sin saltos:
 *  - `issue()` usa `updateMany` con CAS (`WHERE nextNumber=current`) para
 *    evitar duplicados por concurrencia. Si falla, reintenta hasta 5 veces.
 *  - Cada `(series, type)` es único en BD.
 */
@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Emite el siguiente número de una serie. Devuelve `{series, number, type}`.
   * Si no se indica `seriesId`, busca la serie BOLETA activa de la ubicación.
   */
  async issue(opts: {
    inventoryLocationId: string | null;
    type?: ReceiptSeriesType;
    seriesId?: string;
  }): Promise<IssuedReceipt> {
    const type = opts.type ?? ReceiptSeriesType.BOLETA;

    let seriesRow = opts.seriesId
      ? await this.prisma.receiptSeries.findUnique({
          where: { id: opts.seriesId },
        })
      : await this.prisma.receiptSeries.findFirst({
          where: {
            inventoryLocationId: opts.inventoryLocationId,
            type,
            active: true,
          },
          orderBy: { createdAt: 'asc' },
        });

    if (!seriesRow) {
      throw new NotFoundException(
        'No hay una serie de comprobantes activa para esta ubicación',
      );
    }
    if (!seriesRow.active) {
      throw new ConflictException('La serie de comprobantes no está activa');
    }

    // CAS atómico — reintentamos si dos cajeros emiten al mismo tiempo.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const expected = seriesRow.nextNumber;
      const updated = await this.prisma.receiptSeries.updateMany({
        where: { id: seriesRow.id, nextNumber: expected },
        data: { nextNumber: expected + 1 },
      });
      if (updated.count === 1) {
        return {
          series: seriesRow.series,
          number: expected,
          type: seriesRow.type,
        };
      }
      // Reload y reintenta
      seriesRow = await this.prisma.receiptSeries.findUnique({
        where: { id: seriesRow.id },
      });
      if (!seriesRow) {
        throw new NotFoundException('La serie fue eliminada durante la emisión');
      }
    }
    throw new ConflictException(
      'No se pudo asignar un número de comprobante por contención',
    );
  }

  /** Lista series activas (típicamente filtradas por ubicación). */
  list(opts: {
    inventoryLocationId?: string | null;
    type?: ReceiptSeriesType;
  }) {
    const where: Prisma.ReceiptSeriesWhereInput = { active: true };
    if (opts.inventoryLocationId !== undefined) {
      where.inventoryLocationId = opts.inventoryLocationId;
    }
    if (opts.type) where.type = opts.type;
    return this.prisma.receiptSeries.findMany({
      where,
      orderBy: [{ type: 'asc' }, { series: 'asc' }],
    });
  }
}
