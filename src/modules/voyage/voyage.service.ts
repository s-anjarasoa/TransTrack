import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import * as crypto from 'crypto';

import { Voyage, VoyageStatut } from '../../entities/voyage.entity';
import { VoyageStatusHistory } from '../../entities/voyage-status-history.entity';
import { Agent, AgentType } from '../../entities/agent.entity';
import { Route } from '../../entities/route.entity';
import { Vehicule } from '../../entities/vehicule.entity';
import { Tarif, TarifCategorie, TarifType } from '../../entities/tarif.entity';
import { Client } from '../../entities/client.entity';

import { CreateVoyageDto } from './dto/create-voyages.dto';
import { UpdateVoyageDto } from './dto/update-voyages.dto';
import { FilterVoyageDto } from './dto/filter-voyages.dto';
import { ChangeVoyageStatusDto } from './dto/change-voyage-status.dto';

interface RequestingUser {
  id: number;
  role: string;
}

const STATUTS_RESERVES_CHAUFFEUR: VoyageStatut[] = [
  VoyageStatut.EN_COURS,
  VoyageStatut.TERMINE,
  VoyageStatut.RETARDE,
];

const STATUTS_VERROUILLES: VoyageStatut[] = [
  VoyageStatut.TERMINE,
  VoyageStatut.ANNULE,
];

const STATUTS_ACTIFS: VoyageStatut[] = [
  VoyageStatut.PLANIFIE,
  VoyageStatut.EN_COURS,
  VoyageStatut.RETARDE,
  VoyageStatut.COMPLET,
];

@Injectable()
export class VoyageService {
  constructor(
    @InjectRepository(Voyage)
    private voyageRepository: Repository<Voyage>,

    @InjectRepository(VoyageStatusHistory)
    private historyRepository: Repository<VoyageStatusHistory>,

    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,

    @InjectRepository(Route)
    private routeRepository: Repository<Route>,

    @InjectRepository(Vehicule)
    private vehiculeRepository: Repository<Vehicule>,

    @InjectRepository(Tarif)
    private tarifRepository: Repository<Tarif>,

    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {}

  // ══════════════════════════════════════════════════════════
  // HELPERS PRIVÉS
  // ══════════════════════════════════════════════════════════

  private async resolveSocieteId(requestingUser: RequestingUser): Promise<number> {
    if (requestingUser.role === 'ADMIN') {
      throw new BadRequestException('Réservé aux Agents/Directeurs d\'une société');
    }
    const agent = await this.agentRepository.findOne({
      where: { userId: requestingUser.id },
    });
    if (!agent?.societeId) {
      throw new ForbiddenException('Vous devez être rattaché à une société pour créer un voyage');
    }
    return agent.societeId;
  }

  private generateCodeVoyage(): string {
    const year = new Date().getFullYear();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `VYG-${year}-${random}`;
  }

  private isLocked(statut: VoyageStatut): boolean {
    return STATUTS_VERROUILLES.includes(statut);
  }

  private isStatutReserveChauffeur(statut: VoyageStatut): boolean {
    return STATUTS_RESERVES_CHAUFFEUR.includes(statut);
  }

  private formatDate(d: Date | string): string {
    return new Date(d).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  /**
   * ✅ Calcule la durée réelle d'un voyage en minutes
   * Utilise les dates de départ et d'arrivée, ou fallback sur la route.
   */
  private getDureeMinutes(voyage: Voyage): number {
    if (voyage.dateDepart && voyage.dateArrivee) {
      const diff = new Date(voyage.dateArrivee).getTime() - new Date(voyage.dateDepart).getTime();
      return diff / 60000; // millisecondes vers minutes
    }
    return voyage.route?.dureeEstimee || 0;
  }

  private async findConflitVehicule(
    vehiculeId: number,
    dateDepart: Date,
    dateArrivee: Date,
    excludeVoyageId?: number,
  ): Promise<Voyage | null> {
    const qb = this.voyageRepository
      .createQueryBuilder('v')
      .where('v.vehiculeId = :vehiculeId', { vehiculeId })
      .andWhere('v.statut IN (:...statuts)', { statuts: STATUTS_ACTIFS })
      .andWhere(
        `(
          (v.dateDepart <= :dateDepart AND v.dateArrivee >= :dateDepart)
          OR (v.dateDepart <= :dateArrivee AND v.dateArrivee >= :dateArrivee)
          OR (v.dateDepart >= :dateDepart AND v.dateArrivee <= :dateArrivee)
        )`,
        { dateDepart, dateArrivee },
      );

    if (excludeVoyageId) {
      qb.andWhere('v.id != :excludeVoyageId', { excludeVoyageId });
    }
    return qb.getOne();
  }

  private async findConflitChauffeur(
    chauffeurId: number,
    dateDepart: Date,
    dateArrivee: Date,
    excludeVoyageId?: number,
  ): Promise<Voyage | null> {
    const qb = this.voyageRepository
      .createQueryBuilder('v')
      .where('v.chauffeurId = :chauffeurId', { chauffeurId })
      .andWhere('v.statut IN (:...statuts)', { statuts: STATUTS_ACTIFS })
      .andWhere(
        `(
          (v.dateDepart <= :dateDepart AND v.dateArrivee >= :dateDepart)
          OR (v.dateDepart <= :dateArrivee AND v.dateArrivee >= :dateArrivee)
          OR (v.dateDepart >= :dateDepart AND v.dateArrivee <= :dateArrivee)
        )`,
        { dateDepart, dateArrivee },
      );

    if (excludeVoyageId) {
      qb.andWhere('v.id != :excludeVoyageId', { excludeVoyageId });
    }
    return qb.getOne();
  }

  private async calculerDonneesTarification(
    mode: 'CLASSE' | 'ECONOMIE' | 'MIXTE',
    placesClasseInput: number | undefined,
    capaciteVehicule: number,
    routeId: number,
    dateDepart: Date,
    existingPlacesClasse?: number,
  ) {
    const appliquerTarif = (tarif: Tarif) => {
      let p = Number(tarif.prix);
      if (tarif.type === TarifType.PROMOTION && tarif.prixPromo && tarif.dateDebut && tarif.dateFin) {
        const debut = new Date(tarif.dateDebut);
        const fin = new Date(tarif.dateFin);
        fin.setHours(23, 59, 59, 999);
        if (dateDepart >= debut && dateDepart <= fin) {
          p = Number(tarif.prixPromo);
        }
      }
      return p;
    };

    if (mode === 'CLASSE') {
      const tarif = await this.tarifRepository.findOne({ 
        where: { routeId, categorie: TarifCategorie.CLASSE, isActif: true }
      });
      if (!tarif) throw new BadRequestException('Aucun tarif CLASSE actif pour cette route');
      
      const prix = appliquerTarif(tarif);
      return {
        prix,
        prixClasse: prix,
        prixEconomie: undefined,
        placesTotales: capaciteVehicule,
        placesDisponibles: capaciteVehicule,
        placesClasseTotales: capaciteVehicule,
        placesClasseDisponibles: capaciteVehicule,
        placesEconomieTotales: 0,
        placesEconomieDisponibles: 0,
      };

    } else if (mode === 'ECONOMIE') {
      const tarif = await this.tarifRepository.findOne({ 
        where: { routeId, categorie: TarifCategorie.ECONOMIE, isActif: true }
      });
      if (!tarif) throw new BadRequestException('Aucun tarif ECONOMIE actif pour cette route');

      const prix = appliquerTarif(tarif);
      return {
        prix,
        prixClasse: undefined,
        prixEconomie: prix,
        placesTotales: capaciteVehicule,
        placesDisponibles: capaciteVehicule,
        placesClasseTotales: 0,
        placesClasseDisponibles: 0,
        placesEconomieTotales: capaciteVehicule,
        placesEconomieDisponibles: capaciteVehicule,
      };

    } else {
      const tarifClasse = await this.tarifRepository.findOne({ 
        where: { routeId, categorie: TarifCategorie.CLASSE, isActif: true }
      });
      const tarifEco = await this.tarifRepository.findOne({ 
        where: { routeId, categorie: TarifCategorie.ECONOMIE, isActif: true }
      });
      if (!tarifClasse || !tarifEco) {
        throw new BadRequestException('Il manque le tarif CLASSE ou ECONOMIE pour ce mode mixte');
      }

      const placesClasseFinal = placesClasseInput ?? existingPlacesClasse ?? Math.floor(capaciteVehicule * 0.3);
      if (placesClasseFinal > capaciteVehicule) {
        throw new BadRequestException('Le nombre de places Classe dépasse la capacité du véhicule');
      }
      const placesEco = capaciteVehicule - placesClasseFinal;

      const prixEco = appliquerTarif(tarifEco);
      return {
        prix: prixEco,
        prixClasse: appliquerTarif(tarifClasse),
        prixEconomie: prixEco,
        placesTotales: capaciteVehicule,
        placesDisponibles: capaciteVehicule,
        placesClasseTotales: placesClasseFinal,
        placesClasseDisponibles: placesClasseFinal,
        placesEconomieTotales: placesEco,
        placesEconomieDisponibles: placesEco,
      };
    }
  }

  // ══════════════════════════════════════════════════════════
  // CRÉATION
  // ══════════════════════════════════════════════════════════

  async create(dto: CreateVoyageDto, requestingUser: RequestingUser): Promise<Voyage> {
    const societeId = await this.resolveSocieteId(requestingUser);

    const { dateDepart: strDateDepart, dateArrivee: strDateArrivee, placesClasse, modeTarification, ...restDto } = dto;
    const dateDepart = new Date(strDateDepart);
    const dateArrivee = new Date(strDateArrivee);

    if (dateArrivee <= dateDepart) {
      throw new BadRequestException('La date d\'arrivée doit être postérieure à la date de départ');
    }

    const route = await this.routeRepository.findOne({
      where: { id: dto.routeId },
      relations: { moyenTrans: true },
    });
    if (!route) throw new NotFoundException('Route introuvable');
    if (route.moyenTrans.societeId !== societeId) {
      throw new ForbiddenException('Cette route n\'appartient pas à votre société');
    }

    const vehicule = await this.vehiculeRepository.findOne({ where: { id: dto.vehiculeId } });
    if (!vehicule) throw new NotFoundException('Véhicule introuvable');
    if (vehicule.societeId !== societeId) {
      throw new ForbiddenException('Ce véhicule n\'appartient pas à votre société');
    }
    if (vehicule.moyenTransId !== route.moyenTransId) {
      throw new BadRequestException('Ce véhicule ne correspond pas au moyen de transport de la route choisie');
    }

    const conflitVehicule = await this.findConflitVehicule(dto.vehiculeId, dateDepart, dateArrivee);
    if (conflitVehicule) {
      throw new BadRequestException(`Ce véhicule est déjà affecté au voyage "${conflitVehicule.codeVoyage}"`);
    }

    if (dto.chauffeurId) {
      const chauffeur = await this.agentRepository.findOne({ where: { id: dto.chauffeurId } });
      if (!chauffeur) throw new NotFoundException('Chauffeur introuvable');
      if (chauffeur.societeId !== societeId) throw new ForbiddenException('Chauffeur hors société');
      if (chauffeur.type !== AgentType.CHAUFFEUR) throw new BadRequestException('L\'agent n\'est pas un chauffeur');

      const conflitChauffeur = await this.findConflitChauffeur(dto.chauffeurId, dateDepart, dateArrivee);
      if (conflitChauffeur) {
        throw new BadRequestException(`Ce chauffeur est déjà assigné au voyage "${conflitChauffeur.codeVoyage}"`);
      }
    }

    const tarification = await this.calculerDonneesTarification(
      modeTarification,
      placesClasse,
      vehicule.capacite,
      dto.routeId,
      dateDepart,
    );

    const voyageData: Partial<Voyage> = {
      ...restDto,
      dateDepart,
      dateArrivee,
      societeId,
      codeVoyage: this.generateCodeVoyage(),
      statut: VoyageStatut.PLANIFIE,
      ...tarification,
    };

    const voyage = this.voyageRepository.create(voyageData);
    const saved = await this.voyageRepository.save(voyage);

    const agent = await this.agentRepository.findOne({ where: { userId: requestingUser.id } });
    await this.historyRepository.save({
      voyageId: saved.id,
      ancienStatut: null,
      nouveauStatut: VoyageStatut.PLANIFIE,
      motif: 'Création du voyage',
      agentId: agent?.id ?? null,
    });

    return this.findOne(saved.id);
  }

  // ══════════════════════════════════════════════════════════
  // LECTURE AVEC TRI IA
  // ══════════════════════════════════════════════════════════

  async findAll(filter: FilterVoyageDto, requestingUser: RequestingUser) {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;
    const where: any = {};

    if (requestingUser.role !== 'ADMIN' && requestingUser.role !== 'PUBLIC') {
      const agent = await this.agentRepository.findOne({ where: { userId: requestingUser.id } });
      if (!agent?.societeId) return { data: [], total: 0, page, limit };
      where.societeId = agent.societeId;
    } else if (requestingUser.role === 'ADMIN' && filter.societeId) {
      where.societeId = filter.societeId;
    }

    if (filter.statut) where.statut = filter.statut;
    if (filter.routeId) where.routeId = filter.routeId;
    if (filter.vehiculeId) where.vehiculeId = filter.vehiculeId;
    if (filter.placesMin) where.placesDisponibles = MoreThanOrEqual(filter.placesMin);
    if (filter.fromDate && filter.toDate) {
      where.dateDepart = Between(new Date(filter.fromDate), new Date(filter.toDate));
    }

    let [rawData] = await this.voyageRepository.findAndCount({
      where,
      relations: { route: true, vehicule: true, chauffeur: { user: true }, societe: true },
      order: { dateDepart: 'ASC' },
    });

    rawData = rawData.filter((v) => {
      if (filter.depart && !v.route?.depart?.toLowerCase().includes(filter.depart.toLowerCase())) return false;
      if (filter.arrivee && !v.route?.arrivee?.toLowerCase().includes(filter.arrivee.toLowerCase())) return false;
      return true;
    });

    // ✅ APPLICATION DE L'IA (RECHERCHE PERSONNALISÉE)
    if (requestingUser.role === 'CLIENT' && rawData.length > 0) {
      const client = await this.clientRepository.findOne({ where: { userId: requestingUser.id } });
      
      if (client && client.preferences) {
        const weights = client.preferences;

        // a. Trouver les valeurs max pour normaliser
        const maxPrice = Math.max(...rawData.map(v => Number(v.prix)), 1);
        const maxDist = Math.max(...rawData.map(v => v.route?.distance || 0), 1);
        // ✅ Utilisation de la méthode utilitaire pour la durée
        const maxDur = Math.max(...rawData.map(v => this.getDureeMinutes(v)), 1);

        // b. Calculer le score IA
        rawData.forEach(voyage => {
          const notePrix = 1 - (Number(voyage.prix) / maxPrice);
          const noteDistance = 1 - ((voyage.route?.distance || 0) / maxDist);
          // ✅ Utilisation de la méthode utilitaire pour la durée
          const noteDuree = 1 - (this.getDureeMinutes(voyage) / maxDur);

          const iaScore = 
            (weights.price * notePrix) + 
            (weights.distance * noteDistance) + 
            (weights.duration * noteDuree);

          (voyage as any).iaScore = iaScore;
        });

        rawData.sort((a, b) => (b as any).iaScore - (a as any).iaScore);
      }
    }

    const total = rawData.length;
    const paginatedData = rawData.slice((page - 1) * limit, page * limit);

    return { 
      data: paginatedData, 
      total, 
      page, 
      limit 
    };
  }

  async findOne(id: number): Promise<Voyage> {
    const voyage = await this.voyageRepository.findOne({
      where: { id },
      relations: {
        route: { moyenTrans: true },
        vehicule: true,
        chauffeur: { user: true },
        societe: true,
        reservations: true,
        statusHistory: { agent: { user: true } },
      },
      order: { statusHistory: { createdAt: 'DESC' } },
    });
    if (!voyage) throw new NotFoundException(`Voyage avec l'ID ${id} non trouvé`);
    return voyage;
  }

  private async assertOwnership(id: number, requestingUser: RequestingUser): Promise<Voyage> {
    const voyage = await this.findOne(id);
    if (requestingUser.role === 'ADMIN') return voyage;
    
    const agent = await this.agentRepository.findOne({ where: { userId: requestingUser.id } });
    if (!agent || agent.societeId !== voyage.societeId) {
      throw new ForbiddenException('Ce voyage n\'appartient pas à votre société');
    }
    return voyage;
  }

  // ══════════════════════════════════════════════════════════
  // MISE À JOUR
  // ══════════════════════════════════════════════════════════

  async update(id: number, dto: UpdateVoyageDto, requestingUser: RequestingUser): Promise<Voyage> {
    const voyage = await this.assertOwnership(id, requestingUser);

    if (this.isLocked(voyage.statut)) {
      throw new BadRequestException(
        `Impossible de modifier un voyage ${voyage.statut === VoyageStatut.TERMINE ? 'terminé' : 'annulé'}`,
      );
    }

    const { modeTarification, placesClasse, vehiculeId, routeId, dateDepart, dateArrivee, chauffeurId, notes, retardMinutes } = dto;

    const oldDateDepart = new Date(voyage.dateDepart);
    const oldVehiculeId = voyage.vehiculeId;
    const oldRouteId = voyage.routeId;

    const newDateDepart = dateDepart ? new Date(dateDepart) : new Date(voyage.dateDepart);
    const newDateArrivee = dateArrivee ? new Date(dateArrivee) : new Date(voyage.dateArrivee);

    if (routeId && routeId !== voyage.routeId) {
      const route = await this.routeRepository.findOne({
        where: { id: routeId },
        relations: { moyenTrans: true },
      });
      if (!route) throw new NotFoundException('Route introuvable');
      if (route.moyenTrans.societeId !== voyage.societeId) {
        throw new ForbiddenException('Cette route n\'appartient pas à votre société');
      }
      voyage.routeId = route.id;
      voyage.route = route;
    }

    let capaciteVehicule = voyage.placesTotales;
    if (vehiculeId && vehiculeId !== voyage.vehiculeId) {
      const vehicule = await this.vehiculeRepository.findOne({ where: { id: vehiculeId } });
      if (!vehicule) throw new NotFoundException('Véhicule introuvable');
      if (vehicule.societeId !== voyage.societeId) {
        throw new ForbiddenException('Ce véhicule n\'appartient pas à votre société');
      }
      if (vehicule.moyenTransId !== voyage.route.moyenTransId) {
        throw new BadRequestException('Ce véhicule ne correspond pas au moyen de transport de la route');
      }

      const conflitVehicule = await this.findConflitVehicule(vehiculeId, newDateDepart, newDateArrivee, id);
      if (conflitVehicule) {
        throw new BadRequestException(`Ce véhicule est déjà affecté au voyage "${conflitVehicule.codeVoyage}"`);
      }

      capaciteVehicule = vehicule.capacite;
      voyage.vehiculeId = vehicule.id;
      voyage.vehicule = vehicule;
    }

    if (chauffeurId !== undefined) {
      if (chauffeurId === null) {
        voyage.chauffeurId = undefined;
      } else if (chauffeurId !== voyage.chauffeurId) {
        const conflitChauffeur = await this.findConflitChauffeur(chauffeurId, newDateDepart, newDateArrivee, id);
        if (conflitChauffeur) {
          throw new BadRequestException(
            `Ce chauffeur est déjà assigné au voyage "${conflitChauffeur.codeVoyage}" ` +
              `du ${this.formatDate(conflitChauffeur.dateDepart)} au ${this.formatDate(conflitChauffeur.dateArrivee)}`,
          );
        }
        voyage.chauffeurId = chauffeurId;
      }
    }

    voyage.dateDepart = newDateDepart;
    voyage.dateArrivee = newDateArrivee;
    if (notes !== undefined) voyage.notes = notes;
    if (retardMinutes !== undefined) voyage.retardMinutes = retardMinutes;

    const isDateChanged = newDateDepart.getTime() !== oldDateDepart.getTime();
    const isVehiculeChanged = voyage.vehiculeId !== oldVehiculeId;
    const isRouteChanged = voyage.routeId !== oldRouteId;

    if (modeTarification || isDateChanged || isVehiculeChanged || isRouteChanged) {
      let effectiveMode = modeTarification;
      if (!effectiveMode) {
        if (voyage.placesClasseTotales > 0 && voyage.placesEconomieTotales === 0) effectiveMode = 'CLASSE';
        else if (voyage.placesEconomieTotales > 0 && voyage.placesClasseTotales === 0) effectiveMode = 'ECONOMIE';
        else effectiveMode = 'MIXTE';
      }

      const tarification = await this.calculerDonneesTarification(
        effectiveMode,
        placesClasse,
        capaciteVehicule,
        voyage.routeId,
        newDateDepart,
        voyage.placesClasseTotales,
      );

      Object.assign(voyage, tarification);
    }

    const saved = await this.voyageRepository.save(voyage);

    const agent = await this.agentRepository.findOne({ where: { userId: requestingUser.id } });
    await this.historyRepository.save({
      voyageId: id,
      ancienStatut: voyage.statut,
      nouveauStatut: voyage.statut,
      motif: 'Modification du voyage',
      agentId: agent?.id ?? null,
    });

    return this.findOne(saved.id);
  }

  // ══════════════════════════════════════════════════════════
  // CHANGEMENT DE STATUT
  // ══════════════════════════════════════════════════════════

  async changeStatus(id: number, dto: ChangeVoyageStatusDto, requestingUser: RequestingUser): Promise<Voyage> {
    const voyage = await this.assertOwnership(id, requestingUser);

    if (this.isLocked(voyage.statut)) {
      throw new BadRequestException(`Impossible de modifier le statut d'un voyage ${voyage.statut === VoyageStatut.TERMINE ? 'terminé' : 'annulé'}`);
    }

    if (this.isStatutReserveChauffeur(dto.statut)) {
      const agent = await this.agentRepository.findOne({ where: { userId: requestingUser.id } });
      if (!agent) throw new ForbiddenException('Profil agent introuvable');
      if (voyage.chauffeurId !== agent.id) {
        throw new ForbiddenException('Seul le chauffeur assigné peut effectuer cette action');
      }
    }

    if ((dto.statut === VoyageStatut.ANNULE || dto.statut === VoyageStatut.RETARDE) && !dto.motifAnnulation) {
      throw new BadRequestException(dto.statut === VoyageStatut.RETARDE ? 'Un motif de retard est requis' : 'Un motif d\'annulation est requis');
    }

    if (dto.statut === VoyageStatut.RETARDE && (!dto.retardMinutes || dto.retardMinutes <= 0)) {
      throw new BadRequestException('La durée du retard (en minutes) est requise');
    }

    const ancienStatut = voyage.statut;
    const update: Partial<Voyage> = { statut: dto.statut };

    if (dto.statut === VoyageStatut.ANNULE) update.motifAnnulation = dto.motifAnnulation;
    if (dto.statut === VoyageStatut.RETARDE) update.retardMinutes = dto.retardMinutes;
    if (dto.statut === VoyageStatut.TERMINE) update.retardMinutes = 0;

    await this.voyageRepository.update(id, update);

    const agent = await this.agentRepository.findOne({ where: { userId: requestingUser.id } });
    await this.historyRepository.save({
      voyageId: id,
      ancienStatut,
      nouveauStatut: dto.statut,
      motif: dto.motifAnnulation ?? null,
      agentId: agent?.id ?? null,
    });

    return this.findOne(id);
  }

  // ══════════════════════════════════════════════════════════
  // SUPPRESSION
  // ══════════════════════════════════════════════════════════

  async remove(id: number, requestingUser: RequestingUser): Promise<void> {
    const voyage = await this.assertOwnership(id, requestingUser);

    if (this.isLocked(voyage.statut)) {
      throw new BadRequestException(`Impossible de supprimer un voyage ${voyage.statut === VoyageStatut.TERMINE ? 'terminé' : 'annulé'}`);
    }
    if (voyage.statut === VoyageStatut.EN_COURS) {
      throw new BadRequestException('Impossible de supprimer un voyage en cours — terminez-le ou annulez-le');
    }
    if (voyage.reservations?.length > 0) {
      throw new BadRequestException('Impossible de supprimer un voyage ayant des réservations — annulez-le plutôt');
    }

    await this.voyageRepository.delete(id);
  }

  // ══════════════════════════════════════════════════════════
  // GESTION DES PLACES
  // ══════════════════════════════════════════════════════════

  async decrementPlaces(voyageId: number, nbPlaces: number): Promise<Voyage> {
    const voyage = await this.findOne(voyageId);
    if (voyage.placesDisponibles < nbPlaces) {
      throw new BadRequestException(`Places insuffisantes (disponibles: ${voyage.placesDisponibles}, demandées: ${nbPlaces})`);
    }
    
    voyage.placesDisponibles -= nbPlaces;
    if (voyage.placesDisponibles === 0 && voyage.statut === VoyageStatut.PLANIFIE) {
      voyage.statut = VoyageStatut.COMPLET;
    }
    return this.voyageRepository.save(voyage);
  }

  async incrementPlaces(voyageId: number, nbPlaces: number): Promise<Voyage> {
    const voyage = await this.findOne(voyageId);
    const newDispo = voyage.placesDisponibles + nbPlaces;
    
    if (newDispo > voyage.placesTotales) {
      throw new BadRequestException('Incohérence : places disponibles > places totales');
    }
    
    voyage.placesDisponibles = newDispo;
    if (voyage.statut === VoyageStatut.COMPLET && newDispo > 0) {
      voyage.statut = VoyageStatut.PLANIFIE;
    }
    return this.voyageRepository.save(voyage);
  }
}