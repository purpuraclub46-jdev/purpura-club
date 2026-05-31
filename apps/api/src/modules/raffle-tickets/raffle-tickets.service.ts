import { Injectable, Logger } from '@nestjs/common';
import {
  EntryStatus,
  EntryType,
  PaymentMethod,
  PrismaClient,
  RaffleStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Tipo Prisma transactional aceptado por el helper. Soporta tanto el cliente
 * raíz (`PrismaService`) como una transacción interactiva (`Prisma.TransactionClient`).
 */
type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface GrantTicketsArgs {
  /** Usuario que recibe los tickets. */
  userId: string;
  /** Cantidad a otorgar. Si <= 0 retorna 0 sin tocar la DB. */
  quantity: number;
  /** Tipo de entrada: PURCHASE_REWARD (default), BONUS, REFERRAL. */
  entryType?: EntryType;
  /** Texto libre para `paymentReference`, útil para auditoría. */
  reference: string;
  /** Si la asignación está vinculada a una Order específica. */
  orderId?: string | null;
  /** Cliente Prisma o transacción opcional. */
  tx?: Tx;
}

/**
 * Servicio centralizado para otorgar `RaffleEntry` automáticas (no compradas
 * directamente) sobre el sorteo PUBLISHED activo más próximo a finalizar.
 *
 * Reemplaza las implementaciones duplicadas que vivían en
 * `OrdersService.grantPurchaseEntries` y `PosSalesService.processMembershipAndRaffle`.
 *
 * Garantías:
 *   - Reserva atómica del rango de `ticketNumber` vía CAS sobre `Raffle.soldTickets`.
 *   - Si no hay sorteo activo o no quedan asientos, retorna 0 sin error.
 *   - Idempotente desde el punto de vista del caller: dos llamadas para
 *     entregar 2 tickets generan 2 filas distintas (NUNCA duplicados gracias
 *     al unique `(raffleId, ticketNumber)`).
 *
 * NO se ocupa de:
 *   - Decidir si el comprador califica (eso lo hace MembershipsService).
 *   - Loguear `MembershipBenefitLog` (eso lo hace MembershipsService).
 *   - Revertir tickets (esa lógica vive en PosCreditNotesService /
 *     MembershipsService.revertPaidPurchase).
 */
@Injectable()
export class RaffleTicketsService {
  private readonly logger = new Logger(RaffleTicketsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Asigna `quantity` tickets al `userId` sobre el sorteo PUBLISHED activo
   * con `endDate` más próxima. Retorna la cantidad realmente otorgada
   * (puede ser menor que la solicitada si quedan menos asientos).
   */
  async grantToUser(args: GrantTicketsArgs): Promise<number> {
    if (args.quantity <= 0) return 0;
    const db = args.tx ?? this.prisma;

    const now = new Date();
    const raffle = await db.raffle.findFirst({
      where: {
        status: RaffleStatus.PUBLISHED,
        startDate: { lte: now },
        endDate: { gt: now },
      },
      orderBy: { endDate: 'asc' },
      select: { id: true, soldTickets: true, totalTickets: true },
    });
    if (!raffle) {
      this.logger.log(
        `No active raffle — tickets for user=${args.userId} skipped (${args.reference})`,
      );
      return 0;
    }

    const seatsLeft = raffle.totalTickets - raffle.soldTickets;
    const toGrant = Math.min(args.quantity, seatsLeft);
    if (toGrant <= 0) return 0;

    // CAS sobre soldTickets — solo el caller que matchea el valor previo gana.
    const reservation = await db.raffle.updateMany({
      where: {
        id: raffle.id,
        status: RaffleStatus.PUBLISHED,
        soldTickets: raffle.soldTickets,
        totalTickets: { gte: raffle.soldTickets + toGrant },
      },
      data: { soldTickets: { increment: toGrant } },
    });
    if (reservation.count === 0) {
      // Otro caller venció en la carrera. El caller superior puede reintentar
      // si quiere (no lo hacemos aquí para evitar loops silenciosos).
      this.logger.warn(
        `Raffle CAS lost for user=${args.userId} raffle=${raffle.id} (${args.reference})`,
      );
      return 0;
    }

    const startNumber = raffle.soldTickets + 1;
    const entryType = args.entryType ?? EntryType.PURCHASE_REWARD;
    await db.raffleEntry.createMany({
      data: Array.from({ length: toGrant }, (_, i) => ({
        userId: args.userId,
        raffleId: raffle.id,
        ticketNumber: startNumber + i,
        type: entryType,
        status: EntryStatus.PAID,
        paymentMethod: PaymentMethod.FREE,
        paymentReference: `auto-${args.reference}`,
        orderId: args.orderId ?? null,
      })),
      skipDuplicates: true,
    });

    return toGrant;
  }
}
