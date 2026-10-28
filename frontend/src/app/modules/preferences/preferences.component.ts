import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../core/services/notification';

interface Preferences {
  distance: number;
  duration: number;
  price: number;
}

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './preferences.component.html',
  styleUrl: './preferences.component.css'
})
export class PreferencesComponent implements OnInit {
  private http = inject(HttpClient);
  private notification = inject(NotificationService);
  
  loading = signal(true);
  preferences = signal<Preferences | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.http.get<any>(`${environment.apiUrl}/clients/me`).subscribe({
      next: (res) => {
        // Si le client n'a pas encore de préférences, on lui donne les poids par défaut
        this.preferences.set(res.preferences || { distance: 0.33, duration: 0.33, price: 0.34 });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notification.error("Impossible de charger vos préférences.");
      }
    });
  }

  resetPreferences() {
    if (confirm('Voulez-vous vraiment réinitialiser vos préférences ? L\'IA réapprendra à partir de zéro.')) {
      this.http.patch<any>(`${environment.apiUrl}/clients/me`, { preferences: null }).subscribe({
        next: () => {
          this.load();
          this.notification.success('Préférences réinitialisées avec succès !');
        },
        error: () => this.notification.error("Erreur lors de la réinitialisation.")
      });
    }
  }
}