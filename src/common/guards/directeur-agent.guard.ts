import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, AgentType } from '../../entities/agent.entity';

@Injectable()
export class DirecteurAgentGuard implements CanActivate {
  constructor(
    @InjectRepository(Agent)
    private agentRepository: Repository<Agent>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // rempli par AuthGuard('jwt') exécuté avant ce guard
    const targetAgentId = Number(request.params.id);

    if (!user) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    // 1. Un ADMIN plateforme passe toujours
    if (user.role === 'ADMIN') {
      return true;
    }

    // 2. Doit avoir le rôle global AGENT pour prétendre à quoi que ce soit ici
    if (user.role !== 'AGENT') {
      throw new ForbiddenException('Accès réservé aux Administrateurs et Directeurs');
    }

    const targetAgent = await this.agentRepository.findOne({
      where: { id: targetAgentId },
    });
    if (!targetAgent) {
      throw new NotFoundException(`Agent avec l'ID ${targetAgentId} non trouvé`);
    }

    const requestingAgent = await this.agentRepository.findOne({
      where: { userId: user.id },
    });
    if (!requestingAgent) {
      throw new ForbiddenException('Profil agent introuvable pour cet utilisateur');
    }

    // 3. Doit être précisément de type DIRECTEUR
    if (requestingAgent.type !== AgentType.DIRECTEUR) {
      throw new ForbiddenException('Seul le Directeur de la société peut valider ses agents');
    }

    // 4. Doit appartenir à la MÊME société que l'agent ciblé (isolation multi-tenant)
    if (requestingAgent.societeId !== targetAgent.societeId) {
      throw new ForbiddenException('Vous ne pouvez valider que les agents de votre propre société');
    }

    // 5. Interdiction de s'auto-valider
    if (requestingAgent.id === targetAgent.id) {
      throw new ForbiddenException('Un Directeur ne peut pas modifier son propre statut');
    }

    // 6. Interdiction de valider un pair Directeur (relève de l'Admin plateforme)
    if (targetAgent.type === AgentType.DIRECTEUR) {
      throw new ForbiddenException('La validation d\'un Directeur relève de l\'Administrateur plateforme');
    }

    // Attache l'agent cible à la requête pour éviter une 2e requête DB dans le service
    request.targetAgent = targetAgent;
    return true;
  }
}