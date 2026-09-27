import { useEffect, useState } from 'react';
import type { SocketDisasterEvent } from '../types';

interface RealtimeToastProps {
  event: SocketDisasterEvent | null;
}

export function RealtimeToast({ event }: RealtimeToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!event) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [event]);

  if (!visible || !event) return null;

  const actionLabel = {
    created: '🆕 Created',
    updated: '✏️ Updated',
    deleted: '🗑️ Deleted',
  }[event.action];

  return (
    <div
      id="realtime-notification"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-blue-700 bg-blue-900/90 px-4 py-3 shadow-2xl backdrop-blur-sm animate-pulse"
    >
      <div className="h-2 w-2 rounded-full bg-blue-400 animate-ping" />
      <div>
        <p className="text-xs font-semibold text-blue-300">Real-time Update</p>
        <p className="text-sm text-blue-100">
          {actionLabel}: {event.disaster.title ?? `Disaster ${event.disaster.id}`}
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="ml-2 text-blue-400 hover:text-blue-200 text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
