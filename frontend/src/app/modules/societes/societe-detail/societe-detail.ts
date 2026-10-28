import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth';
import { AgentProfileService } from '../../../core/services/agent-profile';
import { CommonModule } from '@angular/common';
import { SocietesService } from '../societes';
import { Societe, SocieteStatut } from '../../../core/models/societe.model';
import { AgentType } from '../../../core/models/agent.model';
import { Abonnement } from '../../../core/models/abonnement.model';
import { AgentTypeLabelPipe } from '../../../shared/pipes/agent-type-label-pipe';

// ✅ AJOUT DES IMPORTS MATERIAL
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-societe-detail',
  standalone: true,
  imports: [
    RouterLink,
    AgentTypeLabelPipe,
    CommonModule,
    MatIconModule,   // ✅
    MatTooltipModule // ✅
  ],
  templateUrl: './societe-detail.html',
  styleUrl: './societe-detail.css',
})
export class SocieteDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private agentProfileService = inject(AgentProfileService);
  private societesService = inject(SocietesService);

  readonly SocieteStatut = SocieteStatut;

  societe = signal<Societe | null>(null);
  actionLoading = signal(false);
  errorMessage = signal<string | null>(null);
  codeCopied = signal(false);

  get isAdmin(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  get isOwnerDirecteur(): boolean {
    const agent = this.agentProfileService.profile();
    return agent?.type === AgentType.DIRECTEUR && agent?.societeId === this.societe()?.id;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.agentProfileService.ensureLoaded().subscribe(() => this.load(id));
  }

  private load(id: number): void {
    this.societesService.findOne(id).subscribe({
      next: (societe) => this.societe.set(societe),
      error: () => {
        // Le loader global s'affichera, l'erreur est gérée silencieusement ou via notification
      },
    });
  }

  validate(): void { this.act(SocieteStatut.VALIDEE); }
  reject(): void { this.act(SocieteStatut.REJETEE); }

  private act(statut: SocieteStatut.VALIDEE | SocieteStatut.REJETEE): void {
    const societe = this.societe();
    if (!societe) return;

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    this.societesService.validate(societe.id, { statut }).subscribe({
      next: (updated) => { 
        this.societe.set(updated); 
        this.actionLoading.set(false); 
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Une erreur est survenue.');
      },
    });
  }

  regenerateCode(): void {
    const societe = this.societe();
    if (!societe) return;

    this.actionLoading.set(true);
    this.societesService.regenerateCode(societe.id).subscribe({
      next: (res) => {
        this.societe.update((s) => (s ? { ...s, codeInvitation: res.codeInvitation } : s));
        this.actionLoading.set(false);
      },
      error: () => this.actionLoading.set(false),
    });
  }

  copyCode(): void {
    const code = this.societe()?.codeInvitation;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 2000);
    });
  }

  getStatusLabel(statut: SocieteStatut): string {
    const labels: Record<SocieteStatut, string> = {
      [SocieteStatut.EN_ATTENTE]: 'En attente',
      [SocieteStatut.VALIDEE]: 'Validée',
      [SocieteStatut.REJETEE]: 'Rejetée',
      [SocieteStatut.SUSPENDUE]: 'Suspendue'
    };
    return labels[statut] || statut;
  }

  statusBadgeClass(statut: SocieteStatut): string {
    switch (statut) {
      case SocieteStatut.VALIDEE: return 'badge-success';
      case SocieteStatut.EN_ATTENTE: return 'badge-warning';
      case SocieteStatut.REJETEE: return 'badge-danger';
      case SocieteStatut.SUSPENDUE: return 'badge-neutral';
      default: return 'badge-neutral';
    }
  }
   
  abonnementActif = computed(() => {
    const abos = this.societe()?.abonnements;
    if (!abos || abos.length === 0) return null;
    
    // On cherche d'abord un abonnement avec le statut 'ACTIF'
    const actif = abos.find(a => a.statut === 'ACTIF');
    if (actif) return actif;
    
    // Sinon, on retourne le plus récent (le dernier de la liste)
    return abos[abos.length - 1];
  });

  // ✅ Helper pour savoir si l'abonnement expire bientôt (dans moins de 7 jours)
  isExpiringSoon(dateFin?: Date | string): boolean {
    if (!dateFin) return false;
    const fin = new Date(dateFin).getTime();
    const maintenant = new Date().getTime();
    const joursRestants = (fin - maintenant) / (1000 * 3600 * 24);
    return joursRestants > 0 && joursRestants <= 7;
  }

  directeurFullName(): string {
    const user = this.societe()?.directeur?.user;
    if (!user) return '—';
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || '—';
  }
}