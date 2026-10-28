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
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  
  // CORS
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://localhost:4300',
      'http://127.0.0.1:4200',
      'http://127.0.0.1:4300',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

  // Port 
  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Serveur démarré sur http://localhost:${port}`);
  logger.log(` API: http://localhost:${port}/api`);
}

bootstrap();