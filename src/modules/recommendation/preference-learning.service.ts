import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from 'src/entities/client.entity';

export interface CriteriaScores {
  distance: number; // Score normalisé (ex: 0 à 1)
  duration: number;
  price: number;
}

@Injectable()
export class PreferenceLearningService {
  private readonly logger = new Logger(PreferenceLearningService.name);

  // Poids par défaut de la plateforme (Global Weights) pour le démarrage à froid
  private readonly GLOBAL_WEIGHTS = { distance: 0.33, duration: 0.33, price: 0.34 };

  constructor(
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
  ) {}

  /**
   * ✅ Cœur de l'IA : Mise à jour des poids via Descente de Gradient (Softmax + L2)
   * @param client Le client qui a fait le choix
   * @param proposals Les 5 propositions avec leurs scores
   * @param chosenIndex L'index (0 à 4) de la proposition choisie par le client
   */
  async learnFromChoice(client: Client, proposals: { scores: CriteriaScores }[], chosenIndex: number) {
    const learningRate = 0.1;
    const lambda = 0.05; // Facteur de régularisation (force le retour aux GLOBAL_WEIGHTS si peu de données)

    // 1. Récupérer les poids actuels (ou les poids globaux si c'est la 1ère fois)
    let weights = client.preferences || { ...this.GLOBAL_WEIGHTS };

    // 2. Calcul du dénominateur du Softmax : sum(exp(w * x_i))
    const expScores = proposals.map(p => 
      Math.exp(
        weights.distance * p.scores.distance + 
        weights.duration * p.scores.duration + 
        weights.price * p.scores.price
      )
    );
    const sumExp = expScores.reduce((a, b) => a + b, 0);

    // 3. Calcul des probabilités prédites pour chaque proposition
    const probabilities = expScores.map(e => e / sumExp);

    // 4. Calcul du Gradient (Pour la descente)
    // Gradient = x_chosen - sum(P_i * x_i) (La moyenne pondérée des attributs)
    let gradDistance = 0, gradDuration = 0, gradPrice = 0;
    for (let i = 0; i < proposals.length; i++) {
      const p = probabilities[i];
      const s = proposals[i].scores;
      
      const isChosen = i === chosenIndex ? 1 : 0;
      
      // (Indicateur de choix - Probabilité prédite) * Score
      gradDistance += (isChosen - p) * s.distance;
      gradDuration += (isChosen - p) * s.duration;
      gradPrice += (isChosen - p) * s.price;
    }

    // 5. Mise à jour des poids + Régularisation (L2 vers les poids globaux)
    weights.distance = weights.distance + learningRate * (gradDistance - lambda * (weights.distance - this.GLOBAL_WEIGHTS.distance));
    weights.duration = weights.duration + learningRate * (gradDuration - lambda * (weights.duration - this.GLOBAL_WEIGHTS.duration));
    weights.price = weights.price + learningRate * (gradPrice - lambda * (weights.price - this.GLOBAL_WEIGHTS.price));

    // 6. Normalisation (pour que la somme des poids fasse 1)
    const sumWeights = weights.distance + weights.duration + weights.price;
    weights = {
      distance: weights.distance / sumWeights,
      duration: weights.duration / sumWeights,
      price: weights.price / sumWeights,
    };

    // 7. Sauvegarde en base
    await this.clientRepo.update(client.id, { preferences: weights });
    this.logger.log(`IA : Préférences du client ${client.id} mises à jour :`, weights);
  }
}