import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaymentService } from './payements.service';

/**
 * Pas de route « créer un paiement » ici, volontairement : le montant ne doit
 * jamais venir du client. Chaque module métier (ex. abonnements) expose sa
 * propre route « payer » qui appelle PaymentGatewayService.createCheckout().
 */
@Controller('payments')
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  // ⚠️ Déclarée avant les routes ':reference' pour éviter toute ambiguïté
  @Public()
  @Post('webhook/:provider')
  @HttpCode(200)
  async webhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, unknown>,
    @Body() body: unknown,
  ) {
    await this.service.handleWebhook(provider, headers, body);
    return { received: true };
  }

  // État d'un paiement (propriétaire ou admin)
  @Get(':reference')
  @UseGuards(AuthGuard('jwt'))
  getStatus(@Param('reference') reference: string, @Request() req) {
    return this.service.getForUser(reference, req.user);
  }

  // Page de paiement fictive : réussir / échouer / annuler
  @Post(':reference/simulate')
  @UseGuards(AuthGuard('jwt'))
  simulate(
    @Param('reference') reference: string,
    @Body() dto: SimulatePaymentDto,
    @Request() req,
  ) {
    return this.service.simulate(reference, dto, req.user);
  }

  // Rattrapage : paiement réussi mais service non activé
  @Post(':reference/retry-fulfillment')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  retryFulfillment(@Param('reference') reference: string) {
    return this.service.retryFulfillment(reference);
  }
}