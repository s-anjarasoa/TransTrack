import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApiService } from '../../../core/services/api';
import { AuthService } from '../../../core/auth/auth';
import { Agent, AgentStatus } from '../../../core/models/agent.model';
import { SocieteStatut, Societe } from '../../../core/models/societe.model';
import { Abonnement } from '../../../core/models/abonnement.model';
import { Client } from '../../../core/models/client.model';
import { Voyage } from '../../../core/models/voyage.model';
import { Reservation, ReservationStatut } from '../../../core/models/reservation.model';

import { BarChart, BarChartItem } from '../../../shared/components/chart/bar-chart/bar-chart';
import { PieChart, PieChartItem } from '../../../shared/components/chart/pie-chart/pie-chart';
import { AreaChart, AreaChartPoint } from '../../../shared/components/chart/area-chart/area-chart';

interface Paginated<T> { data: T[]; total: number; }

interface AdminTotals {
  societes: number;
  agents: number;
  abonnementsActifs: number;
  clients: number;
  voyagesEnCours: number;
  reservationsMois: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    RouterLink, 
    MatIconModule, 
    BarChart, 
    PieChart, 
    AreaChart, 
    DatePipe
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private api = inject(ApiService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  partialError = signal(false);
  today = new Date();

  totals = signal<AdminTotals | null>(null);
  societesEnAttente = signal(0);
  abonnementsEnAttente = signal(0);

  // Données des graphiques
  societeChart = signal<PieChartItem[]>([]);
  agentChart = signal<BarChartItem[]>([]);
  evolutionChart = signal<AreaChartPoint[]>([]);

  get firstName(): string {
    return this.authService.currentUser?.firstName ?? 'Admin';
  }

  ngOnInit(): void {
    this.load();
  }

  reload(): void {
    this.partialError.set(false);
    this.loading.set(true);
    this.load();
  }

  private safe<T>(path: string, params: Record<string, any>): Observable<Paginated<T>> {
    return this.api.get<Paginated<T>>(path, params).pipe(
      catchError(() => {
        this.partialError.set(true);
        return of({ data: [], total: 0 } as Paginated<T>);
      }),
    );
  }

  private load(): void {
    forkJoin({
      societes: this.safe<Societe>('/societes', { limit: 200 }),
      agents: this.safe<Agent>('/agents', { limit: 100 }),
      abonnementsActifs: this.safe<Abonnement>('/abonnements', { isActif: true, limit: 1 }),
      abonnementsEnAttente: this.safe<Abonnement>('/abonnements', { isActif: false, limit: 1 }),
      clients: this.safe<Client>('/clients', { limit: 1 }),
      voyagesEnCours: this.safe<Voyage>('/voyages', { statut: 'EN_COURS', limit: 1 }),
      reservations: this.safe<Reservation>('/reservations', { limit: 200 }),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((r) => {
        const societes = r.societes.data;
        const agents = r.agents.data;
        const reservations = r.reservations.data;

        const debutMois = new Date();
        debutMois.setDate(1);
        debutMois.setHours(0, 0, 0, 0);

        this.totals.set({
          societes: r.societes.total,
          agents: r.agents.total,
          abonnementsActifs: r.abonnementsActifs.total,
          clients: r.clients.total,
          voyagesEnCours: r.voyagesEnCours.total,
          reservationsMois: reservations.filter((x) => new Date(x.dateReservation) >= debutMois).length,
        });

        this.societesEnAttente.set(societes.filter((s) => s.statut === SocieteStatut.EN_ATTENTE).length);
        this.abonnementsEnAttente.set(r.abonnementsEnAttente.total);

        // Graphique Sociétés (Pie)
        this.societeChart.set([
          { label: 'En attente', value: this.count(societes, (s) => s.statut === SocieteStatut.EN_ATTENTE), color: '#F59E0B' },
          { label: 'Validées', value: this.count(societes, (s) => s.statut === SocieteStatut.VALIDEE), color: '#0EA5E9' },
          { label: 'Suspendues', value: this.count(societes, (s) => s.statut === SocieteStatut.SUSPENDUE), color: '#64748B' },
          { label: 'Rejetées', value: this.count(societes, (s) => s.statut === SocieteStatut.REJETEE), color: '#EF4444' },
        ]);

        // Graphique Agents (Bar)
        this.agentChart.set([
          { label: 'En attente', value: this.count(agents, (a) => a.status === AgentStatus.EN_ATTENTE || a.status === AgentStatus.PRE_VALIDE), color: '#F59E0B' },
          { label: 'Validés', value: this.count(agents, (a) => a.status === AgentStatus.VALIDE), color: '#0EA5E9' },
          { label: 'Suspendus', value: this.count(agents, (a) => a.status === AgentStatus.SUSPENDU), color: '#64748B' },
          { label: 'Rejetés', value: this.count(agents, (a) => a.status === AgentStatus.REJETE), color: '#EF4444' },
        ]);

        // ✅ Graphique d'évolution (Area) - Données mockées pour l'instant
        // À remplacer par de vraies données API quand le backend sera prêt
        this.evolutionChart.set([
          { label: 'Lun', value: 12 },
          { label: 'Mar', value: 19 },
          { label: 'Mer', value: 15 },
          { label: 'Jeu', value: 28 },
          { label: 'Ven', value: 42 },
          { label: 'Sam', value: 35 },
          { label: 'Dim', value: 50 },
        ]);

        this.loading.set(false);
      });
  }

  private count<T>(list: T[], predicate: (item: T) => boolean): number {
    return list.filter(predicate).length;
  }
}