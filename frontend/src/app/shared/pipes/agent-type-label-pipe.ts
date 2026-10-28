import { Pipe, PipeTransform } from '@angular/core';
import { AgentType } from '../../core/models/agent.model';

@Pipe({ name: 'agentTypeLabel', standalone: true })
export class AgentTypeLabelPipe implements PipeTransform {
  private labels: Record<AgentType, string> = {
    [AgentType.RECEPTIONNISTE]: 'Réceptionniste',
    [AgentType.CHAUFFEUR]: 'Chauffeur',
    [AgentType.CAISSIER]: 'Caissier',
    [AgentType.GERANT]: 'Gérant',
    [AgentType.DIRECTEUR]: 'Directeur',
  };

  transform(value?: AgentType | null): string {
    return value ? (this.labels[value] ?? value) : '—';
  }
}