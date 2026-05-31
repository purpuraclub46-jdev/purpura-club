import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CheckoutService } from './checkout.service';
import {
  CheckoutSessionResponseDto,
  CreateCheckoutSessionDto,
} from './dto/checkout-session.dto';

/**
 * FASE 2 / F2.6-A — Endpoint de checkout para cliente autenticado.
 *
 * NO atiende sorteos (rifas usan RaffleEntriesController con flujo Yape).
 */
@ApiTags('Checkout')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'No autenticado' })
@UseGuards(JwtAuthGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly service: CheckoutService) {}

  @Post('sessions')
  @ApiOperation({
    summary:
      'Crea una sesión de checkout — persiste la orden en PENDING y delega al PaymentProvider configurado.',
  })
  @ApiCreatedResponse({ type: CheckoutSessionResponseDto })
  @ApiBadRequestResponse({ description: 'Items inválidos o catálogo' })
  @ApiForbiddenResponse({ description: 'Usuario sin perfil de cliente' })
  @ApiNotFoundResponse({ description: 'Dirección de envío no encontrada' })
  createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.service.createSession(user.id, dto);
  }
}
