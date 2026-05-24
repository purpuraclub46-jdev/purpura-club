import { EntryStatus, PaymentMethod } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

export interface PaymentInitiationContext {
  user: AuthenticatedUser;
  raffleId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface PaymentInitiationResult {
  status: EntryStatus;
  reference?: string;
  redirectUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly method: PaymentMethod;
  readonly enabled: boolean;
  initiate(context: PaymentInitiationContext): Promise<PaymentInitiationResult>;
}

export const PAYMENT_PROVIDERS_TOKEN = Symbol('PAYMENT_PROVIDERS');
