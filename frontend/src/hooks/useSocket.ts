import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SocketDisasterEvent } from '../types';

interface UseSocketReturn {
  lastEvent: SocketDisasterEvent | null;
  isConnected: boolean;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [lastEvent, setLastEvent] = useState<SocketDisasterEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('disaster_updated', (event: SocketDisasterEvent) => {
      setLastEvent(event);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { lastEvent, isConnected };
}
