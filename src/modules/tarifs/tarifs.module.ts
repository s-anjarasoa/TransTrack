import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tarif } from '../../entities/tarif.entity';
import { Agent } from '../../entities/agent.entity';
import { Route } from '../../entities/route.entity';
import { TarifsService } from './tarifs.service';
import { TarifsController } from './tarifs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tarif, Agent, Route])],
  controllers: [TarifsController],
  providers: [TarifsService],
  exports: [TarifsService],
})
export class TarifsModule {}