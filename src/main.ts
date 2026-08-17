import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
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
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // CORS
  app.enableCors();

  // Port 
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Serveur démarré sur http://localhost:${port}`);
  logger.log(` API: http://localhost:${port}/api`);
}

bootstrap();