import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Front-end e API rodam em portas (origens) diferentes de propósito — o áudio
  // precisa ser carregável cross-origin pelo <audio>, então relaxamos o CORP
  // padrão do Helmet (que bloquearia isso com "same-origin").
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3002')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({ origin: corsOrigins, credentials: true });

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Tocafy API')
      .setDescription('Biblioteca de música pessoal — catálogo, playlists e player')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
  console.log(`Tocafy API rodando em http://localhost:${port}`);
}
bootstrap();
