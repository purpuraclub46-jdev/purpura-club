import {
  Body,
  Controller,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import {
  DecideEntryDto,
  EntryQueryDto,
  GrantEntryDto,
  PurchaseEntryDto,
} from './dto';
import {
  PaginatedEntriesResponseDto,
  PurchaseEntryResponseDto,
  RaffleEntryResponseDto,
} from './dto/entry-response.dto';
import { RaffleEntriesService } from './raffle-entries.service';

@ApiTags('raffle-entries')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'raffle-entries', version: '1' })
export class RaffleEntriesController {
  constructor(private readonly entriesService: RaffleEntriesService) {}

  @Post('purchase')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Purchase raffle entries (direct ticket sale)' })
  @ApiCreatedResponse({ type: PurchaseEntryResponseDto })
  @ApiBadRequestResponse({ description: 'Validation or business rule failure' })
  @ApiConflictResponse({ description: 'Inventory exhausted' })
  @ApiNotFoundResponse({ description: 'Raffle not found' })
  @ApiUnauthorizedResponse()
  purchase(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PurchaseEntryDto,
  ) {
    return this.entriesService.purchase(user, dto);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List raffle entries for the authenticated user' })
  @ApiOkResponse({ type: PaginatedEntriesResponseDto })
  @ApiUnauthorizedResponse()
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: EntryQueryDto,
  ) {
    return this.entriesService.findMine(user, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single raffle entry (owner or admin only)' })
  @ApiOkResponse({ type: RaffleEntryResponseDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({ description: 'Not the owner and not an admin' })
  @ApiNotFoundResponse()
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.entriesService.findOne(user, id);
  }

  // ───── Admin ─────

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all raffle entries (admin)' })
  @ApiOkResponse({ type: PaginatedEntriesResponseDto })
  @ApiForbiddenResponse()
  listAll(@Query() query: EntryQueryDto) {
    return this.entriesService.findAll(query);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post('grant')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Grant entries to a user (PURCHASE_REWARD / REFERRAL / BONUS)',
  })
  @ApiCreatedResponse({ type: [RaffleEntryResponseDto] })
  @ApiBadRequestResponse()
  @ApiConflictResponse({ description: 'Inventory exhausted' })
  @ApiNotFoundResponse({ description: 'Raffle or user not found' })
  grant(@Body() dto: GrantEntryDto) {
    return this.entriesService.grant(dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id/decide')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve or reject a pending entry (Yape manual review)',
  })
  @ApiOkResponse({ type: RaffleEntryResponseDto })
  @ApiConflictResponse({ description: 'Entry is not in PENDING_PAYMENT status' })
  @ApiNotFoundResponse()
  decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideEntryDto,
  ) {
    return this.entriesService.decide(id, dto);
  }

}

