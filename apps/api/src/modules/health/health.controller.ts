import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe' })
  check() {
    return this.healthService.check();
  }

  @Public()
  @Get('readiness')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness probe (checks DB)' })
  readiness() {
    return this.healthService.readiness();
  }
}
