import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api';
import { AuthService } from '../../../core/auth/auth';
import { AgentProfileService } from '../../../core/services/agent-profile';
import { Agent, AgentStatus, AgentType } from '../../../core/models/agent.model';
import { Societe } from '../../../core/models/societe.model';
import { Abonnement } from '../../../core/models/abonnement.model';
import { Voyage } from '../../../core/models/voyage.model';
import { Reservation } from '../../../core/models/reservation.model';
import { Vehicule } from '../../../core/models/vehicule.model';
import { Route } from '../../../core/models/route.model';

import { BarChart, BarChartItem } from '../../../shared/components/chart/bar-chart/bar-chart';
import { PieChart, PieChartItem } from '../../../shared/components/chart/pie-chart/pie-chart';
import { ProgressList, ProgressItem } from '../../../shared/components/chart/progress-list/progress-list';
import { AgentTypeLabelPipe } from '../../../shared/pipes/agent-type-label-pipe';

interface Paginated<T> { data: T[]; total: number; }
const emptyPage = <T>(): Paginated<T> => ({ data: [], total: 0 });

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [
    RouterLink, 
    BarChart, 
    PieChart, 
    ProgressList, 
    AgentTypeLabelPipe, 
    DatePipe, 
    DecimalPipe, 
    MatIconModule
  ],
  templateUrl: './agent-dashboard.html',
  styleUrl: './agent-dashboard.css',
})
export class AgentDashboard implements OnInit {
  // ═══════════════════════════════════════════════════════════
  // 1. INJECTIONS & SERVICES
  // ═══════════════════════════════════════════════════════════
  private api = inject(ApiService);
  private authService = inject(AuthService);
  private agentProfileService = inject(AgentProfileService);
  private destroyRef = inject(DestroyRef);

  // ═══════════════════════════════════════════════════════════
  // 2. ÉTAT & SIGNAUX
  // ═══════════════════════════════════════════════════════════
  partialError = signal(false);
  today = new Date();

  agentProfile = this.agentProfileService.profile;
  maSociete = signal<Societe | null>(null);
  monAbonnement = signal<Abonnement | null>(null);

  // ─── Données Principales ───
  equipe = signal<Agent[]>([]);
  reservations = signal<Reservation[]>([]);
  voyages = signal<Voyage[]>([]);
  vehicules = signal<Vehicule[]>([]);
  routesCount = signal(0);
  clients = signal<any[]>([]);

  // ═══════════════════════════════════════════════════════════
  // 3. GETTERS (RÔLES)
  // ═══════════════════════════════════════════════════════════
  get firstName(): string { return this.authService.currentUser?.firstName ?? 'Agent'; }
  get isDirecteur(): boolean { return this.agentProfile()?.type === AgentType.DIRECTEUR; }
  get isGerant(): boolean { return this.agentProfile()?.type === AgentType.GERANT; }
  get isChauffeur(): boolean { return this.agentProfile()?.type === AgentType.CHAUFFEUR; }
  get isCaissier(): boolean { return this.agentProfile()?.type === AgentType.CAISSIER; }
  get isReceptionniste(): boolean { return this.agentProfile()?.type === AgentType.RECEPTIONNISTE; }

  // ═══════════════════════════════════════════════════════════
  // 4. COMPUTEDS (CALCULS & STATISTIQUES)
  // ═══════════════════════════════════════════════════════════

  // ✅ CA du jour (pour le Caissier) - Calcul robuste
  recettesDuJour = computed(() => {
    const todayStr = new Date().toDateString();
    return this.reservations()
      .filter(r => r.statut === 'PAYEE' && new Date(r.dateReservation).toDateString() === todayStr)
      .reduce((sum, r: any) => {
        if (r.prix) return sum + r.prix;
        if (r.montant) return sum + r.montant;
        if (r.prixTotal) return sum + r.prixTotal;
        if (r.voyage && r.voyage.prix) return sum + (r.voyage.prix * (r.nbPlaces || 1));
        return sum;
      }, 0);
  });

  // ✅ CA du mois (pour le Directeur)
  recettesDuMois = computed(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return this.reservations()
      .filter(r => {
        if (r.statut !== 'PAYEE') return false;
        const d = new Date(r.dateReservation);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, r: any) => {
        if (r.prix) return sum + r.prix;
        if (r.montant) return sum + r.montant;
        if (r.prixTotal) return sum + r.prixTotal;
        if (r.voyage && r.voyage.prix) return sum + (r.voyage.prix * (r.nbPlaces || 1));
        return sum;
      }, 0);
  });

  // ✅ Nombre d'agents en attente (Action Center)
  agentsEnAttente = computed(() => {
    return this.equipe().filter(a => a.status === AgentStatus.EN_ATTENTE || a.status === AgentStatus.PRE_VALIDE).length;
  });

  abonnementLabel = computed(() => {
    const abo = this.monAbonnement();
    if (!abo) return 'Aucun';
    return abo.isActif ? 'Actif' : 'En attente';
  });

  isExpiringSoon = computed(() => {
    const abo = this.monAbonnement();
    if (!abo || !abo.dateFin || !abo.isActif) return false;
    const jours = (new Date(abo.dateFin).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return jours > 0 && jours <= 7;
  });

  voyagesStats = computed(() => {
    const list = this.voyages();
    return {
      planifies: list.filter(v => v.statut === 'PLANIFIE').length,
      enCours: list.filter(v => v.statut === 'EN_COURS').length,
      annules: list.filter(v => v.statut === 'ANNULE').length,
      retardes: list.filter(v => v.statut === 'RETARDE').length,
      termines: list.filter(v => v.statut === 'TERMINE').length,
    };
  });

  prochainsDeparts = computed(() => {
    const now = new Date().getTime();
    return this.voyages()
      .filter(v => new Date(v.dateDepart).getTime() >= now)
      .sort((a, b) => new Date(a.dateDepart).getTime() - new Date(b.dateDepart).getTime())
      .slice(0, 5);
  });

  // ═══════════════════════════════════════════════════════════
  // 5. DONNÉES POUR LES GRAPHIQUES (Charts)
  // ═══════════════════════════════════════════════════════════

  voyagesChart = computed<BarChartItem[]>(() => {
    const s = this.voyagesStats();
    return [
      { label: 'Planifiés', value: s.planifies, color: '#0EA5E9' },
      { label: 'En cours', value: s.enCours, color: '#F59E0B' },
      { label: 'Terminés', value: s.termines, color: '#10B981' },
      { label: 'Retardés', value: s.retardes, color: '#E11D48' },
      { label: 'Annulés', value: s.annules, color: '#64748B' },
    ];
  });

  vehiculesPieChart = computed<PieChartItem[]>(() => {
    const list = this.vehicules();
    return [
      { label: 'Disponibles', value: list.filter(v => v.statut === 'DISPONIBLE').length, color: '#10B981' },
      { label: 'En service', value: list.filter(v => v.statut === 'EN_SERVICE').length, color: '#0EA5E9' },
      { label: 'Maintenance', value: list.filter(v => v.statut === 'EN_MAINTENANCE').length, color: '#F59E0B' },
      { label: 'Hors service', value: list.filter(v => v.statut === 'HORS_SERVICE').length, color: '#E11D48' },
    ];
  });

  equipeProgressChart = computed<ProgressItem[]>(() => {
    const list = this.equipe();
    return [
      { label: 'Chauffeurs', value: list.filter(a => a.type === AgentType.CHAUFFEUR).length, color: '#0EA5E9' },
      { label: 'Caissiers', value: list.filter(a => a.type === AgentType.CAISSIER).length, color: '#10B981' },
      { label: 'Réceptionnistes', value: list.filter(a => a.type === AgentType.RECEPTIONNISTE).length, color: '#6366F1' },
    ];
  });

  reservationsProgressChart = computed<ProgressItem[]>(() => {
    const todayStr = new Date().toDateString();
    const todayRes = this.reservations().filter(r => new Date(r.dateReservation).toDateString() === todayStr);
    
    return [
      { label: 'Payées', value: todayRes.filter(r => r.statut === 'PAYEE').length, color: '#10B981' },
      { label: 'En attente', value: todayRes.filter(r => r.statut === 'EN_ATTENTE').length, color: '#F59E0B' },
      { label: 'Annulées', value: todayRes.filter(r => r.statut === 'ANNULEE').length, color: '#E11D48' },
    ];
  });

  // ═══════════════════════════════════════════════════════════
  // 6. CYCLE DE VIE & APPELS API
  // ═══════════════════════════════════════════════════════════
  ngOnInit(): void { this.load(); }
  reload(): void { this.partialError.set(false); this.load(); }

  private safe<T>(source: Observable<T>, fallback: T): Observable<T> {
    return source.pipe(catchError(() => { this.partialError.set(true); return of(fallback); }));
  }

  private load(): void {
    this.agentProfileService.ensureLoaded().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((agent) => {
      if (!agent?.societeId) return;

      const isManager = this.isDirecteur || this.isGerant;

      forkJoin({
        societe: this.safe<Societe | null>(this.api.get<Societe>(`/societes/${agent.societeId}`), null),
        reservations: this.safe(this.api.get<Paginated<Reservation>>('/reservations', { limit: 100 }), emptyPage<Reservation>()),
        voyages: this.safe(this.api.get<Paginated<Voyage>>('/voyages', { limit: 100 }), emptyPage<Voyage>()),
        
        equipe: isManager ? this.safe(this.api.get<Paginated<Agent>>('/agents', { societeId: agent.societeId, limit: 100 }), emptyPage<Agent>()) : of(emptyPage<Agent>()),
        vehicules: isManager ? this.safe(this.api.get<Paginated<Vehicule>>('/vehicules', { limit: 100 }), emptyPage<Vehicule>()) : of(emptyPage<Vehicule>()),
        routes: isManager ? this.safe(this.api.get<Paginated<Route>>('/routes', { limit: 1 }), emptyPage<Route>()) : of(emptyPage<Route>()),
        
        abonnements: this.isDirecteur ? this.safe(this.api.get<Paginated<Abonnement>>('/abonnements', { societeId: agent.societeId, limit: 5 }), emptyPage<Abonnement>()) : of(emptyPage<Abonnement>()),
        clients: this.isReceptionniste ? this.safe(this.api.get<Paginated<any>>('/clients', { limit: 5 }), emptyPage<any>()) : of(emptyPage<any>()),
      }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ societe, reservations, voyages, equipe, vehicules, routes, abonnements, clients }) => {
        this.maSociete.set(societe);
        this.reservations.set(reservations.data);
        this.routesCount.set(routes.total);
        this.clients.set(clients.data);
        
        this.voyages.set(
          this.isChauffeur 
            ? voyages.data.filter(v => (v as any).chauffeurId === agent.id) 
            : voyages.data
        );
        
        this.equipe.set(equipe.data);
        this.vehicules.set(vehicules.data);
        this.monAbonnement.set(abonnements.data.find((a) => a.isActif) ?? abonnements.data[0] ?? null);
      });
    });
  }
}