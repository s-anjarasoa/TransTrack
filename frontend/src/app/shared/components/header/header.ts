import { Component, inject, Input, Output, EventEmitter, computed, HostListener, ElementRef, signal } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router'; // ✅ Déjà importé ici
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/auth/auth';
import { AgentProfileService } from '../../../core/services/agent-profile';
import { NotificationBell } from '../notification-bell/notification-bell';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    NotificationBell, 
    RouterLink // ✅ AJOUTEZ CECI : Sans ça, les liens routerLink ne marchent pas
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  // ... (Le reste de votre code TS reste identique)
  private authService = inject(AuthService);
  private agentProfileService = inject(AgentProfileService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  @Input() isSidebarCollapsed = false;
  @Output() menuToggle = new EventEmitter<void>();

  user = computed(() => this.authService.currentUser);
  agentProfile = this.agentProfileService.profile;

  userMenuOpen = signal(false);
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.userMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.userMenuOpen.set(false);
  }
  
  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  logout(): void {
    this.userMenuOpen.set(false);
    this.agentProfileService.reset();
    this.authService.logout();
  }

  private readonly menuStructure: Array<{ label: string; route?: string; children?: string[] }> = [
    { label: 'Tableau de bord', route: '/dashboard' },
    { label: 'Transport', children: ['/moyens-trans', '/vehicules', '/routes', '/tarifs', '/voyages'] },
    { label: 'Commercial', children: ['/reservations', '/billets', '/paiements', '/bagages'] },
    { label: 'Gestion & Partenaires', children: ['/societes', '/agents', '/abonnements', '/clients', '/admin/users'] },
    { label: 'Mes préférences IA', route: '/preferences' }, 
    { label: 'Notifications', route: '/notifications' },
    { label: 'Mon profil', route: '/clients/me' },
  ];

  currentPageTitle = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.resolveParentLabel(this.router.url)),
      startWith(this.resolveParentLabel(this.router.url))
    ),
    { initialValue: this.resolveParentLabel(this.router.url) }
  );
 
  private resolveParentLabel(url: string): string {
    const cleanUrl = url.split('?')[0].split('#')[0];
    for (const item of this.menuStructure) {
      if (item.route) {
        if (cleanUrl === item.route || cleanUrl.startsWith(item.route + '/')) return item.label;
      }
      if (item.children) {
        const isChild = item.children.some(child => cleanUrl === child || cleanUrl.startsWith(child + '/'));
        if (isChild) return item.label; 
      }
    }
    return 'Tableau de bord';
  }
  
  espaceLabel = computed(() => {
    const role = this.user()?.role;
    const labels: Record<string, string> = { ADMIN: 'ESPACE ADMINISTRATEUR', AGENT: 'ESPACE AGENT', CLIENT: 'ESPACE CLIENT' };
    return role ? labels[role] || 'ESPACE UTILISATEUR' : '';
  });

  espaceIcon = computed(() => {
    const role = this.user()?.role;
    const icons: Record<string, string> = { ADMIN: 'admin_panel_settings', AGENT: 'badge', CLIENT: 'person' };
    return role ? icons[role] || 'person' : 'person';
  });

  agentTypeLabel = computed(() => {
    const type = this.agentProfile()?.type;
    if (!type) return '';
    const labels: Record<string, string> = { RECEPTIONNISTE: 'Réceptionniste', CHAUFFEUR: 'Chauffeur', CAISSIER: 'Caissier', GERANT: 'Gérant', DIRECTEUR: 'Directeur' };
    return labels[type] || '';
  });

  get initials(): string {
    const user = this.user();
    if (!user) return '?';
    const fromNames = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
    return fromNames || user.email?.[0]?.toUpperCase() || '?';
  }

  get fullName(): string {
    const user = this.user();
    if (!user) return 'Utilisateur';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Utilisateur';
  }

  get email(): string { return this.user()?.email || ''; }

  get avatarColor(): string {
    const email = this.user()?.email || 'user@example.com';
    let hash = 0;
    for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
    const colors = ['#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB', '#0ABDE3', '#10AC84', '#EE5A24', '#5F27CD', '#341F97', '#FF6FB7', '#54A0FF', '#5F6DEC'];
    return colors[Math.abs(hash) % colors.length];
  }

  get avatarGradient(): string {
    const color = this.avatarColor;
    return `linear-gradient(135deg, ${color}, ${this.darkenColor(color)})`;
  }

  private darkenColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16); const g = parseInt(hex.slice(3, 5), 16); const b = parseInt(hex.slice(5, 7), 16);
    const darkenFactor = 0.7;
    return `#${Math.round(r * darkenFactor).toString(16).padStart(2, '0')}${Math.round(g * darkenFactor).toString(16).padStart(2, '0')}${Math.round(b * darkenFactor).toString(16).padStart(2, '0')}`;
  }
}