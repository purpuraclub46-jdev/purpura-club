import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RAFFLE_MEMBER_DISCOUNT_PERCENTAGE } from '../memberships/membership.constants';
import { MembershipsService } from '../memberships/memberships.service';
import { RafflePricingDto } from './dto/raffle-pricing.dto';

/**
 * F2.7-B — Fuente única de verdad para el precio de un ticket de sorteo.
 *
 * Regla oficial del cliente: el descuento socio es **exactamente 50 %** sobre
 * el precio público. NO depende de la rifa, NO depende de categorías, NO
 * depende de promociones. Solo de la membresía activa del comprador.
 *
 * Para preservar consistencia operativa, el helper IGNORA `Raffle.memberTicketPrice`
 * almacenado en BD (decisión D5 del cliente): siempre computa
 * `memberPrice = round2(ticketPrice * (1 - p/100))` donde p =
 * `RAFFLE_MEMBER_DISCOUNT_PERCENTAGE = 50`.
 *
 * Reglas de uso:
 *   - `resolveFor(raffle, isMember)` — síncrono, determinístico, sin DB.
 *     Útil cuando el caller ya conoce el estado de membresía.
 *   - `resolveForUser(raffle, userId | null)` — consulta `MembershipsService`
 *     para resolver `isMember`. Es el método más usado por callers (raffles
 *     controller, raffle-entries.purchase).
 */
@Injectable()
export class RafflePricingService {
  constructor(private readonly memberships: MembershipsService) {}

  /** Precio público (lo que paga un no socio). */
  getPublicPrice(raffle: { ticketPrice: Prisma.Decimal | number }): number {
    return this.toNumber(raffle.ticketPrice);
  }

  /** Precio socio derivado del público (siempre 50 % off). */
  getMemberPrice(raffle: { ticketPrice: Prisma.Decimal | number }): number {
    const publicPrice = this.getPublicPrice(raffle);
    return this.round2(
      publicPrice * (1 - RAFFLE_MEMBER_DISCOUNT_PERCENTAGE / 100),
    );
  }

  /**
   * Resolución determinística sin consulta de DB. Devuelve el bloque
   * completo `pricing` que el frontend consume directo.
   */
  resolveFor(
    raffle: { ticketPrice: Prisma.Decimal | number },
    isMember: boolean,
  ): RafflePricingDto {
    const publicPrice = this.getPublicPrice(raffle);
    const memberPrice = this.getMemberPrice(raffle);
    const applicablePrice = isMember ? memberPrice : publicPrice;
    const savingAmount = this.round2(publicPrice - memberPrice);
    return {
      publicPrice,
      memberPrice,
      applicablePrice,
      savingPercentage: RAFFLE_MEMBER_DISCOUNT_PERCENTAGE,
      savingAmount,
      isMember,
      source: isMember ? 'MEMBER' : 'PUBLIC',
    };
  }

  /**
   * Variante que consulta `MembershipsService.isActive` para resolver
   * `isMember` por sí misma. Tolera `userId=null` (visitante anónimo) →
   * trata como NO socio.
   *
   * Es el método que deben usar TODOS los callers excepto los que ya tienen
   * el estado de membresía resuelto explícitamente.
   */
  async resolveForUser(
    raffle: { ticketPrice: Prisma.Decimal | number },
    userId: string | null | undefined,
  ): Promise<RafflePricingDto> {
    const isMember = userId ? await this.memberships.isActive(userId) : false;
    return this.resolveFor(raffle, isMember);
  }

  private toNumber(value: Prisma.Decimal | number): number {
    if (value instanceof Prisma.Decimal) return value.toNumber();
    return Number(value);
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
