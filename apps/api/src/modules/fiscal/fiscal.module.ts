import { Global, Module } from '@nestjs/common';
import { FiscalConfigService } from './fiscal-config.service';

/**
 * FiscalModule — registro global del FiscalConfigService.
 *
 * El módulo se marca @Global para que cualquier servicio pueda inyectar
 * `FiscalConfigService` sin imports repetitivos. Las utilidades puras
 * (fiscal.util, document-validators) se importan directamente como funciones.
 */
@Global()
@Module({
  providers: [FiscalConfigService],
  exports: [FiscalConfigService],
})
export class FiscalModule {}
