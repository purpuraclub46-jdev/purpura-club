import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ComplaintsService } from './complaints.service';
import {
  ComplaintQueryDto,
  ComplaintResponseDto,
  CreateComplaintDto,
  UpdateComplaintDto,
} from './dto';

@ApiTags('complaints')
@Controller({ path: 'complaints', version: '1' })
export class ComplaintsController {
  constructor(private readonly service: ComplaintsService) {}

  // ───── Public ─────

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Registrar un nuevo reclamo en el Libro de Reclamaciones (consumidor)',
  })
  @ApiCreatedResponse({ type: ComplaintResponseDto })
  @ApiBadRequestResponse()
  create(
    @Body() dto: CreateComplaintDto,
    @Ip() ip: string | undefined,
    @Req() req: Request,
  ) {
    return this.service.create(dto, {
      ip: ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
    });
  }

  // ───── Admin ─────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar reclamos (admin, paginado, filtrable)' })
  @ApiOkResponse({ type: [ComplaintResponseDto] })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listAdmin(@Query() query: ComplaintQueryDto) {
    return this.service.findMany(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener detalle de un reclamo (admin)' })
  @ApiOkResponse({ type: ComplaintResponseDto })
  @ApiNotFoundResponse()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findByIdAdmin(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Patch('admin/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Actualizar estado/respuesta/notas internas de un reclamo (admin)',
  })
  @ApiOkResponse({ type: ComplaintResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateComplaintDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.update(id, dto, userId);
  }
}
