import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { cacheService } from './services/cache.service';
import { createSocketServer } from './sockets/socket.handler';
import { setSocketServer } from './controllers/disaster.controller';
import { config } from './config/env';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Connect to Redis (with in-memory fallback)
    await cacheService.connect();

    // Create Express app
    const app = createApp();

    // Create HTTP server
    const httpServer = http.createServer(app);

    // Create Socket.IO server
    const io = createSocketServer(httpServer);
    setSocketServer(io);

    // Start listening
    httpServer.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`, {
        env: config.nodeEnv,
        swagger: `http://localhost:${config.port}/api-docs`,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      httpServer.close(async () => {
        await cacheService.disconnect();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

bootstrap();
