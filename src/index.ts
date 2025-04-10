import fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import createMeteringRoutes from './routes/metering';
import pool from './db';
import { PostgresMeteringService } from './services/metering/impl/PostgresMeteringService';
import { NotificationFactory } from './services/notifications/factory';
import { NotificationType } from './services/notifications/types';
import { AlertFactory } from './services/alerts/factory';
import { RepositoryFactory } from './repositories/factory';
import logger from './utils/logger';

dotenv.config();

// Initialize repositories
RepositoryFactory.initialize(pool);

// Initialize services
const meteringService = new PostgresMeteringService(pool);

// Initialize alert service
AlertFactory.initialize();
const alertService = AlertFactory.getAlertService();

// Initialize notification service based on configuration
NotificationFactory.initialize(
  process.env.NOTIFICATION_SERVICE as NotificationType,
  process.env.NOTIFICATION_SERVICE === NotificationType.Slack ? {
    secretKey: process.env.NANGO_CLIENT_SECRET || '',
    providerConfigKey: process.env.NANGO_SLACK_PROVIDER_CONFIG_KEY || '',
    connectionId: process.env.NANGO_SLACK_CONNECTION_ID || '',
    channel: process.env.SLACK_CHANNEL || 'api-alerts'
  } : undefined
);
const notificationService = NotificationFactory.getNotificationService();

const server = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      }
    } : undefined
  }
});

// Start server
const start = async () => {
  try {
    // Register CORS
    await server.register(cors, {
      origin: true
    });

    // Register global IP-based rate limiter
    await server.register(rateLimit, {
      global: true,
      max: parseInt(process.env.IP_RATE_LIMIT || '1000'),
      timeWindow: 1000, // 1 second
      skipOnError: false,
      hook: 'preHandler',
      redis: undefined,
      keyGenerator: function(request) {
        return `ip:${request.ip}`;
      },
      enableDraftSpec: true,
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
        'retry-after': true
      },
      onExceeding: async function(req, key) {
        const [_, value] = key.split(':');
        logger.warn({ ip: value }, 'IP-based rate limit approaching threshold');
        await alertService.updateRateLimitRecovery(value);
      },
      onExceeded: async function(req, key) {
        const [_, value] = key.split(':');
        logger.error({ ip: value }, 'IP-based rate limit exceeded');
        await alertService.sendRateLimitAlert(value);
      }
    });

    // Add error handler for rate limit errors
    server.setErrorHandler(function (error, request, reply) {
      if (error.statusCode === 429) {
        logger.warn({ 
          statusCode: 429,
          path: request.url,
          method: request.method,
          ip: request.ip
        }, 'Rate limit exceeded');
        reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded'
        });
        return;
      }
      logger.error(error, 'Unhandled error');
      reply.send(error);
    });

    // Register routes with dependencies
    const meteringRoutes = createMeteringRoutes({
      meteringService,
      alertService,
      notificationService
    });

    await server.register(async function(fastify) {      
      return fastify.register(meteringRoutes, { prefix: '/api/v1' });
    });

    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || 'localhost';
    
    await server.listen({ port, host });
    logger.info({ port, host }, 'Server started successfully');
  } catch (err) {
    logger.error(err, 'Error starting server');
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await server.close();
  await pool.end();
  await alertService.shutdown();
  process.exit(0);
});

start(); 