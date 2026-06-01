-- FASE 2 / F2.8-A — Order benefits idempotency
--
-- Agrega columna `benefitsAppliedAt` al modelo Order para implementar el
-- patrón CAS (Compare-And-Swap) que garantiza ejecución at-most-once del
-- Membership Benefits Engine.
--
-- ## Patrón de uso (capa 2 de idempotencia)
--
-- Antes de cada side effect del engine (activate/renew, tickets PURCHASE_REWARD,
-- logs DISCOUNT/RAFFLE_ENTRY/REFERRAL_BONUS, sync Customer.isMember):
--
--     UPDATE orders SET "benefitsAppliedAt" = now()
--     WHERE id = ? AND "benefitsAppliedAt" IS NULL;
--
-- Si la operación afecta 1 fila, ganamos el claim y procedemos.
-- Si afecta 0, otra ejecución ya aplicó los beneficios → return ALREADY_APPLIED.
--
-- ## Capa 1 (complementaria) — atomic status transition
--
-- En OrdersService.updateStatus el CAS sobre `status` (`WHERE id=? AND status=?`)
-- cierra el race window entre dos PATCH concurrentes PENDING→PAID. Ver
-- orders.service.ts updateStatus().
--
-- ## Backfill
--
-- Marcamos como "ya aplicado" todas las órdenes en estados POST-PAID que
-- existían antes de F2.8-A, EXCEPTO REFUNDED. Esto previene que un reconciler
-- futuro (fuera de scope F2.8-A) intente re-aplicar beneficios sobre órdenes
-- legacy.
--
-- REFUNDED se excluye intencionalmente: aunque la nota de crédito POS ya
-- revirtió los side effects, dejamos `benefitsAppliedAt = NULL` para que la
-- auditoría refleje que el ciclo completo (apply + revert) cerró el estado.
-- Es información, no operación: no se va a re-aplicar nada porque REFUNDED
-- es terminal en el state-machine y el engine sólo dispara en PENDING→PAID.
--
-- PENDING y CANCELLED no se tocan: nunca llamaron al engine, NULL es correcto.

ALTER TABLE "orders"
    ADD COLUMN "benefitsAppliedAt" TIMESTAMP(3);

-- Index para soporte de queries del futuro reconciler que escanea órdenes
-- PAID que nunca llegaron a aplicar beneficios (engine caído mid-flow).
CREATE INDEX "orders_status_benefitsAppliedAt_idx"
    ON "orders"("status", "benefitsAppliedAt");

-- Backfill condicional (idempotente). Marca como aplicadas las órdenes
-- históricas en estados PAID/PROCESSING/SHIPPED/DELIVERED, usando `updatedAt`
-- como mejor aproximación del momento real de aplicación (no guardamos
-- paidAt como columna independiente; updatedAt fue el último cambio).
UPDATE "orders"
    SET "benefitsAppliedAt" = "updatedAt"
    WHERE "status" IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED')
      AND "benefitsAppliedAt" IS NULL;
