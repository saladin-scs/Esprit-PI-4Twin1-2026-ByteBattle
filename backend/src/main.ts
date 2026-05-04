/* eslint-disable prettier/prettier */ // restart
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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use((req: any, res: any, next: any) => {
    const id =
      (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].trim()) ||
      randomUUID();
    req.correlationId = id;
    res.setHeader('X-Request-Id', id);
    const start = Date.now();
    res.on('finish', () => {
      try {
        console.log(
          JSON.stringify({
            level: 'http',
            correlationId: id,
            method: req.method,
            path: req.originalUrl?.split('?')[0] ?? req.url,
            status: res.statusCode,
            ms: Date.now() - start,
          }),
        );
      } catch {
        /* ignore */
      }
    });
    next();
  });

  // Serve uploaded files (avatars, covers)
  const uploadsPath = join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  const bodyLimit = process.env.HTTP_BODY_LIMIT || '1mb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Enable CORS
  const corsOrigins = (
    process.env.CORS_ORIGIN ||
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,https://*.vercel.app'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const nodeEnv = process.env.NODE_ENV || 'development';
  const localhostOriginOk = (o: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(o);
  const vercelOriginOk = (o: string) => /^https:\/\/[a-z0-9-]+(?:-[a-z0-9-]+)*\.vercel\.app$/i.test(o);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no origin) like curl/Postman
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      if (nodeEnv !== 'production' && localhostOriginOk(origin)) return callback(null, true);
      if (vercelOriginOk(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  const pointsPerMinute = Number(process.env.RATE_LIMIT_POINTS_PER_MINUTE || 120);
  const rateLimiter = new RateLimiterMemory({
    points: Number.isFinite(pointsPerMinute) ? pointsPerMinute : 120,
    duration: 60,
  });

  app.use(async (req: any, res: any, next: any) => {
    try {
      const key = req.ip || req.connection?.remoteAddress || 'unknown';
      if (req.path === '/health' || req.path?.startsWith('/health/')) return next();
      // softer for swagger/assets
      if (req.path?.startsWith('/api')) return next();
      await rateLimiter.consume(key, 1);
      return next();
    } catch {
      return res.status(429).json({
        statusCode: 429,
        message: 'Too many requests',
      });
    }
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('ByteBattle API')
    .setDescription('Real-Time Collaborative Coding Challenge Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}

const BOOTSTRAP_GUARD_KEY = '__BYTEBATTLE_BACKEND_BOOTSTRAPPED__';
const globalRef = globalThis as Record<string, unknown>;

if (globalRef[BOOTSTRAP_GUARD_KEY]) {
  console.warn('[bootstrap] main.ts already initialized, skipping duplicate startup.');
} else {
  globalRef[BOOTSTRAP_GUARD_KEY] = true;
  bootstrap().catch((error) => {
    globalRef[BOOTSTRAP_GUARD_KEY] = false;
    throw error;
  });
}