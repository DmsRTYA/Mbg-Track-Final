// lib/useWebSocket.js
// React hook untuk WebSocket real-time di semua dashboard
import { useEffect, useRef, useCallback, useState } from 'react';

const WS_RECONNECT_DELAY = 3000;
const WS_PING_INTERVAL   = 20000;

export function useWebSocket(user, onMessage) {
  const wsRef      = useRef(null);
  const pingRef    = useRef(null);
  const retryRef   = useRef(null);
  const mountedRef = useRef(true);

  const [connected, setConnected]   = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const connect = useCallback(() => {
    if (!user?.id || typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host     = window.location.host;
    const url      = `${protocol}//${host}/ws?userId=${user.id}&role=${user.role}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        setReconnecting(false);
        // Mulai ping
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, WS_PING_INTERVAL);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') return; // ignore pong
          onMessage?.(data);
        } catch (_) {}
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        clearInterval(pingRef.current);
        // Auto-reconnect
        setReconnecting(true);
        retryRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, WS_RECONNECT_DELAY);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (_) {}
  }, [user?.id, user?.role]);

  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearInterval(pingRef.current);
      clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, reconnecting, send };
}
