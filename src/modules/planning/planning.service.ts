import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
import { Voyage, VoyageStatut } from '../../entities/voyage.entity';
import { Vehicule, VehiculeStatut } from '../../entities/vehicule.entity';
import { Agent, AgentType } from '../../entities/agent.entity';

export interface PlanningProposal {
  voyageId: number;
  voyageCode: string;
  depart: string;
  arrivee: string;
  requiredSeats: number;
  currentVehiculeId?: number;
  currentVehiculeName?: string;
  proposedVehiculeId?: number;
  proposedVehiculeName?: string;
  status: 'OPTIMAL' | 'CHANGED' | 'CONFLICT' | 'NO_VEHICULE';
  message?: string;
}

@Injectable()
export class PlanningService {
  private readonly logger = new Logger(PlanningService.name);

  constructor(
    @InjectRepository(Voyage) private voyageRepo: Repository<Voyage>,
    @InjectRepository(Vehicule) private vehiculeRepo: Repository<Vehicule>,
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
  ) {}

  private isOverlapping(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && end1 > start2;
  }

  async optimize(companyId: number, date: string): Promise<PlanningProposal[]> {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // 1. Récupérer les voyages du jour (non annulés)
    const voyages = await this.voyageRepo.find({
      where: {
        societeId: companyId,
        dateDepart: Between(startOfDay, endOfDay),
        statut: Not(VoyageStatut.ANNULE),
      },
      relations: { vehicule: true, route: true },
      order: { dateDepart: 'ASC' },
    });

    // 2. Récupérer les véhicules disponibles de la société
    const vehicules = await this.vehiculeRepo.find({
      where: { societeId: companyId, statut: VehiculeStatut.DISPONIBLE },
      order: { capacite: 'ASC' }, // FFD : On trie du plus petit au plus grand
    });

    if (vehicules.length === 0) return [];

    // 3. Calculer les besoins (Tri FFD : du plus grand besoin au plus petit)
    const tripsWithNeeds = voyages.map(v => ({
      voyage: v,
      needed: v.placesTotales - v.placesDisponibles, // Places déjà réservées
    })).sort((a, b) => b.needed - a.needed);

    const proposals: PlanningProposal[] = [];
    const assignmentMap = new Map<number, Voyage[]>(); // vehiculeId -> liste des voyages assignés

    // 4. Algorithme First Fit Decreasing
    for (const trip of tripsWithNeeds) {
      const v = trip.voyage;
      const needed = trip.needed;

      // Si le voyage a déjà un véhicule et qu'il est assez grand, on le garde
      if (v.vehiculeId && v.vehicule && v.vehicule.capacite >= needed) {
        if (!assignmentMap.has(v.vehiculeId)) assignmentMap.set(v.vehiculeId, []);
        assignmentMap.get(v.vehiculeId)!.push(v);
        
        proposals.push({
          voyageId: v.id, voyageCode: v.codeVoyage,
          depart: v.route.depart, arrivee: v.route.arrivee,
          requiredSeats: needed,
          currentVehiculeId: v.vehiculeId,
          currentVehiculeName: `${v.vehicule.marque} (${v.vehicule.capacite} pl.)`,
          proposedVehiculeId: v.vehiculeId,
          proposedVehiculeName: `${v.vehicule.marque} (${v.vehicule.capacite} pl.)`,
          status: 'OPTIMAL',
          message: 'Véhicule actuel conservé.',
        });
        continue;
      }

      // Chercher un véhicule adapté
      let assigned = false;
      for (const veh of vehicules) {
        if (veh.capacite < needed) continue; // Trop petit

        // Vérifier les conflits d'horaires
        const existing = assignmentMap.get(veh.id) ?? [];
        const hasConflict = existing.some(t => 
          this.isOverlapping(new Date(v.dateDepart), new Date(v.dateArrivee), new Date(t.dateDepart), new Date(t.dateArrivee))
        );

        if (!hasConflict) {
          if (!assignmentMap.has(veh.id)) assignmentMap.set(veh.id, []);
          assignmentMap.get(veh.id)!.push(v);
          
          proposals.push({
            voyageId: v.id, voyageCode: v.codeVoyage,
            depart: v.route.depart, arrivee: v.route.arrivee,
            requiredSeats: needed,
            currentVehiculeId: v.vehiculeId,
            currentVehiculeName: v.vehicule ? `${v.vehicule.marque} (${v.vehicule.capacite} pl.)` : 'Aucun',
            proposedVehiculeId: veh.id,
            proposedVehiculeName: `${veh.marque} (${veh.capacite} pl.)`,
            status: v.vehiculeId === veh.id ? 'OPTIMAL' : 'CHANGED',
            message: v.vehiculeId === veh.id ? 'Déjà bien assigné.' : 'Nouveau véhicule optimal trouvé.'
          });
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        proposals.push({
          voyageId: v.id, voyageCode: v.codeVoyage,
          depart: v.route.depart, arrivee: v.route.arrivee,
          requiredSeats: needed,
          currentVehiculeId: v.vehiculeId,
          currentVehiculeName: v.vehicule ? `${v.vehicule.marque}` : 'Aucun',
          status: 'CONFLICT',
          message: `Aucun véhicule disponible de ${needed} places sur ce créneau.`
        });
      }
    }

    return proposals;
  }

  async apply(proposals: PlanningProposal[]) {
    let updated = 0;
    for (const p of proposals) {
      if (p.status === 'CHANGED' && p.proposedVehiculeId) {
        await this.voyageRepo.update(p.voyageId, { vehiculeId: p.proposedVehiculeId });
        updated++;
      }
    }
    return { updated };
  }
}