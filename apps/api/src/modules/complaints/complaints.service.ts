import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Complaint,
  ComplaintStatus,
  Prisma,
} from '@prisma/client';
import {
  Paginated,
  buildPaginationMeta,
} from '../../common/interfaces/paginated.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ComplaintQueryDto,
  ComplaintResponseDto,
  CreateComplaintDto,
  UpdateComplaintDto,
} from './dto';
import { ComplaintsRepository } from './repositories/complaints.repository';

interface SubmissionContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);

  constructor(
    private readonly repository: ComplaintsRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Registra un reclamo desde el storefront. Genera un folio correlativo
   * `LR-YYYY-NNNNNN` en una transacción serializable para evitar duplicados
   * en condiciones de carrera (dos clientes presentando reclamos al mismo
   * tiempo durante el cambio de año).
   */
  async create(
    dto: CreateComplaintDto,
    ctx: SubmissionContext = {},
  ): Promise<ComplaintResponseDto> {
    this.assertGuardianFields(dto);

    const year = new Date().getFullYear();
    // Generamos el folio dentro de la transacción que crea el reclamo —
    // el COUNT + INSERT corren juntos con aislamiento serializable. Si dos
    // clientes hacen submit simultáneo, Postgres serializará y solo uno
    // obtendrá ese número; el otro reintentará con el siguiente.
    const created = await this.prisma.$transaction(
      async (tx) => {
        const count = await tx.complaint.count({
          where: { ticketNumber: { startsWith: `LR-${year}-` } },
        });
        const ticketNumber = `LR-${year}-${String(count + 1).padStart(6, '0')}`;
        return tx.complaint.create({
          data: {
            ticketNumber,
            firstName: dto.firstName,
            lastName: dto.lastName,
            documentType: dto.documentType ?? 'DNI',
            documentNumber: dto.documentNumber,
            phone: dto.phone,
            email: dto.email,
            address: dto.address,
            isMinor: dto.isMinor ?? false,
            guardianFullName:
              dto.isMinor && dto.guardianFullName ? dto.guardianFullName : null,
            guardianDocument:
              dto.isMinor && dto.guardianDocument ? dto.guardianDocument : null,
            type: dto.type,
            subjectType: dto.subjectType,
            subjectDetail: dto.subjectDetail,
            amount:
              dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : null,
            description: dto.description,
            consumerRequest: dto.consumerRequest,
            submittedIp: ctx.ip ?? null,
            submittedUserAgent: ctx.userAgent ?? null,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.logger.log(
      `Complaint received id=${created.id} ticket=${created.ticketNumber}`,
    );
    return this.toResponse(created);
  }

  async findByIdAdmin(id: string): Promise<ComplaintResponseDto> {
    const complaint = await this.repository.findById(id);
    if (!complaint) {
      throw new NotFoundException('Reclamo no encontrado');
    }
    return this.toResponse(complaint);
  }

  async findMany(
    query: ComplaintQueryDto,
  ): Promise<Paginated<ComplaintResponseDto>> {
    const where: Prisma.ComplaintWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    if (query.search && query.search.trim().length >= 2) {
      const needle = query.search.trim();
      where.OR = [
        { ticketNumber: { contains: needle, mode: 'insensitive' } },
        { firstName: { contains: needle, mode: 'insensitive' } },
        { lastName: { contains: needle, mode: 'insensitive' } },
        { documentNumber: { contains: needle, mode: 'insensitive' } },
        { email: { contains: needle, mode: 'insensitive' } },
      ];
    }

    const { items, total } = await this.repository.findManyPaginated({
      where,
      page: query.page,
      limit: query.limit,
    });

    return {
      items: items.map((c) => this.toResponse(c)),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async update(
    id: string,
    dto: UpdateComplaintDto,
    actorUserId?: string,
  ): Promise<ComplaintResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('Reclamo no encontrado');
    }

    const data: Prisma.ComplaintUpdateInput = {
      status: dto.status,
      response: dto.response,
      internalNotes: dto.internalNotes,
    };

    // Si el estado pasa a RESUELTO por primera vez, sellamos `resolvedAt` y
    // `resolvedByUserId` (columnas planas — no hay relación nombrada en el
    // schema, intencional para no comprometer borrado de usuarios viejos).
    // Si el admin vuelve a RESUELTO un reclamo ya resuelto, no re-sellamos
    // para preservar la fecha original.
    if (
      dto.status === ComplaintStatus.RESUELTO &&
      existing.status !== ComplaintStatus.RESUELTO
    ) {
      data.resolvedAt = new Date();
      data.resolvedByUserId = actorUserId ?? null;
    }

    // Si el admin reabre el reclamo (de RESUELTO a otro estado), limpiamos
    // los sellos de resolución para que la trazabilidad sea correcta.
    if (
      dto.status &&
      dto.status !== ComplaintStatus.RESUELTO &&
      existing.status === ComplaintStatus.RESUELTO
    ) {
      data.resolvedAt = null;
      data.resolvedByUserId = null;
    }

    const updated = await this.repository.update(id, data);
    this.logger.log(`Complaint updated id=${updated.id} status=${updated.status}`);
    return this.toResponse(updated);
  }

  private assertGuardianFields(dto: CreateComplaintDto): void {
    if (!dto.isMinor) return;
    if (!dto.guardianFullName?.trim() || !dto.guardianDocument?.trim()) {
      throw new BadRequestException(
        'Para consumidores menores de edad el nombre y documento del padre, madre o tutor son obligatorios.',
      );
    }
  }

  private toResponse(complaint: Complaint): ComplaintResponseDto {
    return {
      id: complaint.id,
      ticketNumber: complaint.ticketNumber,
      firstName: complaint.firstName,
      lastName: complaint.lastName,
      documentType: complaint.documentType,
      documentNumber: complaint.documentNumber,
      phone: complaint.phone,
      email: complaint.email,
      address: complaint.address,
      isMinor: complaint.isMinor,
      guardianFullName: complaint.guardianFullName,
      guardianDocument: complaint.guardianDocument,
      type: complaint.type,
      subjectType: complaint.subjectType,
      subjectDetail: complaint.subjectDetail,
      amount:
        complaint.amount === null
          ? null
          : Number(
              complaint.amount instanceof Prisma.Decimal
                ? complaint.amount.toNumber()
                : complaint.amount,
            ),
      description: complaint.description,
      consumerRequest: complaint.consumerRequest,
      status: complaint.status,
      response: complaint.response,
      internalNotes: complaint.internalNotes,
      resolvedAt: complaint.resolvedAt,
      resolvedByUserId: complaint.resolvedByUserId,
      createdAt: complaint.createdAt,
      updatedAt: complaint.updatedAt,
    };
  }
}
