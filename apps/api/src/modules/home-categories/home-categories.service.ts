import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HomeCategory, HomeCategorySlot, Prisma } from '@prisma/client';
import { UpdateHomeCategoryDto } from './dto';
import { HomeCategoryResponseDto } from './dto/home-category-response.dto';
import { HomeCategoriesRepository } from './repositories/home-categories.repository';

/// Default fallback usado cuando un slot no existe en DB todavía. Mantiene la
/// experiencia editorial estable aunque el seed de la migration falle.
const SLOT_DEFAULTS: Record<
  HomeCategorySlot,
  {
    sortOrder: number;
    active: boolean;
    eyebrow: string;
    label: string;
    ctaHref: string;
  }
> = {
  [HomeCategorySlot.PERFUMES_HOMBRE]: {
    sortOrder: 1,
    active: true,
    eyebrow: 'Perfumería',
    label: 'Perfumes para hombre',
    ctaHref: '/shop?subcategory=perfumes-hombre',
  },
  [HomeCategorySlot.PERFUMES_MUJER]: {
    sortOrder: 2,
    active: true,
    eyebrow: 'Perfumería',
    label: 'Perfumes para mujer',
    ctaHref: '/shop?subcategory=perfumes-mujer',
  },
  [HomeCategorySlot.JOYAS_ACERO_DORADO]: {
    sortOrder: 3,
    active: true,
    eyebrow: 'Joyería',
    label: 'Joyas en acero dorado',
    ctaHref: '/shop?subcategory=joyas-acero-dorado',
  },
  [HomeCategorySlot.JOYAS_ACERO_PLATEADO]: {
    sortOrder: 4,
    active: true,
    eyebrow: 'Joyería',
    label: 'Joyas en acero plateado',
    ctaHref: '/shop?subcategory=joyas-acero-plateado',
  },
  [HomeCategorySlot.JOYAS_BANADAS_ORO]: {
    sortOrder: 5,
    active: true,
    eyebrow: 'Joyería',
    label: 'Joyas bañadas en oro',
    ctaHref: '/shop?subcategory=joyas-banadas-en-oro',
  },
  [HomeCategorySlot.JOYAS_PLATA]: {
    sortOrder: 6,
    active: true,
    eyebrow: 'Joyería',
    label: 'Joyas de plata',
    ctaHref: '/shop?subcategory=joyas-plata',
  },
};

@Injectable()
export class HomeCategoriesService {
  private readonly logger = new Logger(HomeCategoriesService.name);

  constructor(private readonly repository: HomeCategoriesRepository) {}

  async findPublic(): Promise<HomeCategoryResponseDto[]> {
    const items = await this.repository.findActive();
    return items.map((c) => this.toResponse(c));
  }

  async findAllAdmin(): Promise<HomeCategoryResponseDto[]> {
    const items = await this.repository.findAll();
    return items.map((c) => this.toResponse(c));
  }

  async findBySlot(slot: HomeCategorySlot): Promise<HomeCategoryResponseDto> {
    const item = await this.repository.findBySlot(slot);
    if (!item) {
      throw new NotFoundException(`Home category slot "${slot}" not found`);
    }
    return this.toResponse(item);
  }

  async update(
    slot: HomeCategorySlot,
    dto: UpdateHomeCategoryDto,
  ): Promise<HomeCategoryResponseDto> {
    this.assertCtaHref(dto.ctaHref);

    const defaults = SLOT_DEFAULTS[slot];

    const updateData: Prisma.HomeCategoryUpdateInput = {
      sortOrder: dto.sortOrder,
      active: dto.active,
      eyebrow: dto.eyebrow,
      label: dto.label,
      ctaHref: dto.ctaHref,
      imageDesktop: dto.imageDesktop,
      imageMobile: dto.imageMobile,
      overlayColor: dto.overlayColor,
      overlayOpacity: dto.overlayOpacity,
    };

    const createData: Prisma.HomeCategoryCreateInput = {
      slot,
      sortOrder: dto.sortOrder ?? defaults.sortOrder,
      active: dto.active ?? defaults.active,
      eyebrow: dto.eyebrow ?? defaults.eyebrow,
      label: dto.label ?? defaults.label,
      ctaHref: dto.ctaHref ?? defaults.ctaHref,
      imageDesktop: dto.imageDesktop,
      imageMobile: dto.imageMobile,
      overlayColor: dto.overlayColor ?? '#0A0A0A',
      overlayOpacity: dto.overlayOpacity ?? 35,
    };

    const item = await this.repository.upsertBySlot(
      slot,
      updateData,
      createData,
    );

    this.logger.log(`Home category updated slot=${slot} id=${item.id}`);
    return this.toResponse(item);
  }

  private assertCtaHref(href?: string): void {
    if (href === undefined) return;
    if (
      !href.startsWith('/') &&
      !href.startsWith('https://') &&
      !href.startsWith('http://')
    ) {
      throw new BadRequestException(
        'ctaHref must be a relative path (starting with "/") or an absolute http(s) URL',
      );
    }
  }

  private toResponse(item: HomeCategory): HomeCategoryResponseDto {
    return {
      id: item.id,
      slot: item.slot,
      sortOrder: item.sortOrder,
      active: item.active,
      eyebrow: item.eyebrow,
      label: item.label,
      ctaHref: item.ctaHref,
      imageDesktop: item.imageDesktop,
      imageMobile: item.imageMobile,
      overlayColor: item.overlayColor,
      overlayOpacity: item.overlayOpacity,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
