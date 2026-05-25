-- Limpieza previa al refactor de inventario multi-ubicación.
-- Elimina datos seed antiguos (sucursales/inventario) para que db push pueda
-- reconstruir el schema sin conflictos. Los datos productivos del catálogo,
-- usuarios, sorteos, etc. se conservan.

DROP TABLE IF EXISTS "inventory_movements" CASCADE;
DROP TABLE IF EXISTS "branch_inventory" CASCADE;
DROP TABLE IF EXISTS "branches" CASCADE;

-- Limpia la referencia branchId de orders antes de que db push la elimine
-- (evita errores si en el futuro se generan órdenes con esta columna).
ALTER TABLE "orders" DROP COLUMN IF EXISTS "branchId";

-- Quita el enum antiguo de movimientos para que se recree con los nuevos valores.
DROP TYPE IF EXISTS "InventoryMovementType" CASCADE;
