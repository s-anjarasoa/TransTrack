import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';
import { GraphBuilderService } from '../../common/algorithms/graph-builder.service';

import { RoutingLog } from '../../entities/routing.entity';
import { Route } from '../../entities/route.entity';
import { Tarif } from '../../entities/tarif.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoutingLog, Route, Tarif])],
  controllers: [RoutingController],
  providers: [RoutingService, GraphBuilderService],
  exports: [RoutingService, GraphBuilderService],
})
export class RoutingModule {}   