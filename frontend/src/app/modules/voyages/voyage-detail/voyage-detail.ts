import { Component, inject, signal, computed, OnInit, DestroyRef, ElementRef, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs/operators';
import * as L from 'leaflet';
import { AuthService } from '../../../core/auth/auth';
import { AgentProfileService } from '../../../core/services/agent-profile';
import { VoyagesService } from '../voyages';
import { RoutesService } from '../../routes-trajet/routes-trajet'; 
import { ConfirmService } from '../../../core/services/confirm';
import { NotificationService } from '../../../core/services/notification';
import { Voyage, VoyageStatut, VoyageStatusHistoryEntry } from '../../../core/models/voyage.model';
import { Route } from '../../../core/models/route.model'; 

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

@Component({
  selector: 'app-voyage-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, MatIconModule, MatTooltipModule],
  templateUrl: './voyage-detail.html',
  styleUrl: './voyage-detail.css',
})
export class VoyageDetail implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private agentProfileService = inject(AgentProfileService);
  private voyagesService = inject(VoyagesService);
  private routesService = inject(RoutesService); // ✅ Injection
  private confirmService = inject(ConfirmService);
  private notification = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  readonly VoyageStatut = VoyageStatut;
  isAgent = this.authService.hasRole('AGENT');
  isClient = this.authService.hasRole('CLIENT');
  agentProfile = this.agentProfileService.profile;

  loading = signal(true);
  voyage = signal<Voyage | null>(null);
  
  // ✅ Signal pour stocker les détails de la route (avec les coordonnées GPS)
  routeDetails = signal<Route | null>(null);

  actionLoading = signal(false);
  errorMessage = signal<string | null>(null);

  showRetardForm = signal(false);
  motifRetard = signal('');
  retardMinutes = signal<number>(0);

  showCancelForm = signal(false);
  motifAnnulation = signal('');

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
  private map?: L.Map;

  categorieLabel = computed(() => {
    const v = this.voyage();
    if (!v) return '';
    if (v.placesClasseTotales && v.placesClasseTotales > 0 && v.placesEconomieTotales && v.placesEconomieTotales > 0) return 'Mixte';
    if (v.placesClasseTotales && v.placesClasseTotales > 0) return 'Classe';
    if (v.placesEconomieTotales && v.placesEconomieTotales > 0) return 'Économie';
    return 'Standard';
  });

  isLocked = computed(() => {
    const statut = this.voyage()?.statut;
    return statut === VoyageStatut.TERMINE || statut === VoyageStatut.ANNULE;
  });

  currentAgentId = computed(() => this.agentProfile()?.id ?? null);

  isAssignedChauffeur = computed(() => {
    const v = this.voyage();
    const agentId = this.currentAgentId();
    if (!v || agentId == null) return false;
    return Number(v.chauffeurId) === Number(agentId);
  });

  canDemarrer = computed(() => this.isAssignedChauffeur() && this.voyage()?.statut === VoyageStatut.PLANIFIE);
  canRetarder = computed(() => this.isAssignedChauffeur() && this.voyage()?.statut === VoyageStatut.EN_COURS);
  canTerminer = computed(() => this.isAssignedChauffeur() && this.voyage()?.statut === VoyageStatut.EN_COURS);
  canAnnuler = computed(() =>
    this.isAgent &&
    !this.isLocked() &&
    (this.voyage()?.statut === VoyageStatut.PLANIFIE ||
      this.voyage()?.statut === VoyageStatut.EN_COURS ||
      this.voyage()?.statut === VoyageStatut.RETARDE),
  );

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.agentProfileService
      .ensureLoaded()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load(id));
  }

  ngAfterViewInit(): void {
    // La carte sera initialisée après le chargement des données
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private load(id: number): void {
    this.loading.set(true);
    
    // 1. On charge le voyage
    this.voyagesService.findOne(id).subscribe({
      next: (v) => {
        this.voyage.set(v);
        
        // 2. On utilise le routeId pour charger la route complète (avec stops et locations)
        this.routesService.findOne(v.routeId).subscribe({
          next: (fullRoute) => {
            console.log('🗺️ Route chargée avec GPS :', fullRoute);
            this.routeDetails.set(fullRoute);
            this.loading.set(false);
            
            // 3. Initialisation de la carte
            setTimeout(() => this.initMap(), 200);
          },
          error: () => {
            this.loading.set(false);
            this.notification.error('Impossible de charger les coordonnées de l\'itinéraire');
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.notification.error('Voyage introuvable');
        this.router.navigate(['/voyages']);
      },
    });
  }

  private initMap(): void {
    if (!this.mapContainer) return;
    if (this.map) this.map.remove();

    const route = this.routeDetails();
    
    const coords: [number, number][] = [];
    
    // Extraction des coordonnées
    if (route && route.stops && route.stops.length > 0) {
      route.stops.forEach(stop => {
        if (stop.location?.latitude && stop.location?.longitude) {
          coords.push([Number(stop.location.latitude), Number(stop.location.longitude)]);
        }
      });
    }

    // Si aucune coordonnée trouvée
    if (coords.length === 0) {
      console.warn('⚠️ Aucune coordonnée trouvée dans cette route.');
      coords.push([-18.9137, 47.5361]); // Antananarivo par défaut
    }

    // Initialisation Leaflet
    this.map = L.map(this.mapContainer.nativeElement).setView(coords[0], 6);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    // Marqueurs
    coords.forEach((coord, index) => {
      const isStart = index === 0;
      const isEnd = index === coords.length - 1;
      const label = isStart ? route?.depart : isEnd ? route?.arrivee : `Étape ${index}`;
      L.marker(coord).addTo(this.map!).bindPopup(label || '');
    });

    // Polyline
    if (coords.length > 1) {
      L.polyline(coords, { color: '#0E7490', weight: 4, dashArray: '8,6' }).addTo(this.map);
      this.map.fitBounds(coords, { padding: [40, 40] });
    }

    // Fix pour le rendu
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 200);
  }

  demarrer(): void { this.act(VoyageStatut.EN_COURS); }
  terminer(): void { this.act(VoyageStatut.TERMINE); }

  confirmerRetard(): void {
    if (!this.motifRetard().trim()) {
      this.errorMessage.set('Un motif de retard est requis.');
      return;
    }
    if (this.retardMinutes() <= 0) {
      this.errorMessage.set('Indiquez une durée de retard en minutes.');
      return;
    }
    this.act(VoyageStatut.RETARDE, this.motifRetard(), this.retardMinutes());
  }

  confirmerAnnulation(): void {
    if (!this.motifAnnulation().trim()) {
      this.errorMessage.set('Un motif d\'annulation est requis.');
      return;
    }
    this.act(VoyageStatut.ANNULE, this.motifAnnulation());
  }

  private act(statut: VoyageStatut, motif?: string, retardMinutes?: number): void {
    const v = this.voyage();
    if (!v) return;

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    this.voyagesService.changeStatus(v.id, statut, motif, retardMinutes).subscribe({
      next: (updated) => {
        this.voyage.set(updated);
        this.actionLoading.set(false);
        this.showRetardForm.set(false);
        this.showCancelForm.set(false);
        this.motifRetard.set('');
        this.motifAnnulation.set('');
        this.retardMinutes.set(0);
        this.notification.success('Statut mis à jour');
      },
      error: (err) => {
        this.actionLoading.set(false);
        const msg = err.error?.message ?? 'Une erreur est survenue.';
        this.errorMessage.set(msg);
        this.notification.error(msg);
      },
    });
  }

  remove(): void {
    const v = this.voyage();
    if (!v) return;

    this.confirmService.ask({
      title: 'Supprimer le voyage',
      message: `Voulez-vous vraiment supprimer le voyage "${v.codeVoyage}" ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    }).pipe(filter(Boolean)).subscribe(() => {
      this.actionLoading.set(true);
      this.voyagesService.remove(v.id).subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.notification.success('Voyage supprimé');
          this.router.navigate(['/voyages']);
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.notification.error(err.error?.message ?? 'Suppression impossible');
        },
      });
    });
  }

  statutMeta(statut: VoyageStatut): { label: string; cls: string } {
    switch (statut) {
      case VoyageStatut.PLANIFIE: return { label: 'Planifié', cls: 'chip-info' };
      case VoyageStatut.EN_COURS: return { label: 'En cours', cls: 'chip-active' };
      case VoyageStatut.TERMINE: return { label: 'Terminé', cls: 'chip-success' };
      case VoyageStatut.ANNULE: return { label: 'Annulé', cls: 'chip-danger' };
      case VoyageStatut.RETARDE: return { label: 'Retardé', cls: 'chip-warning' };
      case VoyageStatut.COMPLET: return { label: 'Complet', cls: 'chip-neutral' };
    }
  }

  formatAriary(value: number): string {
    return `${Number(value).toLocaleString('fr-FR')} Ar`;
  }

  historyLabel(entry: VoyageStatusHistoryEntry): string {
    return entry.ancienStatut
      ? `${this.statutMeta(entry.ancienStatut).label} → ${this.statutMeta(entry.nouveauStatut).label}`
      : this.statutMeta(entry.nouveauStatut).label;
  }

  getInitial(name: string | null | undefined): string {
    return name ? name.charAt(0).toUpperCase() : '';
  }

  dureeVoyage(): string {
    const v = this.voyage();
    if (!v?.dateDepart || !v?.dateArrivee) return '—';

    const depart = new Date(v.dateDepart).getTime();
    const arrivee = new Date(v.dateArrivee).getTime();
    const diffMs = arrivee - depart;

    if (diffMs <= 0) return '—';

    const totalMinutes = Math.floor(diffMs / 60000);
    const jours = Math.floor(totalMinutes / 1440);
    const heures = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];
    if (jours > 0) parts.push(`${jours}j`);
    if (heures > 0) parts.push(`${heures}h`);
    if (minutes > 0) parts.push(`${minutes}min`);

    return parts.length > 0 ? parts.join(' ') : '0min';
  }
}