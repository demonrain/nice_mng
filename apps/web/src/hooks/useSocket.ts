import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { notification } from 'antd';
import { WS_EVENTS } from '@nice-admin/shared';
import { useAuthStore } from '@/store/auth';

/** 建立 WebSocket 连接，接收实时通知 */
export function useSocket(onOnlineCount?: (count: number) => void) {
  const token = useAuthStore((s) => s.accessToken);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;
    const socket = io('/', {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on(WS_EVENTS.NOTICE, (payload: { title: string; content: string; type?: string }) => {
      notification.open({
        message: payload.title,
        description: payload.content,
        type: payload.type === 'WARN' ? 'warning' : 'info',
      });
    });

    socket.on(WS_EVENTS.ONLINE_COUNT, (payload: { count: number }) => {
      onOnlineCount?.(payload.count);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return socketRef;
}
