import { Module, OnModuleInit } from '@nestjs/common'; // 👈 Ajout de OnModuleInit
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from '../../entities/reservation.entity';
import { Voyage } from '../../entities/voyage.entity';
import { Client } from '../../entities/client.entity';
import { Agent } from '../../entities/agent.entity';
import { ReservationService } from './reservations.service';
import { ReservationController } from './reservations.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentModule } from '../payements/payements.module'; 
import { PaymentService } from '../payements/payements.service'; 
import { PaymentPurpose } from '../payements/payment-provider.interface'; 
import { RecommendationModule } from '../recommendation/recommendation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, Voyage, Client, Agent]),
    AuthModule,
    NotificationsModule,
    PaymentModule,
    RecommendationModule,
  ],
  controllers: [ReservationController],
  providers: [ReservationService],
  exports: [ReservationService],
})
export class ReservationModule implements OnModuleInit { 
  constructor(
    private reservationService: ReservationService,
    private paymentService: PaymentService,
  ) {}

  onModuleInit() {
    // ✅ On dit au PaymentService : "Si un paiement RESERVATION réussit, appelle markAsPaid"
    this.paymentService.registerHandler(PaymentPurpose.RESERVATION, {
      onPaymentSucceeded: async (paiement) => {
        if (paiement.reservationId) {
          await this.reservationService.markAsPaid(paiement.reservationId);
        }
      },
    });
  }
}