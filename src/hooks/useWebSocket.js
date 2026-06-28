import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = `ws://${window.location.hostname}:3000/ws`;

export default function useWebSocket() {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef(new Map());
  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === 1) return;

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[WS] Connected');
        setConnected(true);
        if (reconnectRef.current) {
          clearTimeout(reconnectRef.current);
          reconnectRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type } = data;
          if (type && listenersRef.current.has(type)) {
            listenersRef.current.get(type).forEach((cb) => cb(data));
          }
          if (listenersRef.current.has('*')) {
            listenersRef.current.get('*').forEach((cb) => cb(data));
          }
        } catch (err) {
          console.error('[WS] Parse error:', err.message);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected, reconnecting in 3s...');
        setConnected(false);
        wsRef.current = null;
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WS] Connection error:', err.message);
      reconnectRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  const on = useCallback((type, callback) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type).add(callback);
    return () => {
      const set = listenersRef.current.get(type);
      if (set) set.delete(callback);
    };
  }, []);

  return { send, on, connected };
}
