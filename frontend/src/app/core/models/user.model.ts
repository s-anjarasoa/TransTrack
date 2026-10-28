import { AgentStatus } from "./agent.model";

export interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string; // 'ADMIN' | 'AGENT' | 'CLIENT' 
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt?: string;
  profileCompleted: boolean; 
  client?: any; 
  agent?: any;
  agentStatus?: AgentStatus | string | null;
}