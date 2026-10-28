import {
  Component, inject, signal, computed, OnInit, AfterViewInit, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, MatPaginatorIntl } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../../core/auth/auth';
import { AgentProfileService } from '../../../core/services/agent-profile';
import { AgentsService } from '../agents';
import { NotificationService } from '../../../core/services/notification';
import { Agent, AgentStatus, AgentType } from '../../../core/models/agent.model';
import { AgentTypeLabelPipe } from '../../../shared/pipes/agent-type-label-pipe';
import { AgentCreatedEvent, AgentCreateMode, AgentForm } from '../agent-form/agent-form';

@Component({
  selector: 'app-agents-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, MatTableModule, MatPaginatorModule,
    MatIconModule, MatTooltipModule, AgentTypeLabelPipe, AgentForm,
  ],
  templateUrl: './agents-list.html',
  styleUrl: './agents-list.css',
  providers: [
    {
      provide: MatPaginatorIntl,
      useFactory: () => Object.assign(new MatPaginatorIntl(), {
        itemsPerPageLabel: 'Agents par page :',
        nextPageLabel: 'Page suivante',
        previousPageLabel: 'Page précédente',
        firstPageLabel: 'Première page',
        lastPageLabel: 'Dernière page',
        getRangeLabel: (page: number, pageSize: number, length: number) => {
          if (length === 0 || pageSize === 0) return `0 sur ${length}`;
          const startIndex = page * pageSize;
          const endIndex = startIndex < length ? Math.min(startIndex + pageSize, length) : startIndex + pageSize;
          return `${startIndex + 1} – ${endIndex} sur ${length}`;
        },
      }),
    },
  ],
})
export class AgentsList implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private agentProfileService = inject(AgentProfileService);
  private agentsService = inject(AgentsService);
  private notification = inject(NotificationService);

  readonly AgentStatus = AgentStatus;
  readonly AgentType = AgentType;
  isAdmin = this.authService.hasRole('ADMIN');

  loading = signal(true);
  total = signal(0);
  actionLoadingId = signal<number | null>(null);

  allAgents = signal<Agent[]>([]);
  statutFilter = signal<AgentStatus | ''>('');
  searchTerm = signal(''); // ✅ Ajout de la recherche

  // ✅ KPI Stats
  stats = computed(() => {
    const list = this.allAgents();
    return {
      total: list.length,
      enAttente: list.filter(a => a.status === AgentStatus.EN_ATTENTE || a.status === AgentStatus.PRE_VALIDE).length,
      valides: list.filter(a => a.status === AgentStatus.VALIDE).length,
      suspendus: list.filter(a => a.status === AgentStatus.SUSPENDU).length,
    };
  });

  displayedColumns: string[] = ['agent', 'societe', 'poste', 'statut', 'actions'];
  dataSource = new MatTableDataSource<Agent>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  confirmDeleteAgent = signal<Agent | null>(null);
  showCreate = signal(false);

  visibleColumns = computed<string[]>(() =>
    this.isAdmin ? ['agent', 'societe', 'poste', 'statut', 'actions'] : ['agent', 'poste', 'statut', 'actions'],
  );

  get isDirecteur(): boolean { return this.agentProfileService.profile()?.type === AgentType.DIRECTEUR; }
  get isGerant(): boolean { return this.agentProfileService.profile()?.type === AgentType.GERANT; }
  get canDelete(): boolean { return this.isAdmin || this.isDirecteur; }
  get canCreate(): boolean { return this.isAdmin || this.isDirecteur || this.isGerant; }
  get createMode(): AgentCreateMode { return this.isAdmin ? 'ADMIN' : 'TEAM'; }
  get createButtonLabel(): string { return this.isAdmin ? 'Ajouter un Directeur' : 'Ajouter un agent'; }

  ngOnInit(): void {
    this.agentProfileService.ensureLoaded().subscribe(() => this.load());
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  private load(): void {
    this.loading.set(true);
    const params: Record<string, any> = { limit: 100 };

    if (!this.isAdmin) {
      const societeId = this.agentProfileService.profile()?.societeId;
      if (!societeId) {
        this.allAgents.set([]);
        this.total.set(0);
        this.loading.set(false);
        setTimeout(() => this.applyFilters());
        return;
      }
      params['societeId'] = societeId;
    }

    this.agentsService.findAll(params).subscribe({
      next: (res) => {
        this.allAgents.set(res.data);
        this.total.set(res.total);
        this.loading.set(false);
        setTimeout(() => this.applyFilters());
      },
      error: () => this.loading.set(false),
    });
  }

  refresh(): void { this.load(); }
  openCreate(): void { this.showCreate.set(true); }
  closeCreate(): void { this.showCreate.set(false); }

  onCreated(event: AgentCreatedEvent): void {
    this.showCreate.set(false);
    if (event.emailSent === false) {
      this.notification.error(`${event.displayName} a été ajouté, mais l'e-mail n'a pas pu être envoyé.`);
    } else {
      this.notification.success(this.isAdmin ? `Directeur ${event.displayName} créé.` : `${event.displayName} a été ajouté.`);
    }
    this.load();
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.applyFilters();
  }

  onFilterChange(status: AgentStatus | ''): void {
    this.statutFilter.set(status);
    this.applyFilters();
  }

  private applyFilters(): void {
    const status = this.statutFilter();
    const term = this.searchTerm().toLowerCase().trim();

    const filtered = this.allAgents().filter(a => {
      // 1. Filtre statut
      if (status && a.status !== status) return false;
      // 2. Filtre recherche
      if (term) {
        const haystack = `${this.agentName(a)} ${a.user?.email} ${a.societe?.name}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    this.dataSource.data = filtered;
    if (this.paginator) {
      this.paginator.length = filtered.length;
      this.paginator.pageIndex = 0;
    }
  }

  agentName(agent: Agent): string {
    const u = agent.user;
    return u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email : '—';
  }

  getCountByStatus(status: AgentStatus): number {
    return this.allAgents().filter((a) => a.status === status).length;
  }

  canModerate(agent: Agent): boolean {
    if (this.isAdmin) return true;
    return this.isDirecteur && agent.type !== AgentType.DIRECTEUR;
  }

  canDeleteAgent(agent: Agent): boolean {
    if (this.isAdmin) return true;
    return this.isDirecteur && agent.type !== AgentType.DIRECTEUR;
  }

  validateInline(agent: Agent, event: Event): void { event.stopPropagation(); this.act(agent, AgentStatus.PRE_VALIDE); }
  rejectInline(agent: Agent, event: Event): void { event.stopPropagation(); this.act(agent, AgentStatus.REJETE); }

  private act(agent: Agent, status: AgentStatus): void {
    this.actionLoadingId.set(agent.id);
    this.agentsService.changeStatus(agent.id, { status }).subscribe({
      next: (updated) => {
        this.allAgents.update((list) => list.map((a) => (a.id === updated.id ? updated : a)));
        this.actionLoadingId.set(null);
        this.applyFilters();
      },
      error: () => this.actionLoadingId.set(null),
    });
  }

  askDelete(agent: Agent, event: Event): void { event.stopPropagation(); this.confirmDeleteAgent.set(agent); }
  cancelDelete(): void { this.confirmDeleteAgent.set(null); }

  confirmDelete(): void {
    const agent = this.confirmDeleteAgent();
    if (!agent) return;

    this.actionLoadingId.set(agent.id);
    this.agentsService.remove(agent.id).subscribe({
      next: () => {
        this.allAgents.update((list) => list.filter((a) => a.id !== agent.id));
        this.total.update((t) => Math.max(0, t - 1));
        this.actionLoadingId.set(null);
        this.confirmDeleteAgent.set(null);
        this.applyFilters();
        this.notification.success('Agent supprimé');
      },
      error: (err) => {
        this.actionLoadingId.set(null);
        this.confirmDeleteAgent.set(null);
        this.notification.error(err.error?.message ?? 'Suppression impossible');
      },
    });
  }

  statusLabel(status: AgentStatus): string {
    const labels: Record<AgentStatus, string> = {
      [AgentStatus.EN_ATTENTE]: 'En attente', [AgentStatus.PRE_VALIDE]: 'Pré-validé',
      [AgentStatus.VALIDE]: 'Validé', [AgentStatus.REJETE]: 'Rejeté',
      [AgentStatus.SUSPENDU]: 'Suspendu', [AgentStatus.DESACTIVE]: 'Désactivé',
    };
    return labels[status] ?? status;
  }

  statusBadgeClass(status: AgentStatus): string {
    switch (status) {
      case AgentStatus.VALIDE: return 'badge-success';
      case AgentStatus.EN_ATTENTE:
      case AgentStatus.PRE_VALIDE: return 'badge-warning';
      case AgentStatus.REJETE: return 'badge-danger';
      default: return 'badge-neutral';
    }
  }
}