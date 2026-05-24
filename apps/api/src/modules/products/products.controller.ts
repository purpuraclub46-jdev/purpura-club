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
import {
  CreateProductDto,
  PaginatedProductsResponseDto,
  ProductQueryDto,
  ProductResponseDto,
  UpdateProductDto,
} from './dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar productos activos (catálogo público)' })
  @ApiOkResponse({ type: PaginatedProductsResponseDto })
  listPublic(@Query() query: ProductQueryDto) {
    return this.service.findMany({ ...query, active: true });
  }

  @Public()
  @Get('slug/:slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener un producto por slug (público)' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse()
  getBySlug(@Param('slug') slug: string) {
    return this.service.findBySlugPublic(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todos los productos (admin)' })
  @ApiOkResponse({ type: PaginatedProductsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listAdmin(@Query() query: ProductQueryDto) {
    return this.service.findMany(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener un producto por id (admin)' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo producto' })
  @ApiCreatedResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse({ description: 'SKU, slug o código de barras en uso' })
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar un producto' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un producto' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
