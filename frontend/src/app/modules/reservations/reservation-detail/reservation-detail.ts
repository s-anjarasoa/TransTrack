import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import * as QRCode from 'qrcode';

import { AuthService } from '../../../core/auth/auth';
import { ReservationsService } from '../reservations';
import { NotificationService } from '../../../core/services/notification';

import { Reservation, ReservationStatut } from '../../../core/models/reservation.model';
import { Billet } from '../../../core/models/billet.model';
import { Bagage, BagageType } from '../../../core/models/bagage.model';
import { BilletsService } from '../../billets/billets';
import { BagagesService } from '../../bagages/bagages';

@Component({
  selector: 'app-reservation-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatIconModule],
  templateUrl: './reservation-detail.html',
  styleUrl: './reservation-detail.css',
})
export class ReservationDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private reservationsService = inject(ReservationsService);
  private billetsService = inject(BilletsService);
  private bagagesService = inject(BagagesService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  readonly ReservationStatut = ReservationStatut;
  readonly BagageType = BagageType;
  
  isAgent = this.authService.hasRole('AGENT');
  isAdmin = this.authService.hasRole('ADMIN');

  loading = signal(true);
  reservation = signal<Reservation | null>(null);
  billets = signal<Billet[]>([]);
  bagages = signal<Bagage[]>([]);

  actionLoading = signal(false);
  showCancelForm = signal(false);
  motif = signal('');
  errorMessage = signal<string | null>(null);

  // ✅ Formulaire d'ajout de bagage
  showBagageForm = signal(false);
  newBagage = signal({ type: BagageType.SOUTE, poids: 6, description: '' });
  bagageLoading = signal(false);
  bagageOptions = Object.values(BagageType);

  // ✅ Signaux pour l'impression du billet
  printableBillet = signal<Billet | null>(null);
  qrCodeUrl = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(id);
  }

  private load(id: number): void {
    this.loading.set(true);
    this.reservationsService.findOne(id).subscribe({
      next: (r) => { 
        this.reservation.set(r); 
        this.loadBilletsAndBagages(id);
        this.loading.set(false); 
      },
      error: () => this.loading.set(false),
    });
  }

  private loadBilletsAndBagages(id: number) {
    this.billetsService.getByReservation(id).subscribe(res => this.billets.set(res));
    this.bagagesService.getByReservation(id).subscribe(res => this.bagages.set(res));
  }

  confirmer(): void {
    const r = this.reservation();
    if (!r) return;
    this.actionLoading.set(true);
    this.reservationsService.confirm(r.id).subscribe({
      next: (updated) => { 
        this.reservation.set(updated); 
        this.actionLoading.set(false);
        this.loadBilletsAndBagages(updated.id);
        this.notification.success('Réservation confirmée ! En attente de paiement.');
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Erreur');
      },
    });
  }

  // ✅ Sécurité TS : Blocage de l'impression si non payé
  imprimerBillet(billet: Billet): void {
    if (this.isAgent) {
      this.notification.error("Les agents ne peuvent pas télécharger le billet.");
      return;
    }
    
    if (this.reservation()?.statut !== ReservationStatut.PAYEE) {
      this.notification.error("Le billet n'est disponible qu'après paiement de la réservation.");
      return;
    }

    if (!billet.qrCode) {
      this.notification.error("Le QR Code est introuvable.");
      return;
    }

    QRCode.toDataURL(billet.qrCode, {
      width: 300, margin: 2, color: { dark: '#0F172A', light: '#FFFFFF' }
    }).then((url: string) => {
      this.qrCodeUrl.set(url);
      this.printableBillet.set(billet);

      setTimeout(() => {
        window.print(); 
        setTimeout(() => {
          this.printableBillet.set(null);
          this.qrCodeUrl.set(null);
        }, 500);
      }, 100); 
    }).catch((err: any) => {
      console.error('Erreur QR Code:', err);
      this.notification.error("Impossible de générer le QR Code.");
    });
  }

  // ✅ Fonction appelée si on clique sur le cadenas
  notifierPaiementRequis(): void {
    this.notification.error("Veuillez régler la réservation pour débloquer le téléchargement du billet.");
  }

  envoyerEmail(billet: Billet) {
    this.billetsService.envoyerParEmail(billet.id).subscribe({
      next: () => this.notification.success('Billet envoyé par email !'),
      error: (err) => this.notification.error(err.error?.message ?? 'Erreur d\'envoi')
    });
  }

  ajouterBagage(): void {
    const r = this.reservation();
    const b = this.newBagage();
    if (!r || !b.poids) return;

    this.bagageLoading.set(true);
    this.bagagesService.create({
      reservationId: r.id,
      type: b.type,
      poids: Number(b.poids),
      description: b.description
    }).subscribe({
      next: (bag) => {
        this.bagages.update(list => [...list, bag]);
        this.showBagageForm.set(false);
        this.newBagage.set({ type: BagageType.SOUTE, poids: 6, description: '' });
        this.bagageLoading.set(false);
        this.notification.success('Bagage ajouté !');
      },
      error: (err) => {
        this.bagageLoading.set(false);
        this.notification.error(err.error?.message ?? 'Erreur lors de l\'ajout du bagage');
      }
    });
  }

  annuler(): void {
    const r = this.reservation();
    if (!r) return;
    this.actionLoading.set(true);
    this.reservationsService.cancel(r.id, this.motif()).subscribe({
      next: (updated) => {
        this.reservation.set(updated);
        this.actionLoading.set(false);
        this.showCancelForm.set(false);
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Erreur');
      },
    });
  }

  payer(): void {
    const r = this.reservation();
    if (!r) return;

    this.actionLoading.set(true);
    this.reservationsService.payer(r.id).subscribe({
      next: (res) => {
        this.actionLoading.set(false);
        if (res.checkoutUrl) {
          const url = new URL(res.checkoutUrl, window.location.origin);
          if (url.origin === window.location.origin) {
            this.router.navigateByUrl(url.pathname + url.search);
          } else {
            window.location.assign(res.checkoutUrl);
          }
        }
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.errorMessage.set(err.error?.message ?? 'Erreur lors de l\'initialisation du paiement');
      }
    });
  }

  get allowedWeight(): number {
    return (this.reservation()?.nombrePlaces || 1) * 6;
  }

  get canCancel(): boolean {
    const statut = this.reservation()?.statut;
    return statut === ReservationStatut.EN_ATTENTE || statut === ReservationStatut.CONFIRMEE;
  }

  statutMeta(statut: ReservationStatut) {
    switch (statut) {
      case ReservationStatut.EN_ATTENTE: return { label: 'En attente', cls: 'chip-warning' };
      case ReservationStatut.CONFIRMEE: return { label: 'Confirmée', cls: 'chip-info' };
      case ReservationStatut.PAYEE: return { label: 'Payée', cls: 'chip-success' };
      case ReservationStatut.ANNULEE: return { label: 'Annulée', cls: 'chip-danger' };
      default: return { label: statut, cls: 'chip-neutral' };
    }
  }

  formatAriary(value: number): string {
    return `${Number(value).toLocaleString('fr-FR')} Ar`;
  }
}