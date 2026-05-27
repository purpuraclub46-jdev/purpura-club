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
import { HomeCategorySlot, Role } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateHomeCategoryDto } from './dto';
import { HomeCategoryResponseDto } from './dto/home-category-response.dto';
import { HomeCategoriesService } from './home-categories.service';

@ApiTags('home-categories')
@Controller({ path: 'home-categories', version: '1' })
export class HomeCategoriesController {
  constructor(private readonly service: HomeCategoriesService) {}

  // ───── Public ─────

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active home categories (storefront)' })
  @ApiOkResponse({ type: [HomeCategoryResponseDto] })
  listPublic() {
    return this.service.findPublic();
  }

  // ───── Admin ─────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List every home category (admin)' })
  @ApiOkResponse({ type: [HomeCategoryResponseDto] })
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
  @ApiOperation({ summary: 'Get a home category by slot (admin)' })
  @ApiOkResponse({ type: HomeCategoryResponseDto })
  getBySlot(@Param('slot') slot: HomeCategorySlot) {
    return this.service.findBySlot(slot);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Patch(':slot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a home category slot (upsert)' })
  @ApiOkResponse({ type: HomeCategoryResponseDto })
  @ApiBadRequestResponse()
  update(
    @Param('slot') slot: HomeCategorySlot,
    @Body() dto: UpdateHomeCategoryDto,
  ) {
    return this.service.update(slot, dto);
  }
}
