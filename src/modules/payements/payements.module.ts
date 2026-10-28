import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Paiement } from '../../entities/paiement.entity';
import { PaymentService } from './payements.service';
import { PaymentController } from './payments.controller';
import { SimulatedPaymentProvider } from './providers/simulated.provider';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Paiement])],
  controllers: [PaymentController],
  providers: [PaymentService, SimulatedPaymentProvider],
  // Les modules métier (abonnements, réservations…) importent ce module
  exports: [PaymentService],
})
export class PaymentModule {}