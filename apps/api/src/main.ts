import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './modules/config/app-config.service';
import { PinoLoggerService } from './common/logging/pino-logger.service';
import { logger } from './common/logging/logger';
import { configureApp } from './bootstrap';
import { RedisService } from './modules/realtime/redis.service';
import { RedisIoAdapter } from './modules/realtime/redis-io-adapter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });
  app.useLogger(new PinoLoggerService());

  const config = app.get(AppConfigService);
  configureApp(app, {
    apiPrefix: config.apiPrefix,
    isProduction: config.isProduction,
    corsOrigins: config.corsOrigins,
  });

  // Enable the Socket.IO Redis adapter when Redis is configured (multi-instance
  // fan-out). Without Redis, the default in-memory adapter is used (single node).
  const redis = app.get(RedisService);
  const redisClient = redis.getClient();
  if (redisClient) {
    const redisAdapter = new RedisIoAdapter(app);
    redisAdapter.connect(redisClient, redisClient.duplicate());
    app.useWebSocketAdapter(redisAdapter);
  }

  // API docs are development-only and never document nonexistent business APIs.
  if (!config.isProduction) {
    const docConfig = new DocumentBuilder()
      .setTitle('Soliton API')
      .setDescription('Soliton backend API (foundation).')
      .setVersion(config.apiVersion)
      .build();
    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup(`${config.apiPrefix}/docs`, app, document);
  }

  await app.listen(config.port);
  logger.info(
    { port: config.port, prefix: config.apiPrefix, env: config.nodeEnv },
    'soliton-api started',
  );
}

void bootstrap();
