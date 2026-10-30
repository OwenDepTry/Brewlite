import { INestApplication, ValidationPipe } from '@nestjs/common';

/** Cấu hình dùng chung cho main.ts và test tích hợp */
export function configureApp(app: INestApplication) {
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    exposedHeaders: ['Idempotent-Replayed'],
  });

  // Validate mọi request body bằng class-validator; bỏ/chặn field lạ.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  return app;
}
