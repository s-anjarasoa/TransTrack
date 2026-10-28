import {
  Component, inject, Input, Output, EventEmitter,
  computed, OnDestroy,OnInit 
} from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';   
import { Subscription, filter } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/auth/auth';
import { InboxService } from '../../../core/services/inbox';
import { AgentProfileService } from '../../../core/services/agent-profile';

export type MenuItem = {
  label: string;
  route?: string;
  icon?: string;      
  roles?: string[];
  items?: MenuItem[];
  expanded?: boolean;
  badge?: number;
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    CommonModule,
    MatIconModule,           // ✅ AJOUT
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private agentProfileService = inject(AgentProfileService);
  private router = inject(Router);
  private inbox = inject(InboxService);
  private userSig = toSignal(this.authService.currentUser$, {
  initialValue: this.authService.currentUser,
});
  


  @Input() mobileOpen: boolean = false;
  @Input() isCollapsed: boolean = false;

  @Output() closeMobile = new EventEmitter<void>();
  @Output() toggleCollapse = new EventEmitter<void>();

  private userSubscription: Subscription | null = null;
  private routerSubscription: Subscription | null = null;

    menuItems: MenuItem[] = [
    {
      label: 'Tableau de bord',
      route: '/dashboard',
      icon: 'dashboard',
    },
    // ========================================================
    // ✅ ESPACE CLIENT
    // ========================================================
    {
      label: 'Trajet',
      route: '/reserver/search',
      icon: 'alt_route',
      roles: ['CLIENT'],
    },
    {
    label: 'Rechercher un itinéraire',       
    route: '/routing',
    icon: 'route',
    roles: ['CLIENT'],
    },
    {
      label: 'Reservations',
      route: '/reservations',
      icon: 'event_available',
      roles: ['CLIENT'],
    },
   
    // ========================================================
    // ✅ ESPACE PRO (Admin & Agents)
    // ========================================================
    {
      label: 'Transport',
      icon: 'directions_bus',
      roles: ['ADMIN', 'AGENT'],
      items: [
        { label: 'Moyens de transport', icon: 'commute',         route: '/moyens-trans' },
        { label: 'Véhicules',           icon: 'local_shipping',  route: '/vehicules' },
        { label: 'Lieux géographiques', icon: 'place',           route: '/locations' },
        { label: 'Routes & Trajets',    icon: 'alt_route',       route: '/routes' },
        { label: 'Tarification',        icon: 'sell',            route: '/tarifs' },
        { label: 'Planning Voyages',    icon: 'calendar_month',  route: '/voyages' },
      ],
    },
    {
      label: 'Commercial',
      icon: 'confirmation_number',
      roles: ['ADMIN', 'AGENT'],
      items: [
        { label: 'Réservations (Guichet)', icon: 'event_available', route: '/reservations' },
        { label: 'Billets & Scans',        icon: 'qr_code_scanner', route: '/billets' },
        { label: 'Paiements',              icon: 'payments',        route: '/paiements' },
        { label: 'Bagages',                icon: 'luggage',         route: '/bagages' },
      ],
    },
    {
      label: 'Gestion & Partenaires',
      icon: 'apartment',
      roles: ['ADMIN', 'AGENT'],
      items: [
        { label: 'Sociétés',              icon: 'business',              route: '/societes',      roles: ['ADMIN', 'AGENT'] },
        { label: 'Agents',                icon: 'people',                route: '/agents',        roles: ['ADMIN', 'AGENT'] },
        { label: 'Abonnements',           icon: 'workspace_premium',     route: '/abonnements',   roles: ['ADMIN', 'AGENT'] },
        { label: 'Clients',               icon: 'person',                route: '/clients',       roles: ['ADMIN'] },
       
      ],
    },
    // ========================================================
    // ✅ IA & ROUTAGE (Pour ton mémoire)
    // ========================================================
     {
    label: 'Optimisation & Routage',           // ← ✅ Renommé (honnête : c'est de la RO)
    icon: 'insights',                           // ← ✅ Icône plus adaptée
    roles: ['ADMIN', 'AGENT'],
    items: [
      { label: 'Calcul d\'itinéraires', icon: 'route', route: '/routing' },
      // 🔮 Futur : { label: 'Benchmark algorithmes', icon: 'science', route: '/routing/benchmark', roles: ['ADMIN'] },
    ],
    },
    // ========================================================
    // ✅ TOUT LE MONDE
    // ========================================================
    /*{
      label: 'Notifications',
      route: '/notifications',
      icon: 'notifications',
      roles: ['ADMIN', 'AGENT', 'CLIENT'],
    },*/
    {
      label: 'Mon profil',
      route: '/clients/me',
      icon: 'account_circle',
      roles: ['CLIENT'],
    },
  ];

  filteredMenu = computed(() => {
    const userRole = this.userSig()?.role || '';
    const unreadCount = this.inbox.unreadCount(); // Signal du service

    return this.menuItems
      .filter((item) => !item.roles || item.roles.includes(userRole))
      .map((item) => {
        // Si c'est le menu Notifications, on ajoute le badge
        if (item.label === 'Notifications' && unreadCount > 0) {
          return { ...item, badge: unreadCount };
        }
        
        if (!item.items) return item;

        const filteredChildren = item.items.filter(
          (child) => !child.roles || child.roles.includes(userRole),
        );

        return { ...item, items: filteredChildren };
      })
      .filter((item) => !item.items || item.items.length > 0);
  });

  get user() {
    return this.authService.currentUser;
  }

  constructor() {
    this.userSubscription = this.authService.currentUser$.subscribe((user) => {
      if (!user) this.agentProfileService.reset();
    });

    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.autoExpandActiveGroup());
  }

  toggleGroup(group: MenuItem, event: Event): void {
    event.stopPropagation();
    if (this.isCollapsed) return;
    group.expanded = !group.expanded;
  }

  private autoExpandActiveGroup(): void {
    const currentUrl = this.router.url;
    this.menuItems.forEach((group) => {
      if (group.items?.some((sub) => sub.route && currentUrl.startsWith(sub.route))) {
        group.expanded = true;
      }
    });
  }

  onToggleCollapse(): void {
    this.toggleCollapse.emit();
  }

  logout(): void {
    this.closeMobile.emit();
    this.agentProfileService.reset();
    this.authService.logout();
  }

  navigateAndClose(route?: string): void {
    if (!route) return;
    this.router.navigate([route]);
    this.closeMobile.emit();
  }

  ngOnInit(): void {
    this.inbox.startPolling();
  }

  ngOnDestroy(): void {
    this.inbox.stopPolling();
    this.userSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
  }
}