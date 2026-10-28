import { AgentType } from './agent.model';

export enum SocieteStatut {
  EN_ATTENTE = 'EN_ATTENTE',
  VALIDEE = 'VALIDEE',
  REJETEE = 'REJETEE',
  SUSPENDUE = 'SUSPENDUE',
}

// core/models/societe.model.ts
export interface Societe {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  nif: string;
  numState: string;
  statut: SocieteStatut;
  codeInvitation: string;
  createdAt: string;
  updatedAt?: string;
  directeur?: {
    id: number;
    type: AgentType;
    phone: string;
    user: {
      id: number;
      email: string;
      firstName?: string;
      lastName?: string;
    };
  };
  agents?: any[];
  abonnements?: any[];
  clients?: any[]; // ✅ Ajouter cette propriété
}