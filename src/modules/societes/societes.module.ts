import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Societe } from '../../entities/societe.entity';
import { Agent } from '../../entities/agent.entity';
import { Status } from '../../entities/status.entity';
import { User } from '../../entities/user.entity';
import { SocietesService } from './societes.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { SocietesController } from './societes.controller';
import { AbonnementsModule } from '../abonnements/abonnements.module';

@Module({
  imports: [TypeOrmModule.forFeature([Societe, Agent, Status, User, ]),
  AuthModule,
  NotificationsModule,
  AbonnementsModule,
],
  controllers: [SocietesController],
  providers: [SocietesService],
  exports: [SocietesService],
})
export class SocietesModule {}

