import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BagagesService } from './bagages.service';
import { BagagesController } from './bagages.controller';
import { Bagage } from '../../entities/bagage.entity';
import { Reservation } from '../../entities/reservation.entity';
import { Agent } from '../../entities/agent.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bagage, Reservation, Agent]),
    AuthModule,
  ],
  controllers: [BagagesController],
  providers: [BagagesService],
  exports: [BagagesService],
})
export class BagagesModule {}