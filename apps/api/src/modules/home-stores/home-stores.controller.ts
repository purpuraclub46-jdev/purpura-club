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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { CreateHomeStoreDto, UpdateHomeStoreDto } from './dto';
import { HomeStoreResponseDto } from './dto/home-store-response.dto';
import { HomeStoresService } from './home-stores.service';

@ApiTags('home-stores')
@Controller({ path: 'home-stores', version: '1' })
export class HomeStoresController {
  constructor(private readonly service: HomeStoresService) {}

  // ───── Public ─────

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active home stores (storefront)' })
  @ApiOkResponse({ type: [HomeStoreResponseDto] })
  listPublic() {
    return this.service.findPublic();
  }

  // ───── Admin ─────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List every home store (admin)' })
  @ApiOkResponse({ type: [HomeStoreResponseDto] })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listAdmin() {
    return this.service.findAllAdmin();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Get('admin/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a home store by id (admin)' })
  @ApiOkResponse({ type: HomeStoreResponseDto })
  @ApiNotFoundResponse()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a home store' })
  @ApiCreatedResponse({ type: HomeStoreResponseDto })
  @ApiBadRequestResponse()
  create(@Body() dto: CreateHomeStoreDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a home store' })
  @ApiOkResponse({ type: HomeStoreResponseDto })
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHomeStoreDto,
  ) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a home store' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
