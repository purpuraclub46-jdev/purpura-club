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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreateInventoryLocationDto,
  InventoryLocationQueryDto,
  InventoryLocationResponseDto,
  PaginatedInventoryLocationsResponseDto,
  UpdateInventoryLocationDto,
} from './dto';
import { InventoryLocationsService } from './inventory-locations.service';

@ApiTags('inventory-locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'inventory-locations', version: '1' })
export class InventoryLocationsController {
  constructor(private readonly service: InventoryLocationsService) {}

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar ubicaciones de inventario' })
  @ApiOkResponse({ type: PaginatedInventoryLocationsResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  list(@Query() query: InventoryLocationQueryDto) {
    return this.service.findMany(query);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener una ubicación por id' })
  @ApiOkResponse({ type: InventoryLocationResponseDto })
  @ApiNotFoundResponse()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una ubicación de inventario' })
  @ApiCreatedResponse({ type: InventoryLocationResponseDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse({ description: 'Slug ya en uso' })
  create(@Body() dto: CreateInventoryLocationDto) {
    return this.service.create(dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar una ubicación' })
  @ApiOkResponse({ type: InventoryLocationResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryLocationDto,
  ) {
    return this.service.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una ubicación' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
