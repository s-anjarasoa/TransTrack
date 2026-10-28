import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';

import {
  ABONNEMENT_TARIFS,
  Abonnement,
  AbonnementType,
} from '../../entities/abonnement.entity';
import { Agent, AgentType } from '../../entities/agent.entity';
import { Societe, SocieteStatut } from '../../entities/societe.entity';
import { AgentStatus, Status } from '../../entities/status.entity';
import { User } from '../../entities/user.entity';
import { Paiement } from '../../entities/paiement.entity';
import { PaymentPurpose } from '../payements/payment-provider.interface';
import { PaymentService } from '../payements/payements.service';
import { SubscribeDto } from './dto/subscribe.dto';

type Requester = { id: number; role: string };

const PLAN_LABELS: Record<AbonnementType, { label: string; duration: string }> = {
  [AbonnementType.MENSUEL]: { label: 'Mensuel', duration: '1 mois' },
  [AbonnementType.ANNUELLE]: { label: 'Annuel', duration: '12 mois' },
};

// ---------- Dates (UTC, au jour près) ----------
function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const day = d.getUTCDate();
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const lastDay = new Date(
    Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0),
  ).getUTCDate();
  r.setUTCDate(Math.min(day, lastDay));
  return r;
}

@Injectable()
export class AbonnementsService implements OnModuleInit {
  private readonly logger = new Logger(AbonnementsService.name);

  constructor(
    @InjectRepository(Abonnement) private abonnementRepo: Repository<Abonnement>,
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
    @InjectRepository(Societe) private societeRepo: Repository<Societe>,
    private gateway: PaymentService,
  ) {}

  onModuleInit(): void {
    this.gateway.registerHandler(PaymentPurpose.ABONNEMENT, {
      onPaymentSucceeded: (paiement) => this.activate(paiement),
    });
  }

  // ============================================================
  // ✅ NOUVELLE MÉTHODE : Liste des abonnements (paginée et filtrée)
  // ============================================================
  async findAll(
    query: { isActif?: string | boolean; limit?: number; page?: number },
    requester: Requester,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const where: any = {};

    if (query.isActif !== undefined) {
      where.isActif = query.isActif === 'true' || query.isActif === true;
    }

    if (requester.role !== 'ADMIN') {
      const agent = await this.agentRepo.findOne({ where: { userId: requester.id } });
      if (agent?.societeId) {
        where.societeId = agent.societeId;
      } else {
        return { data: [], total: 0, page, limit };
      }
    }

    const [data, total] = await this.abonnementRepo.findAndCount({
      where,
      // ✅ On charge la société ET son directeur ET le user du directeur
      relations: { 
        societe: { 
          directeur: { 
            user: true 
          } 
        } 
      }, 
      order: { id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  // ============================================================
  // OFFRES
  // ============================================================
  getPlans() {
    return Object.values(AbonnementType).map((type) => ({
      type,
      label: PLAN_LABELS[type].label,
      duration: PLAN_LABELS[type].duration,
      price: ABONNEMENT_TARIFS[type],
    }));
  }

  // ============================================================
  // ÉTAT DE L'ABONNEMENT
  // ============================================================
  async getStatus(requester: Requester, societeIdFromQuery?: number) {
    const societeId = await this.resolveSocieteIdForRead(
      requester,
      societeIdFromQuery,
    );

    const abonnements = await this.abonnementRepo.find({
      where: { societeId, isActif: true },
      order: { dateFin: 'DESC' },
    });

    const today = startOfUtcDay(new Date()).getTime();
    const day = (d: Date) => startOfUtcDay(new Date(d)).getTime();

    const current = abonnements.find(
      (a) => a.dateDebut && a.dateFin && day(a.dateDebut) <= today && day(a.dateFin) >= today,
    );
    const latest = abonnements[0];

    let etat: 'ACTIF' | 'EXPIRE_BIENTOT' | 'EXPIRE' | 'AUCUN';
    let joursRestants = 0;

    if (current && current.dateFin) {
      joursRestants = Math.round((day(current.dateFin) - today) / 86_400_000);
      etat = joursRestants <= 7 ? 'EXPIRE_BIENTOT' : 'ACTIF';
    } else {
      etat = latest ? 'EXPIRE' : 'AUCUN';
    }

    return {
      societeId,
      etat,
      visible: !!current,
      dateFin: (current ?? latest)?.dateFin ?? null,
      joursRestants,
    };
  }

  // ============================================================
  // SOUSCRIRE
  // ============================================================
  async subscribe(requester: Requester, dto: SubscribeDto) {
    const societeId = await this.resolveSocieteId(requester, dto.societeId);
    await this.assertSocieteCanSubscribe(societeId);

    let abonnement = await this.abonnementRepo.findOne({
      where: { societeId, type: dto.type, isActif: false, dateDebut: IsNull() },
    });

    if (!abonnement) {
      abonnement = await this.abonnementRepo.save(
        this.abonnementRepo.create({ societeId, type: dto.type, isActif: false }),
      );
    }

    return this.startPayment(abonnement, requester);
  }

  // ============================================================
  // RÉESSAYER LE PAIEMENT
  // ============================================================
  async payExisting(abonnementId: number, requester: Requester) {
    const abonnement = await this.abonnementRepo.findOne({
      where: { id: abonnementId },
    });
    if (!abonnement) throw new NotFoundException('Abonnement introuvable');

    await this.assertCanPay(requester, abonnement.societeId);
    await this.assertSocieteCanSubscribe(abonnement.societeId);

    if (abonnement.isActif || abonnement.dateDebut) {
      throw new BadRequestException('Cet abonnement est déjà payé.');
    }

    return this.startPayment(abonnement, requester);
  }

  private async startPayment(abonnement: Abonnement, requester: Requester) {
    const plan = PLAN_LABELS[abonnement.type];

    const checkout = await this.gateway.createCheckout({
      purposeType: PaymentPurpose.ABONNEMENT,
      purposeId: abonnement.id,
      userId: requester.id,
      amount: ABONNEMENT_TARIFS[abonnement.type],
      description: `Abonnement TransTrack ${plan.label.toLowerCase()}`,
      returnPath: '/abonnements',
    });

    return { abonnementId: abonnement.id, ...checkout };
  }

  // ============================================================
  // ACTIVATION
  // ============================================================
  private async activate(paiement: Paiement): Promise<void> {
    if (!paiement.abonnementId) return;
    const abonnementId = paiement.abonnementId;

    await this.abonnementRepo.manager.transaction(async (manager) => {
      const abonnement = await manager.findOne(Abonnement, {
        where: { id: abonnementId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!abonnement) {
        throw new Error(`Abonnement ${abonnementId} introuvable`);
      }

      if (abonnement.dateDebut) return;

      const current = await manager
        .createQueryBuilder(Abonnement, 'a')
        .where('a.societeId = :societeId', { societeId: abonnement.societeId })
        .andWhere('a.isActif = true')
        .andWhere('a.id != :id', { id: abonnement.id })
        .orderBy('a.dateFin', 'DESC')
        .limit(1)
        .getOne();

      const today = startOfUtcDay(new Date());
      let start = today;
      if (current?.dateFin) {
        const currentEnd = startOfUtcDay(new Date(current.dateFin));
        if (currentEnd.getTime() >= today.getTime()) {
          start = addDays(currentEnd, 1);
        }
      }

      const months = abonnement.type === AbonnementType.ANNUELLE ? 12 : 1;
      abonnement.dateDebut = start;
      abonnement.dateFin = addDays(addMonths(start, months), -1);
      abonnement.isActif = true;

      await manager.save(abonnement);

      await this.activateSociete(manager, abonnement.societeId, paiement);

      this.logger.log(
        `Abonnement ${abonnement.id} (société ${abonnement.societeId}) activé du ` +
          `${start.toISOString().slice(0, 10)} au ${abonnement.dateFin.toISOString().slice(0, 10)}`,
      );
    });
  }

  private async activateSociete(
    manager: EntityManager,
    societeId: number,
    paiement: Paiement,
  ): Promise<void> {
    const societe = await manager.findOne(Societe, { where: { id: societeId } });
    if (!societe) return;

    if (societe.statut === SocieteStatut.REJETEE) {
      this.logger.warn(
        `Paiement ${paiement.reference} reçu pour la société rejetée ${societeId} : statut inchangé`,
      );
      return;
    }
    if (societe.statut === SocieteStatut.VALIDEE) return;

    await manager.update(Societe, societeId, { statut: SocieteStatut.VALIDEE });

    const directeur = await manager.findOne(Agent, {
      where: { id: societe.directeurId },
    });
    if (directeur && directeur.status !== AgentStatus.VALIDE) {
      await manager.update(Agent, directeur.id, { status: AgentStatus.VALIDE });
      await manager.update(User, directeur.userId, { isActive: true });
      await manager.save(Status, {
        agentId: directeur.id,
        status: AgentStatus.VALIDE,
        isActive: true,
        changedByUserId: paiement.userId ?? directeur.userId,
        reason: "Société activée par le paiement de l'abonnement",
      });
    }

    this.logger.log(`Société ${societeId} → VALIDEE (paiement ${paiement.reference})`);
  }

  // ============================================================
  // AUTORISATIONS
  // ============================================================
  private async resolveSocieteId(
    requester: Requester,
    societeIdFromBody?: number,
  ): Promise<number> {
    if (requester.role === 'ADMIN') {
      if (!societeIdFromBody) {
        throw new BadRequestException('societeId est requis pour un administrateur.');
      }
      return societeIdFromBody;
    }

    const me = await this.getDirecteur(requester);
    return me.societeId as number;
  }

  private async assertCanPay(requester: Requester, societeId: number): Promise<void> {
    if (requester.role === 'ADMIN') return;
    const me = await this.getDirecteur(requester);
    if (me.societeId !== societeId) {
      throw new ForbiddenException('Cet abonnement ne concerne pas votre société.');
    }
  }

  private async resolveSocieteIdForRead(
    requester: Requester,
    societeIdFromQuery?: number,
  ): Promise<number> {
    if (requester.role === 'ADMIN') {
      if (!societeIdFromQuery) {
        throw new BadRequestException('societeId est requis pour un administrateur.');
      }
      return societeIdFromQuery;
    }

    const me = await this.agentRepo.findOne({ where: { userId: requester.id } });
    if (!me || me.status !== AgentStatus.VALIDE || !me.societeId) {
      throw new ForbiddenException('Accès refusé.');
    }
    return me.societeId;
  }

  private async getDirecteur(requester: Requester): Promise<Agent> {
    const me = await this.agentRepo.findOne({ where: { userId: requester.id } });

    if (!me) {
      throw new ForbiddenException("Aucun profil agent n'est associé à votre compte.");
    }
    if (me.type !== AgentType.DIRECTEUR) {
      throw new ForbiddenException(
        'Seul le Directeur de la société peut souscrire un abonnement.',
      );
    }
    if (!me.societeId) {
      throw new ForbiddenException(
        "Créez d'abord votre société avant de souscrire un abonnement.",
      );
    }
    return me;
  }

  private async assertSocieteCanSubscribe(societeId: number): Promise<void> {
    const societe = await this.societeRepo.findOne({ where: { id: societeId } });
    if (!societe) throw new NotFoundException('Société introuvable.');

    if (societe.statut === SocieteStatut.REJETEE) {
      throw new ForbiddenException(
        "Votre société a été rejetée par un administrateur : elle ne peut pas souscrire d'abonnement.",
      );
    }
  }
}