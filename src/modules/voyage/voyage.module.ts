import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voyage } from '../../entities/voyage.entity';
import { Agent } from '../../entities/agent.entity';
import { Route } from '../../entities/route.entity';
import { Vehicule } from '../../entities/vehicule.entity';
import { Tarif } from '../../entities/tarif.entity';
import { VoyageService } from './voyage.service';
import { VoyageController } from './voyage.controller';
import { Client } from '../../entities/client.entity';
import { VoyageStatusHistory } from '../../entities/voyage-status-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Voyage, Agent, Route, Vehicule,VoyageStatusHistory, Tarif, Client])],
  controllers: [VoyageController],
  providers: [VoyageService],
  exports: [VoyageService],
})
export class VoyageModule {}