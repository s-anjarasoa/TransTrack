import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Dossier uploads
  const uploadsDir = join(__dirname, '..', 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
    logger.log('Dossier uploads créé');
  }

  // Fichiers statiques
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
  });

  // Préfixe API
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Liste des origines autorisées pour le CORS
  const allowedOrigins = [
    'http://localhost:4200',
    'http://localhost:4300',
    'http://127.0.0.1:4200',
    'http://127.0.0.1:4300',
    'https://trans-track-ivory.vercel.app',
  ];

  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
  }

  // CORS
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

  // Écoute du port Render
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`Serveur démarré sur le port ${port}`);
  logger.log(`API accessible sur http://0.0.0.0:${port}/api`);
}

bootstrap();