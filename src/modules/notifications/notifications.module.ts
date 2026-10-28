import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';
import { Agent } from '../../entities/agent.entity';
import { AuthModule } from '../auth/auth.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, Agent]),
    forwardRef(() => AuthModule), 
    
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],  
})
export class NotificationsModule {}