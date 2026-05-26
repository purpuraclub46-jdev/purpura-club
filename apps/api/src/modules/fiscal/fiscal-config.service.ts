import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Configuración fiscal global del sistema (Perú).
 *
 * Centraliza la tasa de IGV, la convención precio-incluye-IGV y otros flags
 * para que ningún módulo hardcodee 18% o similares. Lee de variables de
 * entorno con defaults seguros para retail peruano.
 *
 * Vars soportadas:
 *  - FISCAL_IGV_ENABLED        (default true)
 *  - FISCAL_IGV_RATE           (default 18)  — % de IGV
 *  - FISCAL_PRICES_INCLUDE_IGV (default true) — precios del catálogo ya incluyen IGV
 *  - FISCAL_COUNTRY            (default PE)
 *  - FISCAL_CURRENCY           (default PEN)
 *  - FISCAL_ISSUER_RUC         (opcional — RUC de la empresa emisora)
 *  - FISCAL_ISSUER_LEGAL_NAME  (opcional — razón social del emisor)
 */
@Injectable()
export class FiscalConfigService {
  private readonly logger = new Logger(FiscalConfigService.name);

  readonly igvEnabled: boolean;
  readonly igvRate: number;
  readonly pricesIncludeIgv: boolean;
  readonly country: string;
  readonly currency: string;
  readonly issuerRuc: string | null;
  readonly issuerLegalName: string | null;

  constructor(private readonly config: ConfigService) {
    this.igvEnabled = this.parseBool(
      this.config.get<string>('FISCAL_IGV_ENABLED'),
      true,
    );
    this.igvRate = this.parseNumber(
      this.config.get<string>('FISCAL_IGV_RATE'),
      18,
    );
    this.pricesIncludeIgv = this.parseBool(
      this.config.get<string>('FISCAL_PRICES_INCLUDE_IGV'),
      true,
    );
    this.country = this.config.get<string>('FISCAL_COUNTRY') ?? 'PE';
    this.currency = this.config.get<string>('FISCAL_CURRENCY') ?? 'PEN';
    this.issuerRuc = this.config.get<string>('FISCAL_ISSUER_RUC') ?? null;
    this.issuerLegalName =
      this.config.get<string>('FISCAL_ISSUER_LEGAL_NAME') ?? null;

    this.logger.log(
      `FiscalConfig: ${this.country}/${this.currency} · IGV ${this.igvEnabled ? `${this.igvRate}%` : 'OFF'} · pricesIncludeIgv=${this.pricesIncludeIgv}`,
    );
  }

  /** IGV efectivo (0 si está deshabilitado). */
  effectiveIgvRate(): number {
    return this.igvEnabled ? this.igvRate : 0;
  }

  private parseBool(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined || value === null) return fallback;
    const v = value.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
    if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
    return fallback;
  }

  private parseNumber(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }
}
