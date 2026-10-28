import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentProvider,
  ProviderEvent,
  ProviderOutcome,
} from '../payment-provider.interface';

// ✅ Traduction en français
const OUTCOMES: ProviderOutcome[] = ['SUCCES', 'ECHEC', 'ANNULE'];

@Injectable()
export class SimulatedPaymentProvider implements PaymentProvider {
  readonly name = 'simulated';

  constructor(private config: ConfigService) {}

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:4200';

    return {
      providerRef: `SIM-${input.reference}`,
      checkoutUrl: `${frontendUrl}/paiement/simulation/${input.reference}`,
    };
  }

  parseWebhook(headers: Record<string, unknown>, body: unknown): ProviderEvent {
    const secret = this.config.get<string>('PAYMENT_WEBHOOK_SECRET');
    if (!secret) {
      throw new UnauthorizedException('PAYMENT_WEBHOOK_SECRET non configuré');
    }

    const b = (body ?? {}) as Record<string, unknown>;
    const reference = typeof b.reference === 'string' ? b.reference : '';
    const status = b.status as ProviderOutcome;
    const amount = typeof b.amount === 'number' ? b.amount : undefined;

    if (!reference || !OUTCOMES.includes(status)) {
      throw new BadRequestException('Notification invalide');
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${reference}|${status}|${amount ?? ''}`)
      .digest('hex');
    const given = String(headers['x-signature'] ?? '');

    const a = Buffer.from(expected);
    const g = Buffer.from(given);
    if (a.length !== g.length || !crypto.timingSafeEqual(a, g)) {
      throw new UnauthorizedException('Signature invalide');
    }

    return { reference, status, amount, raw: b };
  }
}