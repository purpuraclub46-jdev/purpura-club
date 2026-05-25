import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReferralQueryDto } from './dto/referral-query.dto';
import { ReferralResponseDto } from './dto/referral-response.dto';
import { ReferralsService } from './referrals.service';

@ApiTags('referrals')
@Controller({ path: 'referrals', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class ReferralsController {
  constructor(private readonly service: ReferralsService) {}

  @Get('admin/all')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar referidos (admin)' })
  @ApiOkResponse({ type: ReferralResponseDto, isArray: true })
  list(@Query() query: ReferralQueryDto) {
    return this.service.findMany(query);
  }
}
