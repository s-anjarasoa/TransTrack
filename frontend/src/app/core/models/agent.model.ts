import { User } from "./user.model";
import { Societe } from "./societe.model";

export enum AgentType {
  RECEPTIONNISTE = 'RECEPTIONNISTE',
  CHAUFFEUR = 'CHAUFFEUR',
  CAISSIER = 'CAISSIER',
  GERANT = 'GERANT',
  DIRECTEUR = 'DIRECTEUR',
}

export enum AgentStatus {
  EN_ATTENTE = 'EN_ATTENTE',
  VALIDE = 'VALIDE',
  REJETE = 'REJETE',
  SUSPENDU = 'SUSPENDU',
  DESACTIVE = 'DESACTIVE',
  PRE_VALIDE = 'PRE_VALIDE',
}

export interface Agent {
  id: number;
  userId: number;
  CIN: string;
  phone: string;   
  address: string;
  type: AgentType;
  societeId?: number;
  status: AgentStatus;
  createdAt: Date;
  user?: User;
  societe?: Societe;
}