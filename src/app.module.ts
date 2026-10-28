import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Agent } from './entities/agent.entity';
import { ClientsModule } from './modules/clients/clients.module';
import { AgentsModule } from './modules/agents/agents.module';
import { SocietesModule } from './modules/societes/societes.module';
import { AbonnementsModule } from './modules/abonnements/abonnements.module';
import { Abonnement } from './entities/abonnement.entity';
import { Client } from './entities/client.entity';
import { Societe } from './entities/societe.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { Status } from './entities/status.entity';
import { MoyenTrans } from './entities/moyen-trans.entity';
import { Vehicule } from './entities/vehicule.entity';
import { Route } from './entities/route.entity';
import { Tarif } from './entities/tarif.entity';
import { Voyage } from './entities/voyage.entity';
import { Reservation } from './entities/reservation.entity';
import { Billet } from './entities/billet.entity';
import { Paiement } from './entities/paiement.entity';
import { Bagage } from './entities/bagage.entity';
import { Notification } from './entities/notification.entity';
import { MoyensTransService } from './modules/moyens-trans/moyens-trans.service';
import { MoyensTransModule } from './modules/moyens-trans/moyens-trans.module';
import { VehiculeService } from './modules/vehicule/vehicule.service';
import { VehiculeModule } from './modules/vehicule/vehicule.module';
import { VoyageController } from './modules/voyage/voyage.controller';
import { VoyageModule } from './modules/voyage/voyage.module';
import { TarifsService } from './modules/tarifs/tarifs.service';
import { TarifsController } from './modules/tarifs/tarifs.controller';
import { TarifsModule } from './modules/tarifs/tarifs.module';
import { RoutesService } from './modules/routes/routes.service';
import { RoutesModule } from './modules/routes/routes.module';
import { PaymentController } from './modules/payements/payments.controller';
import { PaymentModule } from './modules/payements/payements.module';
import { ReservationModule} from './modules/reservations/reservations.module';
import { NotificationsService } from './modules/notifications/notifications.service';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { BagagesController } from './modules/bagages/bagages.controller';
import { BagagesModule } from './modules/bagages/bagages.module';
import { BilletService } from './modules/billets/billets.service';
import { BilletModule } from './modules/billets/billets.module';
import { BilletController } from './modules/billets/billets.controller';
import { VoyageStatusHistory } from './entities/voyage-status-history.entity';
import { MailModule } from './mail/mail.module';
import { LocationsModule } from './modules/locations/locations.module';
import { RouteStop } from './entities/route-stop.entity';
import { Location } from './entities/location.entity';
import { ConfigModule } from '@nestjs/config';
import { RoutingModule } from './modules/routing/routing.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';




@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'root',
      database: 'db_trans',
      autoLoadEntities: true,
      entities: [
        Role, 
        User,
        Agent,
        Societe,
        Client,
        Abonnement,
        Status,
        PasswordResetToken,
        MoyenTrans,
        Vehicule,
        Route,
        Tarif,
        Voyage,
        Reservation,
        Billet,
        Paiement,
        Bagage,
        Notification,
        VoyageStatusHistory,
        RouteStop,
        Location,
         
        
      ],
      synchronize: true,
      logging: true,
    }),AuthModule, RolesModule, UsersModule, ClientsModule, AgentsModule, SocietesModule, 
      AbonnementsModule, MoyensTransModule, VehiculeModule, VoyageModule,LocationsModule, 
      TarifsModule, RoutesModule, PaymentModule, ReservationModule, NotificationsModule, 
      BagagesModule,BilletModule, MailModule,RoutingModule,RecommendationModule,  ],
      controllers: [AppController],
      providers: [AppService],
})
export class AppModule {}
