import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/services/api';
import { Agent, AgentStatus, AgentType } from '../../core/models/agent.model';

export interface ChangeStatusPayload {
  status: AgentStatus;
  reason?: string;
}

/** Création d'un Directeur par l'admin (mot de passe temporaire) */
export interface CreateDirecteurPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  CIN: string;
  phone: string;
  address: string;
  type: AgentType.DIRECTEUR;
}

/** Création d'un agent par un Directeur / Gérant (pas de mot de passe) */
export interface CreateTeamAgentPayload {
  email: string;
  firstName: string;
  lastName: string;
  CIN: string;
  phone: string;
  address: string;
  type: AgentType;
}

export interface CreateTeamAgentResult {
  agent: Agent;
  emailSent: boolean;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class AgentsService {
  private api = inject(ApiService);

  findAll(params?: Record<string, any>): Observable<PaginatedResult<Agent>> {
    return this.api.get<PaginatedResult<Agent>>('/agents', params);
  }

  findOne(id: number): Observable<Agent> {
    return this.api.get<Agent>(`/agents/${id}`);
  }

  /** ADMIN : crée un Directeur */
  createDirecteur(payload: CreateDirecteurPayload): Observable<Agent> {
    return this.api.post<Agent>('/agents/admin-create', payload);
  }

  /** DIRECTEUR / GÉRANT : ajoute un agent directement validé à sa société */
  createTeamAgent(
    payload: CreateTeamAgentPayload,
  ): Observable<CreateTeamAgentResult> {
    return this.api.post<CreateTeamAgentResult>('/agents', payload);
  }

  changeStatus(id: number, payload: ChangeStatusPayload): Observable<Agent> {
    return this.api.patch<Agent>(`/agents/${id}/status`, payload);
  }

  remove(id: number): Observable<void> {
    return this.api.delete<void>(`/agents/${id}`);
  }
}