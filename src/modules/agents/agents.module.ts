import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';

import { Agent } from '../../entities/agent.entity';
import { User } from '../../entities/user.entity';
import { Societe } from '../../entities/societe.entity';
import { Status } from '../../entities/status.entity';

import { AuthModule } from '../auth/auth.module'; // exporte AuthService (issueInvitationCode)
import { RolesModule } from '../roles/roles.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, User, Societe, Status]),
    AuthModule,
    RolesModule,
    NotificationsModule,
    MailModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}