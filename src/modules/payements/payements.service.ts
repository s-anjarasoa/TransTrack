import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import * as crypto from 'crypto';

import {
  Paiement,
  PaiementMethode,
  PaiementStatut,
} from '../../entities/paiement.entity';
import {
  CheckoutResult,
  CreateCheckoutInput,
  PaymentContext,
  PaymentOutcomeHandler,
  PaymentProvider,
  PaymentPurpose,
  ProviderEvent,
  ProviderOutcome,
} from './payment-provider.interface';
import { SimulatedPaymentProvider } from './providers/simulated.provider';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';

type Requester = { id: number; role: string };

const PAYMENT_TTL_MS = 30 * 60 * 1000;

const STATUT_BY_OUTCOME: Record<ProviderOutcome, PaiementStatut> = {
  SUCCES: PaiementStatut.VALIDE,
  ECHEC: PaiementStatut.ECHOUE,
  ANNULE: PaiementStatut.ANNULE,
};

const VIEW_STATUS: Record<PaiementStatut, string> = {
  [PaiementStatut.EN_ATTENTE]: 'EN_ATTENTE',
  [PaiementStatut.VALIDE]: 'VALIDE',
  [PaiementStatut.ECHOUE]: 'ECHOUE',
  [PaiementStatut.ANNULE]: 'ANNULE',
  [PaiementStatut.EXPIRE]: 'EXPIRE',
  [PaiementStatut.REMBOURSE]: 'REMBOURSE',
};

function purposeOf(
  paiement: Paiement,
): { type: PaymentPurpose; id: number } | null {
  if (paiement.abonnementId) {
    return { type: PaymentPurpose.ABONNEMENT, id: paiement.abonnementId };
  }
  if (paiement.reservationId) {
    return { type: PaymentPurpose.RESERVATION, id: paiement.reservationId };
  }
  return null;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly providers = new Map<string, PaymentProvider>();
  private readonly handlers = new Map<PaymentPurpose, PaymentOutcomeHandler>();

  constructor(
    @InjectRepository(Paiement) private repo: Repository<Paiement>,
    @InjectDataSource() private dataSource: DataSource,
    private config: ConfigService,
    simulated: SimulatedPaymentProvider,
  ) {
    [simulated].forEach((p) => this.providers.set(p.name, p));
  }

  registerHandler(purpose: PaymentPurpose, handler: PaymentOutcomeHandler): void {
    this.handlers.set(purpose, handler);
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new BadRequestException('Montant invalide');
    }
    if (input.returnPath && !/^\/(?!\/)/.test(input.returnPath)) {
      throw new BadRequestException('Chemin de retour invalide');
    }

    const provider = this.getActiveProvider();
    const isAbonnement = input.purposeType === PaymentPurpose.ABONNEMENT;
    const purposeWhere = isAbonnement
      ? { abonnementId: input.purposeId }
      : { reservationId: input.purposeId };

    await this.repo.update(
      {
        ...purposeWhere,
        statut: PaiementStatut.EN_ATTENTE,
        provider: Not(IsNull()),
      },
      { statut: PaiementStatut.ANNULE },
    );

    const paiement = await this.repo.save(
      this.repo.create({
        reference: this.generateReference(),
        montant: input.amount,
        methode: PaiementMethode.MOBILE_MONEY,
        statut: PaiementStatut.EN_ATTENTE,
        datePaiement: new Date(),
        notes: input.description.slice(0, 255),
        provider: provider.name,
        userId: input.userId,
        currency: input.currency ?? 'MGA',
        returnPath: input.returnPath ?? null,
        expiresAt: new Date(Date.now() + PAYMENT_TTL_MS),
        ...purposeWhere,
      }),
    );

    try {
      const init = await provider.initiate({
        reference: paiement.reference,
        amount: paiement.montant,
        currency: paiement.currency,
        description: input.description,
      });

      if (init.providerRef) {
        await this.repo.update(paiement.id, { transactionId: init.providerRef });
      }

      return {
        reference: paiement.reference,
        status: VIEW_STATUS[paiement.statut],
        amount: paiement.montant,
        currency: paiement.currency,
        checkoutUrl: init.checkoutUrl ?? null,
        instructions: init.instructions ?? null,
        expiresAt: paiement.expiresAt as Date,
      };
    } catch (error: any) {
      await this.repo.update(paiement.id, { statut: PaiementStatut.ECHOUE });
      this.logger.error(
        `Échec d'initialisation ${paiement.reference} (${provider.name}) : ${error?.message}`,
      );
      throw new ServiceUnavailableException(
        'Le service de paiement est momentanément indisponible.',
      );
    }
  }

  async getForUser(reference: string, requester: Requester) {
    const paiement = await this.findOwned(reference, requester);
    await this.expireIfNeeded(paiement);
    return this.toView(paiement);
  }

  async simulate(
    reference: string,
    dto: SimulatePaymentDto,
    requester: Requester,
  ) {
    const paiement = await this.findOwned(reference, requester);

    if (paiement.provider !== 'simulated' || !this.simulatorAllowed()) {
      throw new ForbiddenException("Le simulateur de paiement n'est pas disponible.");
    }

    await this.expireIfNeeded(paiement);
    if (paiement.statut === PaiementStatut.EXPIRE) {
      throw new BadRequestException(
        'Ce paiement a expiré. Recommencez depuis la page précédente.',
      );
    }
    if (paiement.statut !== PaiementStatut.EN_ATTENTE) {
      return this.toView(paiement); 
    }

    await this.repo.update(paiement.id, {
      methode:
        dto.method === 'CARD'
          ? PaiementMethode.CARTE_BANCAIRE
          : PaiementMethode.MOBILE_MONEY,
      numeroTelephone: dto.phone ?? undefined,
      metadata: { ...(paiement.metadata ?? {}), operator: dto.method ?? null },
    });

    const outcomes = {
      SUCCES: 'SUCCES',
      ECHEC: 'ECHEC',
      ANNULATION: 'ANNULE',
    } as const;

    const updated = await this.applyProviderEvent(
      {
        reference,
        status: outcomes[dto.outcome],
        amount: paiement.montant,
        providerRef: paiement.transactionId ?? undefined,
        raw: { simulated: true, outcome: dto.outcome },
      },
      'simulated',
    );

    return this.toView(updated);
  }

  async handleWebhook(
    providerName: string,
    headers: Record<string, unknown>,
    body: unknown,
  ): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) throw new NotFoundException('Fournisseur inconnu');

    if (provider.name === 'simulated' && !this.simulatorAllowed()) {
      throw new ForbiddenException("Le simulateur de paiement n'est pas disponible.");
    }

    const event = provider.parseWebhook(headers, body);
    await this.applyProviderEvent(event, provider.name);
  }

  async applyProviderEvent(
    event: ProviderEvent,
    expectedProvider?: string,
  ): Promise<Paiement> {
    const { paiement, changed } = await this.dataSource.transaction(
      async (manager) => {
        const current = await manager.findOne(Paiement, {
          where: { reference: event.reference },
          lock: { mode: 'pessimistic_write' },
        });

        if (
          !current ||
          !current.provider ||
          (expectedProvider && current.provider !== expectedProvider)
        ) {
          throw new NotFoundException('Transaction introuvable');
        }

        if (current.statut !== PaiementStatut.EN_ATTENTE) {
          return { paiement: current, changed: false };
        }

        if (event.amount !== undefined && event.amount !== current.montant) {
          this.logger.error(
            `Montant incohérent pour ${current.reference} : attendu ${current.montant}, reçu ${event.amount}`,
          );
          throw new BadRequestException('Montant incohérent');
        }

        current.statut = STATUT_BY_OUTCOME[event.status];
        current.transactionId = event.providerRef ?? current.transactionId;
        current.metadata = {
          ...(current.metadata ?? {}),
          gateway: event.raw ?? null,
        };
        if (event.status === 'SUCCES') current.datePaiement = new Date();

        await manager.save(current);
        return { paiement: current, changed: true };
      },
    );

    if (changed) {
      if (paiement.statut === PaiementStatut.VALIDE) {
        await this.fulfill(paiement);
      } else {
        const purpose = purposeOf(paiement);
        try {
          if (purpose) {
            await this.handlers.get(purpose.type)?.onPaymentFailed?.(paiement);
          }
        } catch (error: any) {
          this.logger.error(`onPaymentFailed ${paiement.reference} : ${error?.message}`);
        }
      }
    }

    return paiement;
  }

  async retryFulfillment(reference: string) {
    const paiement = await this.repo.findOne({ where: { reference } });
    if (!paiement || !paiement.provider) {
      throw new NotFoundException('Transaction introuvable');
    }
    if (paiement.statut !== PaiementStatut.VALIDE) {
      throw new BadRequestException("Ce paiement n'est pas réussi.");
    }
    if (!paiement.fulfilledAt) await this.fulfill(paiement);
    return this.toView(await this.repo.findOneByOrFail({ reference }));
  }

  private async fulfill(paiement: Paiement): Promise<void> {
    const purpose = purposeOf(paiement);
    const handler = purpose ? this.handlers.get(purpose.type) : undefined;

    if (!handler) {
      this.logger.warn(`Aucun gestionnaire pour le paiement ${paiement.reference}`);
      return;
    }

    try {
      await handler.onPaymentSucceeded(paiement);
      await this.repo.update(paiement.id, {
        fulfilledAt: new Date(),
        fulfillmentError: null,
      });
    } catch (error: any) {
      const message = String(error?.message ?? error).slice(0, 500);
      await this.repo.update(paiement.id, { fulfillmentError: message });
      this.logger.error(`Activation échouée pour ${paiement.reference} : ${message}`);
    }
  }

  private getActiveProvider(): PaymentProvider {
    const name = this.config.get<string>('PAYMENT_PROVIDER') ?? 'simulated';
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ServiceUnavailableException(`Fournisseur de paiement inconnu : ${name}`);
    }
    if (provider.name === 'simulated' && !this.simulatorAllowed()) {
      throw new ServiceUnavailableException('Aucun fournisseur de paiement configuré.');
    }
    return provider;
  }

  private simulatorAllowed(): boolean {
    return (
      process.env.NODE_ENV !== 'production' ||
      this.config.get<string>('ALLOW_PAYMENT_SIMULATOR') === 'true'
    );
  }

  private generateReference(): string {
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `PAY-${new Date().getFullYear()}-${rand}`;
  }

  private async findOwned(reference: string, requester: Requester) {
    const paiement = await this.repo.findOne({ 
      where: { reference },
      // ✅ AJOUT : On charge les relations nécessaires au contexte
      relations: {
        abonnement: { societe: true },
        reservation: { client: { user: true }, voyage: { societe: true, route: true } },
      }
    });

    if (
      !paiement ||
      !paiement.provider ||
      (requester.role !== 'ADMIN' && paiement.userId !== requester.id)
    ) {
      throw new NotFoundException('Transaction introuvable');
    }
    return paiement;
  }

  private async expireIfNeeded(paiement: Paiement): Promise<void> {
    if (
      paiement.statut === PaiementStatut.EN_ATTENTE &&
      paiement.expiresAt &&
      paiement.expiresAt.getTime() < Date.now()
    ) {
      await this.repo.update(
        { id: paiement.id, statut: PaiementStatut.EN_ATTENTE },
        { statut: PaiementStatut.EXPIRE },
      );
      paiement.statut = PaiementStatut.EXPIRE;
    }
  }

  // ✅ NOUVELLE MÉTHODE : Construit le contexte
  private buildContext(paiement: Paiement): PaymentContext | null {
    if (paiement.abonnementId && paiement.abonnement) {
      const societeName = paiement.abonnement.societe?.name ?? 'Société inconnue';
      return {
        reason: 'ABONNEMENT',
        objectName: `Abonnement ${paiement.abonnement.type || ''}`,
        objectId: paiement.abonnementId,
        senderName: societeName,
        receiverName: 'TransTrack (Plateforme)',
        receiverPhone: '+261 34 00 000 00',
      };
    }

    if (paiement.reservationId && paiement.reservation) {
      const client = paiement.reservation.client?.user;
      const voyage = paiement.reservation.voyage;
      const societe = voyage?.societe?.name ?? 'Transporteur inconnu';
      const route = voyage?.route ? `${voyage.route.depart} - ${voyage.route.arrivee}` : 'Voyage';
      
      return {
        reason: 'RESERVATION',
        objectName: route,
        objectId: paiement.reservationId,
        senderName: client ? `${client.firstName} ${client.lastName}` : 'Client',
        senderPhone: (paiement.reservation.client as any)?.phone || (client as any)?.phone || '',
        receiverName: societe,
        receiverPhone: '+261 33 00 000 00',
      };
    }
    return null;
  }

  private toView(paiement: Paiement) {
    const purpose = purposeOf(paiement);
    const expiresInSeconds =
      paiement.statut === PaiementStatut.EN_ATTENTE && paiement.expiresAt
        ? Math.max(0, Math.ceil((paiement.expiresAt.getTime() - Date.now()) / 1000))
        : 0;

    return {
      reference: paiement.reference,
      status: VIEW_STATUS[paiement.statut],
      amount: paiement.montant,
      currency: paiement.currency,
      description: paiement.notes ?? null,
      provider: paiement.provider ?? null,
      purposeType: purpose?.type ?? null,
      purposeId: purpose?.id ?? null,
      expiresAt: paiement.expiresAt ?? null,
      expiresInSeconds,
      paidAt: paiement.statut === PaiementStatut.VALIDE ? paiement.datePaiement : null,
      fulfilledAt: paiement.fulfilledAt ?? null,
      returnPath: paiement.returnPath ?? null,
      
      // ✅ AJOUT : On inclut le contexte
      context: this.buildContext(paiement),
    };
  }
}