import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vehicule } from '../../entities/vehicule.entity';
import { Agent } from '../../entities/agent.entity';
import { MoyenTrans } from '../../entities/moyen-trans.entity';
import { VehiculeService } from './vehicule.service';
import { VehiculeController } from './vehicule.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicule, Agent, MoyenTrans])],
  controllers: [VehiculeController],
  providers: [VehiculeService],
  exports: [VehiculeService],
})
export class VehiculeModule {}