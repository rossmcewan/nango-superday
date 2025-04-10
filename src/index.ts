import fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import meteringRoutes from './routes/metering';
import pool from './db';
import { RepositoryFactory } from './repositories/factory';
import { NotificationFactory } from './services/notifications/factory';
import { NotificationType } from './services/notifications/types';

dotenv.config();

// Initialize repositories
RepositoryFactory.initialize(pool);

// Initialize notification service
NotificationFactory.initialize(process.env.NOTIFICATION_SERVICE as NotificationType || NotificationType.Console);

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

    // Register rate limiter plugin
    await server.register(rateLimit, {
      global: true,
      max: 100,
      timeWindow: 1000, // 1 minute in ms
      allowList: [], // No IPs are exempt
      skipOnError: false, // Don't skip rate limiting on errors
      hook: 'preHandler', // Apply rate limiting in preHandler hook
      redis: undefined, // Use in-memory storage
      keyGenerator: function(request) {
        return request.ip; // Use IP address as the key
      },
      enableDraftSpec: true,
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
        'retry-after': true
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

    // Register routes
    await server.register(meteringRoutes, { prefix: '/api/v1' });

    await server.listen({
      port: parseInt(process.env.PORT || '3000'),
      host: '0.0.0.0'
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start(); 