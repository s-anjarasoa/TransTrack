import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { Client } from '../../entities/client.entity';
import { Agent } from '../../entities/agent.entity';
import { Status } from '../../entities/status.entity';
import { Societe } from '../../entities/societe.entity';

import { RolesModule } from '../roles/roles.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    JwtModule.register({
      secret: 'super_secret_key_2026',
      signOptions: { expiresIn: '365d' },
    }),
    TypeOrmModule.forFeature([
      User,
      Role,
      PasswordResetToken,
      Client,
      Agent,
      Status,
      Societe,
    ]),
    RolesModule,
    forwardRef(() => NotificationsModule),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}