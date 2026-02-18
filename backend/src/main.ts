import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const bodyLimit = process.env.HTTP_BODY_LIMIT || '1mb';
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Enable CORS
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no origin) like curl/Postman
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
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

bootstrap();

