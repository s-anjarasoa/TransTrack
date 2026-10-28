import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../../core/services/notification';
import { BilletsService } from '../billets';

@Component({
  selector: 'app-billets-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './billets-list.html',
  styleUrl: './billets-list.css',
})
export class BilletsList {
  private billetsService = inject(BilletsService);
  private notification = inject(NotificationService);

  scanCode = signal('');
  loading = signal(false);
  scanResult = signal<{ success: boolean; message: string; passager?: string; details?: string } | null>(null);

  validerBillet() {
    const code = this.scanCode().trim();
    if (!code) return;

    this.loading.set(true);
    this.scanResult.set(null);

    this.billetsService.valider(code).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        
        // ✅ Extraction des infos du passager et du voyage
        const user = res.reservation?.client?.user;
        const route = res.reservation?.voyage?.route;
        
        const passagerNom = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Passager inconnu';
        const details = route ? `${route.depart} → ${route.arrivee}` : '';

        this.scanResult.set({
          success: true,
          message: 'Embarquement validé avec succès !',
          passager: passagerNom,
          details: details
        });
        
        this.scanCode.set(''); // Reset
        this.notification.success('Billet validé');
      },
      error: (err: any) => {
        this.loading.set(false);
        this.scanResult.set({
          success: false,
          message: err.error?.message || 'Billet invalide ou déjà utilisé.'
        });
        this.scanCode.set('');
      }
    });
  }
}