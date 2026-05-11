/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { randomUUID } from 'crypto';
import { httpRequestDurationSeconds, httpRequestsTotal } from './health/prometheus';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /* ===============================
     SAFE PORT (RENDER COMPATIBLE)
  =============================== */
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  /* ===============================
     REQUEST LOGGER
  =============================== */
  app.use((req: any, res: any, next: any) => {
    const id =
      (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].trim()) ||
      randomUUID();

    req.correlationId = id;
    res.setHeader('X-Request-Id', id);

    const start = Date.now();

    res.on('finish', () => {
      const route = req.route?.path || req.originalUrl?.split('?')[0] || req.url;

      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };

      httpRequestsTotal.inc(labels);
      httpRequestDurationSeconds.observe(labels, (Date.now() - start) / 1000);
    });

    next();
  });

  /* ===============================
     STATIC FILES
  =============================== */
  const uploadsPath = join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  /* ===============================
     BODY LIMIT
  =============================== */
  const bodyLimit = process.env.HTTP_BODY_LIMIT || '1mb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  /* ===============================
     SECURITY
  =============================== */
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  /* ===============================
     CORS SAFE CONFIG
  =============================== */
  app.enableCors({
    origin: true,
    credentials: true,
  });

  /* ===============================
     RATE LIMITER
  =============================== */
  const rateLimiter = new RateLimiterMemory({
    points: Number(process.env.RATE_LIMIT_POINTS_PER_MINUTE || 120),
    duration: 60,
  });

  app.use(async (req: any, res: any, next: any) => {
    try {
      const key = req.ip || 'unknown';
      if (req.path === '/health' || req.path === '/metrics') return next();

      await rateLimiter.consume(key, 1);
      return next();
    } catch {
      return res.status(429).json({ message: 'Too many requests' });
    }
  });

  /* ===============================
     VALIDATION PIPE
  =============================== */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /* ===============================
     SWAGGER
  =============================== */
  const config = new DocumentBuilder()
    .setTitle('ByteBattle API')
    .setDescription('Production API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  /* ===============================
     HEALTH ENDPOINT (REQUIRED)
  =============================== */
  app.getHttpAdapter().getInstance().get('/health', (req, res) => {
    res.json({
      status: 'ok',
      port,
      ml_service_1: process.env.ML_SERVICE_URL_1 || null,
      ml_service_2: process.env.ML_SERVICE_URL_2 || null,
    });
  });

  /* ===============================
     START SERVER
  =============================== */
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Server running on port ${port}`);
  console.log(`📚 Swagger: /api`);
}

bootstrap();
