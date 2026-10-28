import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Abonnement } from '../../entities/abonnement.entity';
import { Agent } from '../../entities/agent.entity';
import { Societe } from '../../entities/societe.entity';
import { AbonnementsService } from './abonnements.service';
import { AbonnementsController } from './abonnements.controller';
import { AbonnementExpiryService } from './abonnement-expiry.service';
import { PaymentModule } from '../payements/payements.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    // Societe : statut de la société (validation par paiement, suspension)
    TypeOrmModule.forFeature([Abonnement, Agent, Societe]),
    PaymentModule,
    NotificationsModule,
  ],
  controllers: [AbonnementsController],
  providers: [AbonnementsService, AbonnementExpiryService],
  exports: [AbonnementsService],
})
export class AbonnementsModule {}