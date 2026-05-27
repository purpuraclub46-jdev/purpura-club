import { Injectable } from '@nestjs/common';
import { Complaint, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ComplaintsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Complaint | null> {
    return this.prisma.complaint.findUnique({ where: { id } });
  }

  findByTicket(ticketNumber: string): Promise<Complaint | null> {
    return this.prisma.complaint.findUnique({ where: { ticketNumber } });
  }

  create(data: Prisma.ComplaintCreateInput): Promise<Complaint> {
    return this.prisma.complaint.create({ data });
  }

  update(
    id: string,
    data: Prisma.ComplaintUpdateInput,
  ): Promise<Complaint> {
    return this.prisma.complaint.update({ where: { id }, data });
  }

  async findManyPaginated(args: {
    where: Prisma.ComplaintWhereInput;
    page: number;
    limit: number;
  }): Promise<{ items: Complaint[]; total: number }> {
    const { where, page, limit } = args;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.complaint.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.complaint.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * Cuenta cuántos reclamos existen para el año dado, basándose en el
   * folio. Lo usa el service para emitir el siguiente correlativo en una
   * transacción atómica.
   *
   * Folio: `LR-YYYY-NNNNNN`.
   */
  countForYear(year: number): Promise<number> {
    return this.prisma.complaint.count({
      where: { ticketNumber: { startsWith: `LR-${year}-` } },
    });
  }
}
