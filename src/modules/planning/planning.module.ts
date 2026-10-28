import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { Voyage } from '../../entities/voyage.entity';
import { Vehicule } from '../../entities/vehicule.entity';
import { Agent } from '../../entities/agent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Voyage, Vehicule, Agent])],
  controllers: [PlanningController],
  providers: [PlanningService],
})
export class PlanningModule {}