import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreferenceLearningService } from './preference-learning.service';
import { Client } from '../../entities/client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client])], // Nécessaire car le service utilise ClientRepository
  providers: [PreferenceLearningService],
  exports: [PreferenceLearningService], // ✅ INDISPENSABLE : Permet aux autres modules de l'utiliser
})
export class RecommendationModule {}