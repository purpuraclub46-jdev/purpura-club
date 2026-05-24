import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CategoriesService } from './categories.service';
import {
  CategoryQueryDto,
  CategoryResponseDto,
  CreateCategoryDto,
  PaginatedCategoriesResponseDto,
  UpdateCategoryDto,
} from './dto';

@ApiTags('categories')
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar categorías activas (público)' })
  @ApiOkResponse({ type: PaginatedCategoriesResponseDto })
  listPublic(@Query() query: CategoryQueryDto) {
    return this.service.findMany({ ...query, active: true });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todas las categorías (admin)' })
  @ApiOkResponse({ type: PaginatedCategoriesResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listAdmin(@Query() query: CategoryQueryDto) {
    return this.service.findMany(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener una categoría por id (admin)' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva categoría' })
  @ApiCreatedResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse({ description: 'Slug ya en uso' })
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar una categoría' })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una categoría' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
