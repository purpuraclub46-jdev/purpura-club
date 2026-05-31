-- FASE 2 / F2.5 — Customer addresses
--
-- Modelo nuevo CustomerAddress + enum AddressType. NO modifica Customer ni Order:
--   - Customer.fiscalAddress permanece como string denormalizado (SUNAT-ready).
--   - Order.customerFiscalAddress permanece como snapshot inmutable del comprobante.
--   - CustomerAddress es entity ortogonal con CRUD propio en /customers/me/addresses/*.
--
-- AddressType:
--   SHIPPING → dirección de entrega ecommerce.
--   BILLING  → facturación alternativa (no sustituye Customer.fiscalAddress).
--   PICKUP   → reservado para retiro en tienda/POS (sin UI en F2.5).
--
-- Reglas de negocio enforced en CustomerAddressesService:
--   - Ownership: customer.userId === JWT.id.
--   - Máximo 10 direcciones activas por (customerId).
--   - Exactamente una isDefault=true por (customerId, type) activa.
--   - Soft delete (active=false) para preservar histórico.
--
-- onDelete CASCADE: si Customer se borra (raro), todas sus direcciones también.

CREATE TYPE "AddressType" AS ENUM ('SHIPPING', 'BILLING', 'PICKUP');

CREATE TABLE "customer_addresses" (
    "id"             UUID         NOT NULL,
    "customerId"     UUID         NOT NULL,
    "type"           "AddressType" NOT NULL DEFAULT 'SHIPPING',
    "label"          VARCHAR(60),
    "recipientName"  VARCHAR(120) NOT NULL,
    "recipientPhone" VARCHAR(20)  NOT NULL,
    "street"         VARCHAR(200) NOT NULL,
    "number"         VARCHAR(20)  NOT NULL,
    "apartment"      VARCHAR(60),
    "district"       VARCHAR(80)  NOT NULL,
    "province"       VARCHAR(80)  NOT NULL,
    "region"         VARCHAR(80)  NOT NULL,
    "countryCode"    CHAR(2)      NOT NULL DEFAULT 'PE',
    "reference"      VARCHAR(240),
    "isDefault"      BOOLEAN      NOT NULL DEFAULT false,
    "active"         BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_addresses_customerId_type_active_idx"
    ON "customer_addresses"("customerId", "type", "active");

CREATE INDEX "customer_addresses_customerId_isDefault_idx"
    ON "customer_addresses"("customerId", "isDefault");

ALTER TABLE "customer_addresses"
    ADD CONSTRAINT "customer_addresses_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
