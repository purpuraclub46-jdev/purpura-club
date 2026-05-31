import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AddressType, OrderPaymentMethod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CheckoutService } from './checkout.service';
import { NotConfiguredPaymentProvider } from './payments/not-configured-payment.provider';
import {
  PAYMENT_PROVIDER_TOKEN,
  PaymentProvider,
  PaymentSessionResult,
} from './payments/payment-provider.interface';

type PrismaMock = {
  customer: { findFirst: jest.Mock };
  customerAddress: { findFirst: jest.Mock };
  product: { findMany: jest.Mock };
};

function createPrismaMock(): PrismaMock {
  return {
    customer: { findFirst: jest.fn() },
    customerAddress: { findFirst: jest.fn() },
    product: { findMany: jest.fn() },
  };
}

function makeCustomerRow(overrides: Partial<any> = {}) {
  return {
    id: 'customer-A',
    firstName: 'Juana',
    lastName: 'Perez',
    email: 'juana@example.com',
    documentType: 'DNI',
    dni: '72345678',
    ruc: null,
    ...overrides,
  };
}

function makeAddressRow(overrides: Partial<any> = {}) {
  return {
    id: 'addr-1',
    customerId: 'customer-A',
    type: AddressType.SHIPPING,
    label: 'Casa',
    recipientName: 'Juana Perez',
    recipientPhone: '+51 987 654 321',
    street: 'Av. Javier Prado Este',
    number: '1234',
    apartment: null,
    district: 'San Isidro',
    province: 'Lima',
    region: 'Lima',
    countryCode: 'PE',
    reference: null,
    isDefault: true,
    active: true,
    ...overrides,
  };
}

function makeOrderResponse(overrides: Partial<any> = {}) {
  return {
    id: 'order-1',
    number: 'PC-20260530-ABC123',
    total: 129.9,
    paymentMethod: OrderPaymentMethod.MERCADOPAGO,
    items: [
      {
        productId: 'prod-1',
        productName: 'Anillo Sello',
        quantity: 1,
        unitPrice: 129.9,
      },
    ],
    ...overrides,
  };
}

describe('CheckoutService — F2.6-A', () => {
  let service: CheckoutService;
  let prisma: PrismaMock;
  let orders: { create: jest.Mock };
  let providerSpy: jest.SpyInstance;
  let provider: PaymentProvider;

  beforeEach(async () => {
    prisma = createPrismaMock();
    orders = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        NotConfiguredPaymentProvider,
        { provide: PrismaService, useValue: prisma },
        { provide: OrdersService, useValue: orders },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STOREFRONT_PUBLIC_URL') return 'https://purpura.test';
              if (key === 'API_PUBLIC_URL') return 'https://api.purpura.test';
              return undefined;
            }),
          },
        },
        {
          provide: PAYMENT_PROVIDER_TOKEN,
          useExisting: NotConfiguredPaymentProvider,
        },
      ],
    }).compile();

    service = module.get(CheckoutService);
    provider = module.get(NotConfiguredPaymentProvider);
    providerSpy = jest.spyOn(provider, 'createCheckoutSession');
  });

  const baseDto = {
    shippingAddressId: 'addr-1',
    items: [{ productId: 'prod-1', quantity: 1 }],
  };

  it('T10.1 — usuario sin Customer asociado → ForbiddenException', async () => {
    prisma.customer.findFirst.mockResolvedValue(null);

    await expect(service.createSession('user-orphan', baseDto)).rejects.toThrow(
      ForbiddenException,
    );
    expect(orders.create).not.toHaveBeenCalled();
  });

  it('T10.2 — shippingAddressId ajena → NotFoundException anti-enumeration', async () => {
    prisma.customer.findFirst.mockResolvedValue(makeCustomerRow());
    prisma.customerAddress.findFirst.mockResolvedValue(null); // no propia

    await expect(service.createSession('user-A', baseDto)).rejects.toThrow(
      NotFoundException,
    );

    // Verificación crítica: WHERE incluye customerId del JWT, no del cliente.
    expect(prisma.customerAddress.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'addr-1',
        customerId: 'customer-A',
        active: true,
      },
    });
    expect(orders.create).not.toHaveBeenCalled();
  });

  it('T10.3 — productos inválidos en items → BadRequestException', async () => {
    prisma.customer.findFirst.mockResolvedValue(makeCustomerRow());
    prisma.customerAddress.findFirst.mockResolvedValue(makeAddressRow());
    prisma.product.findMany.mockResolvedValue([]); // ningún producto matchea

    await expect(service.createSession('user-A', baseDto)).rejects.toThrow(
      /no está disponible/,
    );
    expect(orders.create).not.toHaveBeenCalled();
  });

  it('T10.4 — happy path: crea Order PENDING + delega al provider con shipping snapshot', async () => {
    prisma.customer.findFirst.mockResolvedValue(makeCustomerRow());
    prisma.customerAddress.findFirst.mockResolvedValue(
      makeAddressRow({ apartment: 'Dpto 502', reference: 'Frente al parque' }),
    );
    prisma.product.findMany.mockResolvedValue([
      { id: 'prod-1', name: 'Anillo Sello', sku: 'JOY-1', price: 129.9 },
    ]);
    orders.create.mockResolvedValue(makeOrderResponse());

    const out = await service.createSession('user-A', baseDto);

    // Verificar que OrdersService.create recibe shipping snapshot completo
    // proveniente de la dirección del cliente.
    expect(orders.create).toHaveBeenCalledTimes(1);
    const createArgs = orders.create.mock.calls[0][0];
    expect(createArgs.userId).toBe('user-A');
    expect(createArgs.customerId).toBe('customer-A');
    expect(createArgs.paymentMethod).toBe(OrderPaymentMethod.MERCADOPAGO);
    expect(createArgs.shipping).toEqual({
      addressId: 'addr-1',
      recipientName: 'Juana Perez',
      recipientPhone: '+51 987 654 321',
      street: 'Av. Javier Prado Este',
      number: '1234',
      apartment: 'Dpto 502',
      district: 'San Isidro',
      province: 'Lima',
      region: 'Lima',
      countryCode: 'PE',
      reference: 'Frente al parque',
    });

    // Crítico: el unitPrice NO se envía al OrdersService — el catálogo
    // server-side es la fuente de verdad.
    expect(createArgs.items).toEqual([
      { productId: 'prod-1', quantity: 1 },
    ]);

    // Provider invocado con datos del Order ya persistido
    expect(providerSpy).toHaveBeenCalledTimes(1);
    const providerInput = providerSpy.mock.calls[0][0];
    expect(providerInput.orderId).toBe('order-1');
    expect(providerInput.orderNumber).toBe('PC-20260530-ABC123');
    expect(providerInput.customerId).toBe('customer-A');
    expect(providerInput.currency).toBe('PEN');
    expect(providerInput.returnUrls.success).toContain(
      'https://purpura.test/checkout/success',
    );
    expect(providerInput.notificationUrl).toContain(
      'https://api.purpura.test/webhooks/',
    );

    // Verdict propagado del provider stub
    expect(out.verdict).toBe('PENDING_SETUP');
    expect(out.provider).toBe('NOT_CONFIGURED');
    expect(out.redirectUrl).toBeNull();
    expect(out.orderId).toBe('order-1');
    expect(out.orderNumber).toBe('PC-20260530-ABC123');
  });

  it('T10.5 — cuando el provider retorna REDIRECT, el response propaga redirectUrl', async () => {
    prisma.customer.findFirst.mockResolvedValue(makeCustomerRow());
    prisma.customerAddress.findFirst.mockResolvedValue(makeAddressRow());
    prisma.product.findMany.mockResolvedValue([
      { id: 'prod-1', name: 'X', sku: 'X', price: 10 },
    ]);
    orders.create.mockResolvedValue(makeOrderResponse());

    providerSpy.mockResolvedValueOnce({
      verdict: 'REDIRECT',
      providerSessionId: 'pref_xyz',
      redirectUrl: 'https://mercadopago.com/checkout/abc',
      mode: 'sandbox',
      message: 'ok',
    } satisfies PaymentSessionResult);

    const out = await service.createSession('user-A', baseDto);
    expect(out.verdict).toBe('REDIRECT');
    expect(out.redirectUrl).toBe('https://mercadopago.com/checkout/abc');
    expect(out.mode).toBe('sandbox');
  });

  it('T10.6 — cross-user isolation: customerId del JWT NUNCA leak hacia otro', async () => {
    // Usuario A
    prisma.customer.findFirst.mockResolvedValueOnce(
      makeCustomerRow({ id: 'customer-A' }),
    );
    prisma.customerAddress.findFirst.mockResolvedValueOnce(null);
    await expect(service.createSession('user-A', baseDto)).rejects.toThrow();

    // Usuario B
    prisma.customer.findFirst.mockResolvedValueOnce(
      makeCustomerRow({ id: 'customer-B' }),
    );
    prisma.customerAddress.findFirst.mockResolvedValueOnce(null);
    await expect(service.createSession('user-B', baseDto)).rejects.toThrow();

    const callA = prisma.customerAddress.findFirst.mock.calls[0][0];
    const callB = prisma.customerAddress.findFirst.mock.calls[1][0];

    const jsonA = JSON.stringify(callA);
    const jsonB = JSON.stringify(callB);

    expect(jsonA).not.toContain('customer-B');
    expect(jsonB).not.toContain('customer-A');
  });
});
