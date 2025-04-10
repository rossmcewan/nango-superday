import fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import meteringRoutes from './routes/metering';
import pool from './db';
import { RepositoryFactory } from './repositories/factory';

dotenv.config();

// Initialize repositories
RepositoryFactory.initialize(pool);

const server = fastify({
  logger: true
});

// Register CORS
server.register(cors, {
  origin: true
});

// Register routes
server.register(meteringRoutes, { prefix: '/api/v1' });

// Start server
const start = async () => {
  try {
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