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
import { BranchesService } from './branches.service';
import {
  BranchQueryDto,
  BranchResponseDto,
  CreateBranchDto,
  PaginatedBranchesResponseDto,
  UpdateBranchDto,
} from './dto';

@ApiTags('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'branches', version: '1' })
export class BranchesController {
  constructor(private readonly service: BranchesService) {}

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar sucursales' })
  @ApiOkResponse({ type: PaginatedBranchesResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  list(@Query() query: BranchQueryDto) {
    return this.service.findMany(query);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener una sucursal por id' })
  @ApiOkResponse({ type: BranchResponseDto })
  @ApiNotFoundResponse()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva sucursal' })
  @ApiCreatedResponse({ type: BranchResponseDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse({ description: 'Slug ya en uso' })
  create(@Body() dto: CreateBranchDto) {
    return this.service.create(dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar una sucursal' })
  @ApiOkResponse({ type: BranchResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.service.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una sucursal' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
