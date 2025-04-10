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
  logger: true,
  ajv: {
    customOptions: {
      removeAdditional: 'all',
      coerceTypes: true,
      useDefaults: true
    }
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
        await alertService.updateRateLimitRecovery(value);
      },
      onExceeded: async function(req, key) {
        const [_, value] = key.split(':');
        await alertService.sendRateLimitAlert(value);
      }
    });

    // Add error handler for rate limit errors
    server.setErrorHandler(function (error, request, reply) {
      if (error.statusCode === 429) {
        reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded'
        });
        return;
      }
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

    await server.listen({
      port: parseInt(process.env.PORT || '3000'),
      host: '0.0.0.0'
    });
  } catch (err) {
    server.log.error(err);
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