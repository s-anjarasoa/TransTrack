import { AgentStatus } from './agent.model';

export interface Status {
  id: number;
  agentId: number;
  status: AgentStatus;
  isActive: boolean;
  changedByUserId?: number;
  reason?: string;
  suspendedUntil?: Date;
  createdAt: Date;
}