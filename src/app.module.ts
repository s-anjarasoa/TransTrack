import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { MoyensTransModule } from './modules/moyens-trans/moyens-trans.module';
import { VehiculeModule } from './modules/vehicule/vehicule.module';
import { VoyageModule } from './modules/voyage/voyage.module';
import { TarifsModule } from './modules/tarifs/tarifs.module';
import { RoutesModule } from './modules/routes/routes.module';
import { PaymentModule } from './modules/payements/payements.module';
import { ReservationModule } from './modules/reservations/reservations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { BagagesModule } from './modules/bagages/bagages.module';
import { BilletModule } from './modules/billets/billets.module';
import { VoyageStatusHistory } from './entities/voyage-status-history.entity';
import { MailModule } from './mail/mail.module';
import { LocationsModule } from './modules/locations/locations.module';
import { RouteStop } from './entities/route-stop.entity';
import { Location } from './entities/location.entity';
import { RoutingModule } from './modules/routing/routing.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('DATABASE_URL');
        const isProduction = process.env.NODE_ENV === 'production';

        if (dbUrl) {
          return {
            type: 'postgres',
            url: dbUrl,
            autoLoadEntities: true,
            synchronize: true, // Désactiver en prod après première synchronisation si souhaité
            ssl: {
              rejectUnauthorized: false, // Obligatoire pour Neon
            },
          };
        }

        // Repli local en développement si DATABASE_URL n'est pas définie
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'root'),
          database: configService.get<string>('DB_NAME', 'db_trans'),
          autoLoadEntities: true,
          synchronize: true,
          logging: !isProduction,
        };
      },
    }),
    AuthModule,
    RolesModule,
    UsersModule,
    ClientsModule,
    AgentsModule,
    SocietesModule,
    AbonnementsModule,
    MoyensTransModule,
    VehiculeModule,
    VoyageModule,
    LocationsModule,
    TarifsModule,
    RoutesModule,
    PaymentModule,
    ReservationModule,
    NotificationsModule,
    BagagesModule,
    BilletModule,
    MailModule,
    RoutingModule,
    RecommendationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

