import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Route } from '../../entities/route.entity';
import { Agent } from '../../entities/agent.entity';
import { MoyenTrans } from '../../entities/moyen-trans.entity';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';
import { RouteStop } from 'src/entities/route-stop.entity';
import { Location } from 'src/entities/location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
      Route,
      RouteStop,
      Agent,
      MoyenTrans,
      Location,])],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [RoutesService],
})
export class RoutesModule {}