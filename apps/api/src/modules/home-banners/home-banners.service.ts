import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  HomeBanner,
  HomeBannerAlign,
  HomeBannerSlot,
  Prisma,
} from '@prisma/client';
import { UpdateHomeBannerDto } from './dto';
import { HomeBannerResponseDto } from './dto/home-banner-response.dto';
import { HomeBannersRepository } from './repositories/home-banners.repository';

/// Default fallback usado cuando un slot no existe en DB todavía. Mantiene la
/// experiencia editorial estable aunque el seed de la migration falle.
const SLOT_DEFAULTS: Record<
  HomeBannerSlot,
  {
    order: number;
    active: boolean;
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    align: HomeBannerAlign;
  }
> = {
  [HomeBannerSlot.JEWELRY]: {
    order: 1,
    active: true,
    eyebrow: 'Joyería atemporal',
    title: 'El detalle que distingue',
    subtitle:
      'Piezas en acero quirúrgico, plata 925 y baño de oro 18k. Hipoalergénicas y duraderas.',
    ctaLabel: 'Ver productos',
    ctaHref: '/shop?category=joyas',
    align: HomeBannerAlign.LEFT,
  },
  [HomeBannerSlot.PERFUME]: {
    order: 2,
    active: true,
    eyebrow: 'Perfumería de autor',
    title: 'El aroma que te distingue',
    subtitle:
      'Composiciones premium con jazmín, vainilla y maderas blancas, listas para envío en todo el Perú.',
    ctaLabel: 'Ver productos',
    ctaHref: '/shop?category=perfumes',
    align: HomeBannerAlign.RIGHT,
  },
  [HomeBannerSlot.RAFFLE]: {
    order: 3,
    active: true,
    eyebrow: 'Club Púrpura',
    title: 'Participa y gana experiencias',
    subtitle:
      'Cada compra te acerca a premios exclusivos: viajes, joyas, perfumes y más.',
    ctaLabel: 'Ir a sorteos',
    ctaHref: '/sorteos',
    align: HomeBannerAlign.LEFT,
  },
  [HomeBannerSlot.FLEXIBLE]: {
    order: 4,
    active: false,
    eyebrow: 'Edición especial',
    title: 'Tu próxima campaña',
    subtitle: 'Banner flexible — configúralo desde el panel cuando lo necesites.',
    ctaLabel: 'Descubrir',
    ctaHref: '/shop',
    align: HomeBannerAlign.CENTER,
  },
};

@Injectable()
export class HomeBannersService {
  private readonly logger = new Logger(HomeBannersService.name);

  constructor(private readonly repository: HomeBannersRepository) {}

  async findPublic(): Promise<HomeBannerResponseDto[]> {
    const banners = await this.repository.findActive();
    return banners.map((b) => this.toResponse(b));
  }

  async findAllAdmin(): Promise<HomeBannerResponseDto[]> {
    const banners = await this.repository.findAll();
    return banners.map((b) => this.toResponse(b));
  }

  async findBySlot(slot: HomeBannerSlot): Promise<HomeBannerResponseDto> {
    const banner = await this.repository.findBySlot(slot);
    if (!banner) {
      throw new NotFoundException(`Home banner slot "${slot}" not found`);
    }
    return this.toResponse(banner);
  }

  async update(
    slot: HomeBannerSlot,
    dto: UpdateHomeBannerDto,
  ): Promise<HomeBannerResponseDto> {
    this.assertCtaHref(dto.ctaHref);

    const defaults = SLOT_DEFAULTS[slot];

    const updateData: Prisma.HomeBannerUpdateInput = {
      order: dto.order,
      active: dto.active,
      eyebrow: dto.eyebrow,
      title: dto.title,
      subtitle: dto.subtitle,
      ctaLabel: dto.ctaLabel,
      ctaHref: dto.ctaHref,
      imageDesktop: dto.imageDesktop,
      imageMobile: dto.imageMobile,
      overlayColor: dto.overlayColor,
      overlayOpacity: dto.overlayOpacity,
      align: dto.align,
    };

    const createData: Prisma.HomeBannerCreateInput = {
      slot,
      order: dto.order ?? defaults.order,
      active: dto.active ?? defaults.active,
      eyebrow: dto.eyebrow ?? defaults.eyebrow,
      title: dto.title ?? defaults.title,
      subtitle: dto.subtitle ?? defaults.subtitle,
      ctaLabel: dto.ctaLabel ?? defaults.ctaLabel,
      ctaHref: dto.ctaHref ?? defaults.ctaHref,
      imageDesktop: dto.imageDesktop,
      imageMobile: dto.imageMobile,
      overlayColor: dto.overlayColor ?? '#0A0A0A',
      overlayOpacity: dto.overlayOpacity ?? 45,
      align: dto.align ?? defaults.align,
    };

    const banner = await this.repository.upsertBySlot(
      slot,
      updateData,
      createData,
    );

    this.logger.log(`Home banner updated slot=${slot} id=${banner.id}`);
    return this.toResponse(banner);
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

  private toResponse(banner: HomeBanner): HomeBannerResponseDto {
    return {
      id: banner.id,
      slot: banner.slot,
      order: banner.order,
      active: banner.active,
      eyebrow: banner.eyebrow,
      title: banner.title,
      subtitle: banner.subtitle,
      ctaLabel: banner.ctaLabel,
      ctaHref: banner.ctaHref,
      imageDesktop: banner.imageDesktop,
      imageMobile: banner.imageMobile,
      overlayColor: banner.overlayColor,
      overlayOpacity: banner.overlayOpacity,
      align: banner.align,
      createdAt: banner.createdAt,
      updatedAt: banner.updatedAt,
    };
  }
}
