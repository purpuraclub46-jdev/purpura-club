import { CategoryGroup } from '@prisma/client';
import {
  computeProductPricing,
  isProductMemberEligible,
  MEMBER_DISCOUNT_ELIGIBLE_CATEGORY_GROUPS,
} from './pricing.util';

/**
 * F2.7-A — Tests del pricing engine con las reglas G7 (descuento socio
 * ADITIVO sobre la promoción) y G8 (solo Joyería y Perfumes acumulan).
 */

describe('pricing.util — F2.7-A G7 (suma de porcentajes) + G8 (categorías elegibles)', () => {
  describe('G7 — Descuento Club aditivo sobre promoción', () => {
    it('Sin promoción + socio → precio normal (NO aplica beneficio Club)', () => {
      const result = computeProductPricing(
        { price: 100, discountPercentage: null, discountActive: false },
        { isMember: true, memberDiscountEligible: true },
      );
      expect(result.finalPrice).toBe(100);
      expect(result.salePrice).toBeNull();
      expect(result.memberPrice).toBeNull();
      expect(result.memberDiscountPercentage).toBeNull();
    });

    it('Promo 20 % + socio elegible → 30 % total (ADITIVO, NO secuencial)', () => {
      const result = computeProductPricing(
        { price: 100, discountPercentage: 20, discountActive: true },
        { isMember: true, memberDiscountEligible: true },
      );
      // Reglas oficiales del cliente:
      //   Precio S/100, Promo 20 %, Socio → 20 + 10 = 30 % → S/70
      expect(result.salePrice).toBe(80); // precio sin bonus club
      expect(result.memberPrice).toBe(70);
      expect(result.memberDiscountPercentage).toBe(30);
      expect(result.finalPrice).toBe(70);
    });

    it('Promo 40 % + socio elegible → 50 % total → S/50 sobre S/100', () => {
      const result = computeProductPricing(
        { price: 100, discountPercentage: 40, discountActive: true },
        { isMember: true, memberDiscountEligible: true },
      );
      expect(result.salePrice).toBe(60);
      expect(result.memberPrice).toBe(50);
      expect(result.memberDiscountPercentage).toBe(50);
      expect(result.finalPrice).toBe(50);
    });

    it('Promo 95 % + socio → cap en 100 % (S/0)', () => {
      const result = computeProductPricing(
        { price: 100, discountPercentage: 95, discountActive: true },
        { isMember: true, memberDiscountEligible: true },
      );
      expect(result.memberDiscountPercentage).toBe(100);
      expect(result.memberPrice).toBe(0);
    });

    it('Promo 20 % + NO socio → solo aplica la promo (S/80)', () => {
      const result = computeProductPricing(
        { price: 100, discountPercentage: 20, discountActive: true },
        { isMember: false, memberDiscountEligible: true },
      );
      expect(result.salePrice).toBe(80);
      expect(result.memberPrice).toBeNull();
      expect(result.finalPrice).toBe(80);
    });

    it('Ventana de fechas fuera de rango → no hay promo, beneficio Club no aplica', () => {
      const result = computeProductPricing(
        {
          price: 100,
          discountPercentage: 20,
          discountActive: true,
          discountStartsAt: new Date('2026-01-01'),
          discountEndsAt: new Date('2026-01-31'),
        },
        {
          isMember: true,
          memberDiscountEligible: true,
          now: new Date('2026-05-31'),
        },
      );
      expect(result.salePrice).toBeNull();
      expect(result.memberPrice).toBeNull();
      expect(result.finalPrice).toBe(100);
    });
  });

  describe('G8 — Filtro de categorías (solo JOYERIA y PERFUMES)', () => {
    it('Producto en JOYERIA → elegible', () => {
      expect(
        isProductMemberEligible([
          { category: { group: CategoryGroup.JOYERIA } },
        ]),
      ).toBe(true);
    });

    it('Producto en PERFUMES → elegible', () => {
      expect(
        isProductMemberEligible([
          { category: { group: CategoryGroup.PERFUMES } },
        ]),
      ).toBe(true);
    });

    it('Producto SOLO en ACCESORIOS → NO elegible', () => {
      expect(
        isProductMemberEligible([
          { category: { group: CategoryGroup.ACCESORIOS } },
        ]),
      ).toBe(false);
    });

    it('Producto en ACCESORIOS + JOYERIA → elegible (basta una elegible)', () => {
      expect(
        isProductMemberEligible([
          { category: { group: CategoryGroup.ACCESORIOS } },
          { category: { group: CategoryGroup.JOYERIA } },
        ]),
      ).toBe(true);
    });

    it('Producto sin categorías → NO elegible', () => {
      expect(isProductMemberEligible([])).toBe(false);
    });

    it('Set de categorías elegibles es exactamente {JOYERIA, PERFUMES} (regla del cliente)', () => {
      expect(
        MEMBER_DISCOUNT_ELIGIBLE_CATEGORY_GROUPS.has(CategoryGroup.JOYERIA),
      ).toBe(true);
      expect(
        MEMBER_DISCOUNT_ELIGIBLE_CATEGORY_GROUPS.has(CategoryGroup.PERFUMES),
      ).toBe(true);
      expect(
        MEMBER_DISCOUNT_ELIGIBLE_CATEGORY_GROUPS.has(CategoryGroup.ACCESORIOS),
      ).toBe(false);
    });
  });

  describe('Integración G7+G8 — producto ACCESORIOS con promo + socio no recibe el +10 %', () => {
    it('Producto ACCESORIOS con promo 20 % + socio → solo aplica promo, no Club', () => {
      const result = computeProductPricing(
        { price: 100, discountPercentage: 20, discountActive: true },
        { isMember: true, memberDiscountEligible: false }, // G8 lo bloquea
      );
      expect(result.salePrice).toBe(80);
      expect(result.memberPrice).toBeNull();
      expect(result.memberDiscountPercentage).toBeNull();
      expect(result.finalPrice).toBe(80);
    });
  });
});
