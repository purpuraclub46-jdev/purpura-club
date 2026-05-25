import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BenefitLogQueryDto } from './dto/benefit-log-query.dto';
import { MembershipQueryDto } from './dto/membership-query.dto';
import {
  MembershipBenefitLogResponseDto,
  MembershipResponseDto,
} from './dto/membership-response.dto';
import { MembershipsService } from './memberships.service';

@ApiTags('memberships')
@Controller({ path: 'memberships', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mi membresía actual' })
  @ApiOkResponse({ type: MembershipResponseDto })
  findMine(@CurrentUser('id') userId: string) {
    return this.service.findMine(userId);
  }

  @Get('admin/stats')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Indicadores generales del Club' })
  stats() {
    return this.service.stats();
  }

  @Get('admin/all')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar membresías (admin)' })
  @ApiOkResponse({ type: MembershipResponseDto, isArray: true })
  list(@Query() query: MembershipQueryDto) {
    return this.service.findMany(query);
  }

  @Get('admin/benefits')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Historial de beneficios otorgados (admin)' })
  @ApiOkResponse({ type: MembershipBenefitLogResponseDto, isArray: true })
  benefits(@Query() query: BenefitLogQueryDto) {
    return this.service.findBenefitLogs(query);
  }

  @Get('admin/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Detalle de una membresía (admin)' })
  @ApiOkResponse({ type: MembershipResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }
}
