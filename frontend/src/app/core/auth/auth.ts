// src/app/core/auth/auth.ts
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';
import { User } from '../models/user.model';
import { AgentType } from '../models/agent.model';

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterAgentPayload {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  address: string;
  CIN: string;
  type?: AgentType;
  invitationCode: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CompleteClientProfilePayload {
  phone: string;
  address: string;
  CIN: string;
  passport: string;
}

export interface RequestAgentPayload {
  phone: string;
  address: string;
  CIN: string;
  type?: AgentType;
  societeId: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private storage = inject(StorageService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  private currentUserSubject: BehaviorSubject<User | null>;

  constructor() {
    const initialUser = isPlatformBrowser(this.platformId)
      ? this.storage.getUser<User>()
      : null;
    this.currentUserSubject = new BehaviorSubject<User | null>(initialUser);
  }

  // ============================================================
  // GETTERS
  // ============================================================

  get currentUser$(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return this.storage.getToken();
  }

  // ============================================================
  // AUTHENTIFICATION
  // ============================================================

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', payload).pipe(
      tap((res) => this.setSession(res)),
    );
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
  return this.api.post<AuthResponse>('/auth/register', payload).pipe(
    tap((res) => this.setSession(res)),
  );
}

  registerAgent(payload: RegisterAgentPayload): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/agents/register', payload);
  }

  // ============================================================
  // ✅ COMPLÉTION DE PROFIL CLIENT
  // ============================================================

  completeClientProfile(payload: CompleteClientProfilePayload): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/complete-client-profile', payload).pipe(
      tap((res) => this.setSession(res)),
    );
  }

  // ============================================================
  // ✅ DEMANDE D'INSCRIPTION AGENT
  // ============================================================

  requestAgentInvitation(payload: RequestAgentPayload): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/auth/request-agent-invitation', payload);
  }

  // ============================================================
  // ✅ VALIDATION DU CODE D'INVITATION
  // ============================================================

  validateInvitationCode(code: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/auth/validate-invitation', { code });
  }
  // ============================================================
// ✅ RÉGÉNÉRER LE CODE
// ============================================================
resendInvitationCode(): Observable<{ message: string }> {
  return this.api.post<{ message: string }>('/auth/resend-invitation-code', {});
}

// ============================================================
// ✅ VÉRIFIER LE STATUT (pour polling)
// ============================================================
getAgentInvitationStatus(): Observable<{
  hasAgent: boolean;
  status: string | null;
  hasCode: boolean;
  expiresAt: string | null;
  societeName: string | null;
}> {
  return this.api.get<{
    hasAgent: boolean;
    status: string | null;
    hasCode: boolean;
    expiresAt: string | null;
    societeName: string | null;
  }>('/auth/agent-invitation-status');
}

  // ============================================================
  // MOT DE PASSE OUBLIÉ
  // ============================================================

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/auth/forgot-password', { email });
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/auth/reset-password', { token, password });
  }

  validateResetToken(token: string): Observable<{ valid: boolean; message?: string }> {
    return this.api.get<{ valid: boolean; message?: string }>('/auth/validate-reset-token', { token });
  }

  // ============================================================
  // PROFIL UTILISATEUR
  // ============================================================

  fetchMe(): Observable<User> {
    return this.api.get<User>('/auth/me').pipe(
      tap((user) => {
        this.storage.setUser(user);
        this.currentUserSubject.next(user);
      }),
    );
  }

  logout(): void {
    this.storage.clear();
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  // ============================================================
  // HELPERS
  // ============================================================

  isAuthenticated(): boolean {
    return this.storage.isLoggedIn();
  }

  hasRole(role: string): boolean {
    const user = this.currentUser;
    return !!user && user.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUser;
    return !!user && roles.includes(user.role);
  }

  private setSession(res: AuthResponse): void {
    this.storage.setToken(res.access_token);
    this.storage.setUser(res.user);
    this.currentUserSubject.next(res.user);
  }
}