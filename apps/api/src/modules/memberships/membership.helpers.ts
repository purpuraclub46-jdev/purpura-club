import { Prisma } from '@prisma/client';
import {
  MEMBER_EXTRA_DISCOUNT_PERCENTAGE,
  MEMBERSHIP_DURATION_DAYS,
  MIN_PURCHASE_TO_ACTIVATE,
  PURCHASE_AMOUNT_PER_ENTRY,
} from './membership.constants';

const toNumber = (value: Prisma.Decimal | number | string): number => {
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value);
};

/** Calcula la nueva fecha de expiración partiendo de un ancla. */
export const computeNextExpiration = (anchor: Date = new Date()): Date => {
  const next = new Date(anchor.getTime());
  next.setDate(next.getDate() + MEMBERSHIP_DURATION_DAYS);
  return next;
};

/**
 * Una compra es elegible para activar/renovar la membresía si su monto
 * supera (>=) el mínimo configurado.
 */
export const isQualifyingPurchase = (
  total: Prisma.Decimal | number,
): boolean => toNumber(total) >= MIN_PURCHASE_TO_ACTIVATE;

/**
 * Cantidad de participaciones automáticas a otorgar por una compra.
 * Regla: floor(total / 25). Si la compra no es elegible, 0.
 */
export const computePurchaseEntries = (
  total: Prisma.Decimal | number,
): number => {
  if (!isQualifyingPurchase(total)) return 0;
  return Math.floor(toNumber(total) / PURCHASE_AMOUNT_PER_ENTRY);
};

/**
 * Días restantes entre `now` y `expiresAt`. Negativo si ya venció.
 */
export const computeDaysRemaining = (
  expiresAt: Date,
  now: Date = new Date(),
): number => {
  const ms = expiresAt.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

/**
 * Aplica el 10 % adicional de miembro sobre un precio de oferta.
 * Solo tiene sentido si el producto YA tiene oferta vigente.
 */
export const applyMemberDiscount = (offerPrice: number): number => {
  const next = offerPrice * (1 - MEMBER_EXTRA_DISCOUNT_PERCENTAGE / 100);
  return Math.round(next * 100) / 100;
};

export interface MembershipSnapshot {
  active: boolean;
  expiresAt: Date | null;
  daysRemaining: number | null;
}

/** Determina el estado público actual de una membresía. */
export const calculateMembershipStatus = (
  membership: { expiresAt: Date; active: boolean } | null,
  now: Date = new Date(),
): MembershipSnapshot => {
  if (!membership) {
    return { active: false, expiresAt: null, daysRemaining: null };
  }
  const isActive = membership.active && membership.expiresAt > now;
  return {
    active: isActive,
    expiresAt: membership.expiresAt,
    daysRemaining: computeDaysRemaining(membership.expiresAt, now),
  };
};
