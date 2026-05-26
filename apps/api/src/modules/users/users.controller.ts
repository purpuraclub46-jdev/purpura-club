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
import { Role as AccessLevel } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import {
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
  UserQueryDto,
  UserResponseDto,
} from './dto';
import { UsersService } from './users.service';

class SetActiveDto {
  @ApiProperty()
  @IsBoolean()
  active!: boolean;
}

@ApiTags('users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('users.view')
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiOkResponse({ description: 'Lista paginada de usuarios.' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  list(@Query() query: UserQueryDto) {
    return this.usersService.findMany(query);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('users.view')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener un usuario por id' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('users.create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un usuario' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('users.edit')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('users.edit')
  @Post(':id/active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activar o desactivar la cuenta' })
  @ApiOkResponse({ type: UserResponseDto })
  setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetActiveDto,
    @CurrentUser('id') actingUserId: string,
  ) {
    return this.usersService.setActive(id, Boolean(dto.active), actingUserId);
  }

  @Roles(AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN)
  @RequirePermissions('users.edit')
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Restablecer la contraseña del usuario' })
  @ApiNoContentResponse()
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser('id') actingUserId: string,
  ): Promise<void> {
    await this.usersService.resetPassword(id, dto.password, actingUserId);
  }

  @Roles(AccessLevel.SUPER_ADMIN)
  @RequirePermissions('users.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') actingUserId: string,
  ): Promise<void> {
    await this.usersService.remove(id, actingUserId);
  }
}
