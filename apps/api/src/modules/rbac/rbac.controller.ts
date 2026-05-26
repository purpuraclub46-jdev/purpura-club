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
  Put,
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
import { Role as AccessLevel } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString } from 'class-validator';
import {
  CreateRoleDto,
  PermissionResponseDto,
  RoleQueryDto,
  RoleResponseDto,
  UpdateRoleDto,
} from './dto';
import { PermissionsService } from './permissions.service';
import { RolesService } from './roles.service';

class SetRolePermissionsDto {
  @ApiProperty({ type: [String], example: ['inventory.view'] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionKeys!: string[];
}

@ApiTags('rbac')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'rbac', version: '1' })
export class RbacController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  // ─── Permissions catalog (read-only) ─────────────────────────────────

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @Get('permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar catálogo completo de permisos' })
  @ApiOkResponse({ type: [PermissionResponseDto] })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listPermissions(): Promise<PermissionResponseDto[]> {
    return this.permissionsService.listAll();
  }

  // ─── Roles CRUD ──────────────────────────────────────────────────────

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @Get('roles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar roles dinámicos' })
  @ApiOkResponse({ description: 'Lista paginada de roles' })
  listRoles(@Query() query: RoleQueryDto) {
    return this.rolesService.findMany(query);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @Get('roles/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener un rol por id' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiNotFoundResponse()
  getRole(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findById(id);
  }

  @Roles(AccessLevel.SUPER_ADMIN)
  @Post('roles')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un rol dinámico' })
  @ApiCreatedResponse({ type: RoleResponseDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse({ description: 'Slug ya en uso' })
  createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Roles(AccessLevel.SUPER_ADMIN)
  @Patch('roles/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar un rol' })
  @ApiOkResponse({ type: RoleResponseDto })
  @ApiNotFoundResponse()
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, dto);
  }

  @Roles(AccessLevel.SUPER_ADMIN)
  @Put('roles/:id/permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reemplazar permisos asignados al rol' })
  @ApiOkResponse({ type: RoleResponseDto })
  setRolePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.rolesService.setPermissions(id, dto.permissionKeys ?? []);
  }

  @Roles(AccessLevel.SUPER_ADMIN)
  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un rol no oficial' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async removeRole(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.rolesService.remove(id);
  }
}
