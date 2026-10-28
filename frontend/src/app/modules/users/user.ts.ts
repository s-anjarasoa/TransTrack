import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api'; // Ajustez le chemin selon votre projet
import { Client } from '../../core/models/client.model';

// Payload pour la création de profil Client (CreateClientDto NestJS)
export interface CreateClientPayload {
  phone: string;
  address: string;
  CIN: string;
  passport: string;
}

// Payload pour l'inscription de l'Agent (RegisterAgentDto NestJS)
export interface RegisterAgentPayload {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone: string;
  address: string;
  CIN: string;
  type?: string;
  invitationCode: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private api = inject(ApiService);

  /**
   * Création du profil Client (POST /clients)
   */
  createClient(payload: CreateClientPayload): Observable<Client> {
    return this.api.post<Client>('/clients', payload);
  }

  /**
   * Inscription de l'Agent via code d'invitation (POST /agents/register)
   */
  registerAgent(payload: RegisterAgentPayload): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/agents/register', payload);
  }
}