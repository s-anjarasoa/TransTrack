import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, of, tap, catchError } from 'rxjs';
import { ApiService } from './api';
import { AuthService } from '../auth/auth';
import { Agent } from '../models/agent.model';

@Injectable({ providedIn: 'root' })
export class AgentProfileService {
  private api = inject(ApiService);
  private authService = inject(AuthService);

  profile = signal<Agent | null>(null);
  private loaded = false;
  private lastUserId: number | null = null;

  constructor() {
    // Repart de zéro à chaque changement d'utilisateur (déconnexion manuelle,
    // expiration de session via l'intercepteur, nouvelle connexion)
    this.authService.currentUser$.pipe(takeUntilDestroyed()).subscribe((user) => {
      const id = user?.id ?? null;
      if (id !== this.lastUserId) this.reset();
      this.lastUserId = id;
    });
  }

  ensureLoaded(): Observable<Agent | null> {
    if (this.loaded) return of(this.profile());

    // Seul un AGENT a un profil agent : évite un 403 (et son toast) pour Admin et Client
    if (!this.authService.hasRole('AGENT')) {
      this.loaded = true;
      return of(null);
    }

    return this.api.get<Agent>('/agents/me').pipe(
      tap((agent) => {
        this.profile.set(agent);
        this.loaded = true;
      }),
      catchError(() => {
        this.profile.set(null);
        this.loaded = true;
        return of(null);
      }),
    );
  }

  reset(): void {
    this.profile.set(null);
    this.loaded = false;
  }
}