import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './routes';
import { Database } from './db';
import { WebSocketManager } from './websocket';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environmental configuration
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

const fastify = Fastify({
  logger: true,
});

async function main() {
  const port = parseInt(process.env.PORT || '5000');
  
  // Register CORS
  await fastify.register(cors, {
    origin: '*', // Allow all origins for the sandbox/api portal
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  // Init DB and WebSocket Manager
  const db = new Database();
  const wsManager = new WebSocketManager(fastify);

  // Register all routes
  registerRoutes(fastify, db, wsManager);

  fastify.listen({ port, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    fastify.log.info(`VOURO API Server listening on ${address}`);
  });
}

main().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
