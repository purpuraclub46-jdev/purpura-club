import { ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

/**
 * Whitelist de transiciones permitidas para `Order.status`.
 *
 * Diseño:
 *   PENDING    → PAID, CANCELLED
 *   PAID       → PROCESSING, REFUNDED
 *   PROCESSING → SHIPPED, REFUNDED
 *   SHIPPED    → DELIVERED, REFUNDED
 *   DELIVERED  → REFUNDED                  (cliente puede devolver después de recibir)
 *   CANCELLED  → []                        (terminal — no se reactiva)
 *   REFUNDED   → []                        (terminal — la NC ya revirtió side effects)
 *
 * Side effects (stock, membership, raffle entries, referral bonuses)
 * se disparan EXCLUSIVAMENTE en la transición PENDING → PAID.
 * Las transiciones logísticas posteriores (PAID → PROCESSING → SHIPPED
 * → DELIVERED) son meta-información de fulfillment y NO re-disparan
 * triggers.
 *
 * Nota sobre REFUNDED: el flujo canónico es vía nota de crédito POS
 * (POSCreditNotesService), que ya escribe `status = REFUNDED` directamente
 * en su transacción atómica para mantener consistencia con el smart
 * revert de membership. El endpoint manual `PATCH /orders/:id/status`
 * bloquea `→ REFUNDED` para que admins no bypaseen el flujo de NC.
 * Por eso `MANUAL_UPDATE_FORBIDDEN_TARGETS` existe como filtro adicional.
 */
export const ORDER_STATUS_TRANSITIONS: Readonly<
  Record<OrderStatus, ReadonlyArray<OrderStatus>>
> = {
  PENDING: [OrderStatus.PAID, OrderStatus.CANCELLED],
  PAID: [OrderStatus.PROCESSING, OrderStatus.REFUNDED],
  PROCESSING: [OrderStatus.SHIPPED, OrderStatus.REFUNDED],
  SHIPPED: [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
  DELIVERED: [OrderStatus.REFUNDED],
  CANCELLED: [],
  REFUNDED: [],
} as const;

export const TERMINAL_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED,
]);

/**
 * Estados que NO pueden ser alcanzados via PATCH /orders/:id/status (admin).
 * REFUNDED requiere emisión de nota de crédito.
 */
export const MANUAL_UPDATE_FORBIDDEN_TARGETS: ReadonlySet<OrderStatus> =
  new Set([OrderStatus.REFUNDED]);

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.has(status);
}

export function isValidOrderStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  if (from === to) return true;
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

/**
 * Valida que la transición sea permitida. Si no, lanza ConflictException (409).
 *
 * @param from estado actual de la orden (lectura previa)
 * @param to estado solicitado por el caller
 * @param opts.viaManualUpdate true si el origen es PATCH /orders/:id/status
 *   (bloquea REFUNDED). Para escritores internos (POSCreditNotesService)
 *   omitir o pasar false.
 */
export function assertValidOrderStatusTransition(
  from: OrderStatus,
  to: OrderStatus,
  opts: { viaManualUpdate?: boolean } = {},
): void {
  if (from === to) return;

  if (opts.viaManualUpdate && MANUAL_UPDATE_FORBIDDEN_TARGETS.has(to)) {
    throw new ConflictException(
      `La transición a "${to}" debe realizarse mediante una nota de crédito, no por actualización manual.`,
    );
  }

  if (!ORDER_STATUS_TRANSITIONS[from].includes(to)) {
    throw new ConflictException(
      `Transición de estado inválida: "${from}" → "${to}". Permitidas desde "${from}": [${ORDER_STATUS_TRANSITIONS[from].join(', ') || 'ninguna (estado terminal)'}].`,
    );
  }
}
