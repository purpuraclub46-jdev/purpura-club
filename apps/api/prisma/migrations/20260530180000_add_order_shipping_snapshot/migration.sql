-- FASE 2 / F2.6-A — Order shipping snapshot
--
-- Agrega campos de dirección de entrega como SNAPSHOT denormalizado.
-- Patrón espejo del snapshot fiscal SUNAT: las direcciones de envío
-- quedan inmutables en el pedido aunque la CustomerAddress original sea
-- borrada (soft delete) o editada después.
--
-- shippingAddressId es referencia débil (sin FK) para auditoría y para
-- que el frontend pueda detectar "esta orden usa la dirección X que
-- aún existe". Si la dirección se borra (active=false), el pedido
-- permanece legible.
--
-- TODOS los campos son opcionales: pedidos POS y pedidos previos a
-- F2.6-A no llevan shipping snapshot.

ALTER TABLE "orders"
    ADD COLUMN "shippingAddressId"      UUID,
    ADD COLUMN "shippingRecipientName"  VARCHAR(120),
    ADD COLUMN "shippingRecipientPhone" VARCHAR(20),
    ADD COLUMN "shippingStreet"         VARCHAR(200),
    ADD COLUMN "shippingNumber"         VARCHAR(20),
    ADD COLUMN "shippingApartment"      VARCHAR(60),
    ADD COLUMN "shippingDistrict"       VARCHAR(80),
    ADD COLUMN "shippingProvince"       VARCHAR(80),
    ADD COLUMN "shippingRegion"         VARCHAR(80),
    ADD COLUMN "shippingCountryCode"    CHAR(2),
    ADD COLUMN "shippingReference"      VARCHAR(240);
