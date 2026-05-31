import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AddressType, CustomerAddress, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AddressResponseDto,
  CreateAddressDto,
  UpdateAddressDto,
} from './dto/address.dto';

/**
 * Gestión de direcciones del cliente autenticado.
 *
 * Reglas (enforced en TODOS los handlers):
 *   1. Ownership: resolución por `Customer.userId === JWT.id` (FASE 1
 *      unification). Anti-enumeration con NotFoundException uniforme.
 *   2. Máximo {@link MAX_ACTIVE_ADDRESSES} direcciones activas por cliente.
 *   3. Exactamente una `isDefault=true` por (customerId, type) ACTIVA.
 *   4. Soft delete (`active=false`). Borrar la default promueve la siguiente
 *      activa más reciente del mismo type.
 *   5. Primera dirección creada por tipo se marca isDefault=true automático.
 *
 * Este servicio NO toca `Customer.fiscalAddress` ni `Order.customerFiscal-
 * Address`. Ambos campos preservan su inmutabilidad SUNAT (snapshot
 * denormalizado en el comprobante).
 */
@Injectable()
export class CustomerAddressesService {
  private readonly logger = new Logger(CustomerAddressesService.name);

  static readonly MAX_ACTIVE_ADDRESSES = 10;

  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<AddressResponseDto[]> {
    const customerId = await this.resolveCustomerId(userId);
    const rows = await this.prisma.customerAddress.findMany({
      where: { customerId, active: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toResponseDto);
  }

  async findOne(userId: string, addressId: string): Promise<AddressResponseDto> {
    const customerId = await this.resolveCustomerId(userId);
    const row = await this.requireOwnedActive(customerId, addressId);
    return toResponseDto(row);
  }

  async create(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    const customerId = await this.resolveCustomerId(userId);

    const activeCount = await this.prisma.customerAddress.count({
      where: { customerId, active: true },
    });
    if (activeCount >= CustomerAddressesService.MAX_ACTIVE_ADDRESSES) {
      throw new ConflictException(
        `Alcanzaste el máximo de ${CustomerAddressesService.MAX_ACTIVE_ADDRESSES} direcciones activas. Elimina una existente antes de crear otra.`,
      );
    }

    const type = dto.type ?? AddressType.SHIPPING;

    // Primera dirección activa de su tipo → forzar isDefault=true.
    const sameTypeCount = await this.prisma.customerAddress.count({
      where: { customerId, type, active: true },
    });
    const forceDefault = sameTypeCount === 0;
    const willBeDefault = forceDefault || dto.isDefault === true;

    const created = await this.prisma.$transaction(async (tx) => {
      if (willBeDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId, type, active: true, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.customerAddress.create({
        data: {
          customerId,
          type,
          label: dto.label ?? null,
          recipientName: dto.recipientName,
          recipientPhone: dto.recipientPhone,
          street: dto.street,
          number: dto.number,
          apartment: dto.apartment ?? null,
          district: dto.district,
          province: dto.province,
          region: dto.region,
          countryCode: (dto.countryCode ?? 'PE').toUpperCase(),
          reference: dto.reference ?? null,
          isDefault: willBeDefault,
          active: true,
        },
      });
    });

    this.logger.log(
      `[address.audit] action=create customerId=${customerId} addressId=${created.id} type=${type} isDefault=${willBeDefault}`,
    );
    return toResponseDto(created);
  }

  async update(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    const customerId = await this.resolveCustomerId(userId);
    const existing = await this.requireOwnedActive(customerId, addressId);

    // Si cambia el tipo o se marca default, demote previous default del type destino.
    const nextType = dto.type ?? existing.type;
    const becomingDefault = dto.isDefault === true && !existing.isDefault;
    const typeChanged = dto.type !== undefined && dto.type !== existing.type;

    const data: Prisma.CustomerAddressUpdateInput = {
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.label !== undefined && { label: dto.label ?? null }),
      ...(dto.recipientName !== undefined && {
        recipientName: dto.recipientName,
      }),
      ...(dto.recipientPhone !== undefined && {
        recipientPhone: dto.recipientPhone,
      }),
      ...(dto.street !== undefined && { street: dto.street }),
      ...(dto.number !== undefined && { number: dto.number }),
      ...(dto.apartment !== undefined && { apartment: dto.apartment ?? null }),
      ...(dto.district !== undefined && { district: dto.district }),
      ...(dto.province !== undefined && { province: dto.province }),
      ...(dto.region !== undefined && { region: dto.region }),
      ...(dto.countryCode !== undefined && {
        countryCode: dto.countryCode.toUpperCase(),
      }),
      ...(dto.reference !== undefined && { reference: dto.reference ?? null }),
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      if (becomingDefault || typeChanged) {
        // Si cambió de tipo, primero garantizar que el tipo destino tenga al
        // menos un default. Si el caller pidió isDefault=true, lo aplicamos;
        // si no, mantenemos coherencia: si era default en tipo anterior y
        // cambió de tipo, ese tipo queda sin default — promovemos al next.
        if (becomingDefault) {
          await tx.customerAddress.updateMany({
            where: {
              customerId,
              type: nextType,
              active: true,
              isDefault: true,
              NOT: { id: addressId },
            },
            data: { isDefault: false },
          });
        }
        if (typeChanged && existing.isDefault) {
          await this.promoteNextDefault(tx, customerId, existing.type, addressId);
        }
      }

      return tx.customerAddress.update({
        where: { id: addressId },
        data: {
          ...data,
          ...(becomingDefault && { isDefault: true }),
        },
      });
    });

    this.logger.log(
      `[address.audit] action=update customerId=${customerId} addressId=${addressId}`,
    );
    return toResponseDto(updated);
  }

  async remove(userId: string, addressId: string): Promise<void> {
    const customerId = await this.resolveCustomerId(userId);
    const existing = await this.requireOwnedActive(customerId, addressId);

    await this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.update({
        where: { id: addressId },
        data: { active: false, isDefault: false },
      });
      if (existing.isDefault) {
        await this.promoteNextDefault(tx, customerId, existing.type, addressId);
      }
    });

    this.logger.log(
      `[address.audit] action=delete customerId=${customerId} addressId=${addressId} wasDefault=${existing.isDefault}`,
    );
  }

  async setDefault(
    userId: string,
    addressId: string,
  ): Promise<AddressResponseDto> {
    const customerId = await this.resolveCustomerId(userId);
    const existing = await this.requireOwnedActive(customerId, addressId);

    if (existing.isDefault) {
      return toResponseDto(existing);
    }

    const promoted = await this.prisma.$transaction(async (tx) => {
      await tx.customerAddress.updateMany({
        where: {
          customerId,
          type: existing.type,
          active: true,
          isDefault: true,
          NOT: { id: addressId },
        },
        data: { isDefault: false },
      });
      return tx.customerAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });

    this.logger.log(
      `[address.audit] action=setDefault customerId=${customerId} addressId=${addressId} type=${existing.type}`,
    );
    return toResponseDto(promoted);
  }

  // ─── Helpers internos ────────────────────────────────────────────────

  /**
   * Resuelve el customerId desde el userId del JWT.
   * Lanza ForbiddenException si el usuario no tiene Customer asociado
   * (no debería ocurrir post-FASE 1 backfill, pero protege contra
   * tokens stale).
   */
  private async resolveCustomerId(userId: string): Promise<string> {
    const customer = await this.prisma.customer.findFirst({
      where: { userId, active: true },
      select: { id: true },
    });
    if (!customer) {
      throw new ForbiddenException(
        'Tu cuenta no tiene un perfil de cliente asociado.',
      );
    }
    return customer.id;
  }

  /**
   * Garantiza que la dirección existe, pertenece al customer y está activa.
   * Anti-enumeration: el mismo mensaje cubre "no existe", "no es tuya" y
   * "está borrada (soft)".
   */
  private async requireOwnedActive(
    customerId: string,
    addressId: string,
  ): Promise<CustomerAddress> {
    const row = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId, active: true },
    });
    if (!row) {
      throw new NotFoundException('Dirección no encontrada');
    }
    return row;
  }

  /**
   * Promueve a default la dirección activa más reciente del mismo type,
   * excluyendo la actual.
   */
  private async promoteNextDefault(
    tx: Prisma.TransactionClient,
    customerId: string,
    type: AddressType,
    excludeId: string,
  ): Promise<void> {
    const next = await tx.customerAddress.findFirst({
      where: {
        customerId,
        type,
        active: true,
        NOT: { id: excludeId },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (next) {
      await tx.customerAddress.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }
}

function toResponseDto(row: CustomerAddress): AddressResponseDto {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,
    street: row.street,
    number: row.number,
    apartment: row.apartment,
    district: row.district,
    province: row.province,
    region: row.region,
    countryCode: row.countryCode,
    reference: row.reference,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
