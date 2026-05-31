import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderPaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import {
  CheckoutSessionResponseDto,
  CreateCheckoutSessionDto,
} from './dto/checkout-session.dto';
import {
  PAYMENT_PROVIDER_TOKEN,
  type PaymentProvider,
  type PaymentSessionInput,
} from './payments/payment-provider.interface';

/**
 * FASE 2 / F2.6-A — Checkout ecommerce.
 *
 * Orquestador entre carrito → Order (PENDING) → PaymentProvider.
 *
 * Reglas duras:
 *   1. Solo usuarios autenticados (JwtAuthGuard en controller).
 *   2. customerId se resuelve desde el JWT vía Customer.userId (FASE 1).
 *      Nunca confiamos en customerId del cliente.
 *   3. shippingAddressId debe pertenecer al customer del JWT (F2.5
 *      ownership). 404 anti-enumeration uniforme.
 *   4. Precios SIEMPRE se recalculan server-side desde Product.price.
 *      El cliente no envía unitPrice — el catálogo es la fuente de verdad.
 *   5. Order se crea PENDING; nunca el provider la actualiza a PAID.
 *      F2.6-B implementará el webhook que sí lo hace.
 *   6. PaymentProvider es DI-swappable: hoy NotConfigured, mañana MercadoPago.
 *
 * Este servicio NO atiende sorteos. Las rifas mantienen su flujo Yape →
 * comprobante → validación manual via RaffleEntriesService.
 */
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_PROVIDER_TOKEN)
    private readonly paymentProvider: PaymentProvider,
  ) {}

  async createSession(
    userId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    // (1) Resolver Customer del JWT (FASE 1 unification).
    const customer = await this.prisma.customer.findFirst({
      where: { userId, active: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        documentType: true,
        dni: true,
        ruc: true,
      },
    });
    if (!customer) {
      throw new ForbiddenException(
        'Tu cuenta no tiene un perfil de cliente asociado.',
      );
    }

    // (2) Validar ownership de la dirección de envío (F2.5).
    const address = await this.prisma.customerAddress.findFirst({
      where: {
        id: dto.shippingAddressId,
        customerId: customer.id,
        active: true,
      },
    });
    if (!address) {
      throw new NotFoundException('Dirección no encontrada');
    }

    // (3) Cargar productos del catálogo y validar items. NUNCA confiamos
    //     en precios o nombres enviados por el cliente.
    const productIds = Array.from(new Set(dto.items.map((i) => i.productId)));
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of dto.items) {
      if (!productMap.has(item.productId)) {
        throw new BadRequestException(
          `Producto ${item.productId} no está disponible.`,
        );
      }
    }

    // (4) Crear Order PENDING vía el servicio existente (que ya valida
    //     stock, calcula IGV, snapshot fiscal, etc).
    const orderResponse = await this.orders.create({
      userId,
      customerId: customer.id,
      paymentMethod: dto.paymentMethod ?? OrderPaymentMethod.MERCADOPAGO,
      notes: dto.notes,
      items: dto.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        // unitPrice intencionalmente omitido — OrdersService aplica
        // catálogo + descuentos vigentes server-side.
      })),
      shipping: {
        addressId: address.id,
        recipientName: address.recipientName,
        recipientPhone: address.recipientPhone,
        street: address.street,
        number: address.number,
        apartment: address.apartment ?? undefined,
        district: address.district,
        province: address.province,
        region: address.region,
        countryCode: address.countryCode,
        reference: address.reference ?? undefined,
      },
    });

    // (5) Delegar al PaymentProvider para crear la sesión externa.
    const storefrontUrl = this.resolveStorefrontUrl();
    const apiUrl = this.resolveApiUrl();
    const providerInput: PaymentSessionInput = {
      orderId: orderResponse.id,
      orderNumber: orderResponse.number,
      customerId: customer.id,
      total: orderResponse.total,
      currency: 'PEN',
      paymentMethod: orderResponse.paymentMethod,
      items: orderResponse.items.map((it) => ({
        id: it.productId,
        title: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
      payer: {
        email: customer.email ?? null,
        firstName: customer.firstName,
        lastName: customer.lastName,
        documentType: customer.documentType,
        documentNumber: customer.dni ?? customer.ruc ?? null,
      },
      returnUrls: {
        success: `${storefrontUrl}/checkout/success?order=${encodeURIComponent(orderResponse.number)}`,
        pending: `${storefrontUrl}/checkout/pending?order=${encodeURIComponent(orderResponse.number)}`,
        failure: `${storefrontUrl}/checkout/failure?order=${encodeURIComponent(orderResponse.number)}`,
      },
      notificationUrl: `${apiUrl}/webhooks/${this.paymentProvider.name.toLowerCase()}`,
    };

    const session = await this.paymentProvider.createCheckoutSession(
      providerInput,
    );

    this.logger.log(
      `[checkout.audit] action=createSession userId=${userId} ` +
        `customerId=${customer.id} orderId=${orderResponse.id} ` +
        `provider=${this.paymentProvider.name} verdict=${session.verdict}`,
    );

    return {
      orderId: orderResponse.id,
      orderNumber: orderResponse.number,
      verdict: session.verdict,
      redirectUrl: session.redirectUrl,
      provider: this.paymentProvider.name,
      mode: session.mode,
      message: session.message,
    };
  }

  private resolveStorefrontUrl(): string {
    const fromEnv = this.config.get<string>('STOREFRONT_PUBLIC_URL');
    return (fromEnv ?? 'http://localhost:3002').replace(/\/+$/, '');
  }

  private resolveApiUrl(): string {
    const fromEnv = this.config.get<string>('API_PUBLIC_URL');
    return (fromEnv ?? 'http://localhost:3000').replace(/\/+$/, '');
  }
}

// Helper exportado por si futuros tests necesitan reusar la forma de
// cálculo sin duplicarla. Por ahora no es necesario.
export const __testables = {} satisfies Record<string, never> & {
  [k: string]: never;
} as Record<string, never>;
// Mantener el Prisma import vivo aunque solo lo usemos vía $transaction
// en futuras iteraciones (idempotency F2.6-B).
export type _PrismaTransactionClient = Prisma.TransactionClient;
