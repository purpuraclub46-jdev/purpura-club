import { ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import {
  ORDER_STATUS_TRANSITIONS,
  TERMINAL_ORDER_STATUSES,
  assertValidOrderStatusTransition,
  isTerminalOrderStatus,
  isValidOrderStatusTransition,
} from './state-machine';

describe('OrderStatus state machine', () => {
  const ALL_STATUSES: OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.PAID,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ];

  describe('whitelist coverage', () => {
    it('declares transitions for every OrderStatus value (no missing keys)', () => {
      for (const status of ALL_STATUSES) {
        expect(ORDER_STATUS_TRANSITIONS[status]).toBeDefined();
      }
    });

    it('matches the audited matrix exactly', () => {
      // Fail-loud if anyone changes the whitelist without updating tests.
      expect(ORDER_STATUS_TRANSITIONS.PENDING).toEqual([
        OrderStatus.PAID,
        OrderStatus.CANCELLED,
      ]);
      expect(ORDER_STATUS_TRANSITIONS.PAID).toEqual([
        OrderStatus.PROCESSING,
        OrderStatus.REFUNDED,
      ]);
      expect(ORDER_STATUS_TRANSITIONS.PROCESSING).toEqual([
        OrderStatus.SHIPPED,
        OrderStatus.REFUNDED,
      ]);
      expect(ORDER_STATUS_TRANSITIONS.SHIPPED).toEqual([
        OrderStatus.DELIVERED,
        OrderStatus.REFUNDED,
      ]);
      expect(ORDER_STATUS_TRANSITIONS.DELIVERED).toEqual([
        OrderStatus.REFUNDED,
      ]);
      expect(ORDER_STATUS_TRANSITIONS.CANCELLED).toEqual([]);
      expect(ORDER_STATUS_TRANSITIONS.REFUNDED).toEqual([]);
    });
  });

  describe('isTerminalOrderStatus', () => {
    it('returns true only for CANCELLED and REFUNDED', () => {
      expect(TERMINAL_ORDER_STATUSES.size).toBe(2);
      expect(isTerminalOrderStatus(OrderStatus.CANCELLED)).toBe(true);
      expect(isTerminalOrderStatus(OrderStatus.REFUNDED)).toBe(true);
      expect(isTerminalOrderStatus(OrderStatus.PENDING)).toBe(false);
      expect(isTerminalOrderStatus(OrderStatus.PAID)).toBe(false);
      expect(isTerminalOrderStatus(OrderStatus.PROCESSING)).toBe(false);
      expect(isTerminalOrderStatus(OrderStatus.SHIPPED)).toBe(false);
      expect(isTerminalOrderStatus(OrderStatus.DELIVERED)).toBe(false);
    });
  });

  describe('isValidOrderStatusTransition', () => {
    it('treats no-op (from === to) as valid', () => {
      for (const s of ALL_STATUSES) {
        expect(isValidOrderStatusTransition(s, s)).toBe(true);
      }
    });

    it('accepts every whitelisted transition', () => {
      for (const from of ALL_STATUSES) {
        for (const to of ORDER_STATUS_TRANSITIONS[from]) {
          expect(isValidOrderStatusTransition(from, to)).toBe(true);
        }
      }
    });

    it('rejects transitions not in the whitelist', () => {
      // Hand-picked counter-examples
      expect(isValidOrderStatusTransition(OrderStatus.PAID, OrderStatus.PENDING)).toBe(false);
      expect(isValidOrderStatusTransition(OrderStatus.PROCESSING, OrderStatus.PAID)).toBe(false);
      expect(isValidOrderStatusTransition(OrderStatus.SHIPPED, OrderStatus.PROCESSING)).toBe(false);
      expect(isValidOrderStatusTransition(OrderStatus.DELIVERED, OrderStatus.SHIPPED)).toBe(false);
      expect(isValidOrderStatusTransition(OrderStatus.CANCELLED, OrderStatus.PENDING)).toBe(false);
      expect(isValidOrderStatusTransition(OrderStatus.REFUNDED, OrderStatus.PAID)).toBe(false);
      expect(isValidOrderStatusTransition(OrderStatus.PENDING, OrderStatus.SHIPPED)).toBe(false);
    });
  });

  describe('assertValidOrderStatusTransition', () => {
    it('does not throw on no-op', () => {
      for (const s of ALL_STATUSES) {
        expect(() => assertValidOrderStatusTransition(s, s)).not.toThrow();
      }
    });

    it('throws ConflictException for invalid transition with descriptive message', () => {
      expect(() =>
        assertValidOrderStatusTransition(OrderStatus.PAID, OrderStatus.PENDING),
      ).toThrow(ConflictException);

      try {
        assertValidOrderStatusTransition(OrderStatus.PAID, OrderStatus.PENDING);
        fail('should have thrown');
      } catch (err) {
        const e = err as ConflictException;
        expect(e).toBeInstanceOf(ConflictException);
        expect(e.message).toMatch(/PAID/);
        expect(e.message).toMatch(/PENDING/);
        expect(e.message).toMatch(/inv[aá]lida/i);
      }
    });

    it('lists permitted transitions in error message for non-terminal source', () => {
      try {
        assertValidOrderStatusTransition(OrderStatus.PENDING, OrderStatus.SHIPPED);
        fail('should have thrown');
      } catch (err) {
        expect((err as Error).message).toMatch(/PAID/);
        expect((err as Error).message).toMatch(/CANCELLED/);
      }
    });

    it('marks terminal source as such in error message', () => {
      try {
        assertValidOrderStatusTransition(OrderStatus.CANCELLED, OrderStatus.PAID);
        fail('should have thrown');
      } catch (err) {
        expect((err as Error).message).toMatch(/terminal/i);
      }
    });

    describe('viaManualUpdate flag', () => {
      it('blocks PAID → REFUNDED when viaManualUpdate=true (must go through credit note)', () => {
        expect(() =>
          assertValidOrderStatusTransition(
            OrderStatus.PAID,
            OrderStatus.REFUNDED,
            { viaManualUpdate: true },
          ),
        ).toThrow(ConflictException);
      });

      it('blocks every → REFUNDED when viaManualUpdate=true', () => {
        for (const from of [
          OrderStatus.PAID,
          OrderStatus.PROCESSING,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
        ]) {
          expect(() =>
            assertValidOrderStatusTransition(from, OrderStatus.REFUNDED, {
              viaManualUpdate: true,
            }),
          ).toThrow(/nota de cr[eé]dito/i);
        }
      });

      it('allows PAID → REFUNDED when viaManualUpdate=false (credit note service path)', () => {
        expect(() =>
          assertValidOrderStatusTransition(
            OrderStatus.PAID,
            OrderStatus.REFUNDED,
          ),
        ).not.toThrow();

        expect(() =>
          assertValidOrderStatusTransition(
            OrderStatus.PAID,
            OrderStatus.REFUNDED,
            { viaManualUpdate: false },
          ),
        ).not.toThrow();
      });
    });

    it('exhaustive matrix: every (from,to) pair returns same verdict as isValidOrderStatusTransition (without viaManualUpdate)', () => {
      for (const from of ALL_STATUSES) {
        for (const to of ALL_STATUSES) {
          const valid = isValidOrderStatusTransition(from, to);
          if (valid) {
            expect(() => assertValidOrderStatusTransition(from, to)).not.toThrow();
          } else {
            expect(() => assertValidOrderStatusTransition(from, to)).toThrow(
              ConflictException,
            );
          }
        }
      }
    });
  });
});
