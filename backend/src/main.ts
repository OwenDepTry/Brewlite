import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });

  // Validate mọi request body/query bằng class-validator; bỏ field lạ.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`BrewLite API đang chạy tại http://localhost:${port}`);
}

bootstrap();
