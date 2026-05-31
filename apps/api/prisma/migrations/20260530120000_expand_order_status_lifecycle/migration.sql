-- Expand OrderStatus enum to support full ecommerce lifecycle.
--
-- New values:
--   PROCESSING - preparándose en almacén tras cobro
--   SHIPPED    - entregado al courier
--   DELIVERED  - recibido por el cliente (terminal funcional del flujo feliz)
--
-- Existing values preserved: PENDING, PAID, CANCELLED, REFUNDED.
--
-- Side effects (stock decrement, membership activation, raffle entries,
-- referral bonuses) remain triggered EXCLUSIVELY by PENDING -> PAID
-- transition. The new states are post-PAID logistic states and do not
-- re-trigger any side effect.
--
-- Transition whitelist enforced in code at
-- src/modules/orders/state-machine.ts and validated in
-- OrdersService.updateStatus() with assertValidOrderStatusTransition().
--
-- IF NOT EXISTS guarantees idempotency on re-runs. Postgres 12+ supports
-- ALTER TYPE ... ADD VALUE inside a transaction block as long as the new
-- value is not consumed in the same transaction (which is the case here).

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SHIPPED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
