import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export function createSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info('Socket.IO: client connected', { socketId: socket.id });

    socket.on('disconnect', (reason) => {
      logger.info('Socket.IO: client disconnected', { socketId: socket.id, reason });
    });

    socket.on('ping', () => {
      socket.emit('pong', { time: new Date().toISOString() });
    });
  });

  return io;
}
