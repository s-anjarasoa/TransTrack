import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Billet } from '../../entities/billet.entity';
import { Reservation } from '../../entities/reservation.entity';
import { Client } from '../../entities/client.entity';
import { Agent } from '../../entities/agent.entity';
import { BilletService } from './billets.service';
import { BilletController } from './billets.controller';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([Billet, Reservation, Client, Agent]),
  MailModule,
],
  controllers: [BilletController],
  providers: [BilletService],
  exports: [BilletService],
})
export class BilletModule {}