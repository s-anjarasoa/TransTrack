import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../core/auth/auth';
import { AgentProfileService } from '../../../core/services/agent-profile';
import { AgentsService } from '../agents';
import { Agent, AgentStatus, AgentType } from '../../../core/models/agent.model';
import { AgentTypeLabelPipe } from '../../../shared/pipes/agent-type-label-pipe';
import { ReasonDialog } from '../../../shared/components/reason-dialog/reason-dialog'; // ⚠️ Ajustez le chemin selon votre structure

@Component({
  selector: 'app-agent-detail',
  standalone: true,
  imports: [RouterLink, AgentTypeLabelPipe, MatIconModule, ReasonDialog],
  templateUrl: './agent-detail.html',
  styleUrl: './agent-detail.css',
})
export class AgentDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private agentProfileService = inject(AgentProfileService);
  private agentsService = inject(AgentsService);

  readonly AgentStatus = AgentStatus;

  loading = signal(true);
  agent = signal<Agent | null>(null);
  actionLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // 🔹 Gestion de la boîte de dialogue du motif
  showReasonDialog = signal(false);
  reasonDialogTitle = signal('Suspendre cet agent');
  reasonDialogMessage = signal('Veuillez indiquer le motif de la suspension de cet agent.');
  reasonDialogConfirmLabel = signal('Suspendre');

  // ✅ Initiales de l'agent pour l'avatar
  agentInitials = computed(() => {
    const u = this.agent()?.user;
    if (!u) return '?';
    const f = u.firstName?.[0] ?? '';
    const l = u.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || u.email?.[0]?.toUpperCase() || '?';
  });

  // ✅ Classe CSS de la carte d'action selon le statut
  actionCardClass = computed(() => {
    const status = this.agent()?.status;
    switch (status) {
      case AgentStatus.VALIDE: return 'action-card-success';
      case AgentStatus.EN_ATTENTE:
      case AgentStatus.PRE_VALIDE: return 'action-card-warning';
      case AgentStatus.REJETE:
      case AgentStatus.SUSPENDU: return 'action-card-danger';
      default: return '';
    }
  });

  get isAdmin(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  get canModerate(): boolean {
    const target = this.agent();
    if (!target) return false;
    
    // Si la cible est un Directeur, seul un ADMIN a le droit de la modérer
    if (target.type === AgentType.DIRECTEUR) {
      return this.isAdmin;
    }

    if (this.isAdmin) return true;

    const myProfile = this.agentProfileService.profile();
    return (
      myProfile?.type === AgentType.DIRECTEUR &&
      myProfile.societeId === target.societeId &&
      myProfile.id !== target.id
    );
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.agentProfileService.ensureLoaded().subscribe(() => this.load(id));
  }

  private load(id: number): void {
    this.loading.set(true);
    this.agentsService.findOne(id).subscribe({
      next: (agent) => {
        this.agent.set(agent);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // Envoyer ou renvoyer le code d'invitation
  sendCode(): void {
    this.act(AgentStatus.PRE_VALIDE);
  }

  // Validation finale de l'agent
  validate(): void {
    this.act(AgentStatus.VALIDE);
  }

  // Rejeter la demande
  reject(): void {
    this.act(AgentStatus.REJETE);
  }

  // Suspendre le compte (Ouvre la modale de motif)
  suspend(): void {
    this.reasonDialogTitle.set('Suspendre cet agent');
    this.reasonDialogMessage.set('Veuillez indiquer le motif de la suspension de cet agent.');
    this.reasonDialogConfirmLabel.set('Suspendre');
    this.errorMessage.set(null);
    this.showReasonDialog.set(true);
  }

  // Callback lorsque le motif est validé dans la modale
  onReasonConfirmed(reason: string): void {
    this.act(AgentStatus.SUSPENDU, reason);
  }

  // Fermer la modale
  onReasonCancelled(): void {
    this.showReasonDialog.set(false);
  }

  // Réactiver un compte suspendu
  reactivate(): void {
    this.act(AgentStatus.VALIDE);
  }

  private act(status: AgentStatus, reason?: string): void {
    const agent = this.agent();
    if (!agent) return;

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    // Si votre API accepte le motif dans le payload (ex: { status, reason })
    const payload: { status: AgentStatus; reason?: string } = { status };
    if (reason) {
      payload.reason = reason;
    }

    this.agentsService.changeStatus(agent.id, payload).subscribe({
      next: (updated) => {
        this.agent.set(updated);
        this.actionLoading.set(false);
        this.showReasonDialog.set(false);
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }

  statusLabel(status: AgentStatus): string {
    const labels: Record<AgentStatus, string> = {
      [AgentStatus.EN_ATTENTE]: 'En attente',
      [AgentStatus.PRE_VALIDE]: 'Pré-validé',
      [AgentStatus.VALIDE]: 'Validé',
      [AgentStatus.REJETE]: 'Rejeté',
      [AgentStatus.SUSPENDU]: 'Suspendu',
      [AgentStatus.DESACTIVE]: 'Désactivé',
    };
    return labels[status] ?? status;
  }

  statusBadgeClass(status: AgentStatus): string {
    switch (status) {
      case AgentStatus.VALIDE: return 'chip-success';
      case AgentStatus.EN_ATTENTE:
      case AgentStatus.PRE_VALIDE: return 'chip-warning';
      case AgentStatus.REJETE:
      case AgentStatus.SUSPENDU: return 'chip-danger';
      default: return 'chip-neutral';
    }
  }

  statusAvatarClass(status: AgentStatus): string {
    switch (status) {
      case AgentStatus.VALIDE: return 'avatar-success';
      case AgentStatus.EN_ATTENTE:
      case AgentStatus.PRE_VALIDE: return 'avatar-warning';
      case AgentStatus.REJETE:
      case AgentStatus.SUSPENDU: return 'avatar-danger';
      default: return 'avatar-neutral';
    }
  }
}