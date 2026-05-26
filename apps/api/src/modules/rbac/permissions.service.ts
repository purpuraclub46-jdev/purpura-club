import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionResponseDto } from './dto/permission-response.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Devuelve el catálogo completo de permisos del sistema, ordenado por
   * módulo y luego por clave. Es read-only: el catálogo se sincroniza
   * automáticamente vía `RbacBootstrap` en cada arranque.
   */
  async listAll(): Promise<PermissionResponseDto[]> {
    const items = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { key: 'asc' }],
    });

    return items.map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      description: p.description,
      module: p.module,
      createdAt: p.createdAt,
    }));
  }
}
