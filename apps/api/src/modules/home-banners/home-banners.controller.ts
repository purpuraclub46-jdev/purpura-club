import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { HomeBannerSlot, Role } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateHomeBannerDto } from './dto';
import { HomeBannerResponseDto } from './dto/home-banner-response.dto';
import { HomeBannersService } from './home-banners.service';

@ApiTags('home-banners')
@Controller({ path: 'home-banners', version: '1' })
export class HomeBannersController {
  constructor(private readonly service: HomeBannersService) {}

  // ───── Public ─────

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active home banners (storefront)' })
  @ApiOkResponse({ type: [HomeBannerResponseDto] })
  listPublic() {
    return this.service.findPublic();
  }

  // ───── Admin ─────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List every home banner (admin)' })
  @ApiOkResponse({ type: [HomeBannerResponseDto] })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listAdmin() {
    return this.service.findAllAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin/:slot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a home banner by slot (admin)' })
  @ApiOkResponse({ type: HomeBannerResponseDto })
  getBySlot(@Param('slot') slot: HomeBannerSlot) {
    return this.service.findBySlot(slot);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Patch(':slot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a home banner slot (upsert)' })
  @ApiOkResponse({ type: HomeBannerResponseDto })
  @ApiBadRequestResponse()
  update(
    @Param('slot') slot: HomeBannerSlot,
    @Body() dto: UpdateHomeBannerDto,
  ) {
    return this.service.update(slot, dto);
  }
}
