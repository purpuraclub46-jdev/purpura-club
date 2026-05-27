import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HomeStore, Prisma } from '@prisma/client';
import { CreateHomeStoreDto, UpdateHomeStoreDto } from './dto';
import { HomeStoreResponseDto } from './dto/home-store-response.dto';
import { HomeStoresRepository } from './repositories/home-stores.repository';

@Injectable()
export class HomeStoresService {
  private readonly logger = new Logger(HomeStoresService.name);

  constructor(private readonly repository: HomeStoresRepository) {}

  async findPublic(): Promise<HomeStoreResponseDto[]> {
    const stores = await this.repository.findActive();
    return stores.map((s) => this.toResponse(s));
  }

  async findAllAdmin(): Promise<HomeStoreResponseDto[]> {
    const stores = await this.repository.findAll();
    return stores.map((s) => this.toResponse(s));
  }

  async findById(id: string): Promise<HomeStoreResponseDto> {
    const store = await this.repository.findById(id);
    if (!store) {
      throw new NotFoundException(`Tienda "${id}" no encontrada`);
    }
    return this.toResponse(store);
  }

  async create(dto: CreateHomeStoreDto): Promise<HomeStoreResponseDto> {
    const store = await this.repository.create({
      name: dto.name,
      city: dto.city,
      address: dto.address,
      reference: dto.reference ?? null,
      whatsapp: dto.whatsapp ?? null,
      schedule: dto.schedule ?? null,
      mapsUrl: dto.mapsUrl ?? null,
      imageDesktop: dto.imageDesktop ?? null,
      imageMobile: dto.imageMobile ?? null,
      sortOrder: dto.sortOrder ?? 0,
      active: dto.active ?? true,
    });
    this.logger.log(`HomeStore created ${store.id} (${store.name})`);
    return this.toResponse(store);
  }

  async update(
    id: string,
    dto: UpdateHomeStoreDto,
  ): Promise<HomeStoreResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Tienda "${id}" no encontrada`);
    }

    const data: Prisma.HomeStoreUpdateInput = {
      name: dto.name,
      city: dto.city,
      address: dto.address,
      reference: dto.reference,
      whatsapp: dto.whatsapp,
      schedule: dto.schedule,
      mapsUrl: dto.mapsUrl,
      imageDesktop: dto.imageDesktop,
      imageMobile: dto.imageMobile,
      sortOrder: dto.sortOrder,
      active: dto.active,
    };

    const store = await this.repository.update(id, data);
    return this.toResponse(store);
  }

  async remove(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
      this.logger.log(`HomeStore deleted ${id}`);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Tienda "${id}" no encontrada`);
      }
      throw error;
    }
  }

  private toResponse(store: HomeStore): HomeStoreResponseDto {
    return {
      id: store.id,
      name: store.name,
      city: store.city,
      address: store.address,
      reference: store.reference,
      whatsapp: store.whatsapp,
      schedule: store.schedule,
      mapsUrl: store.mapsUrl,
      imageDesktop: store.imageDesktop,
      imageMobile: store.imageMobile,
      sortOrder: store.sortOrder,
      active: store.active,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };
  }
}
