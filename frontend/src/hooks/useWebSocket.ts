/**
 * Hook WebSocket avec reconnexion automatique (backoff exponentiel).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type WebSocketStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error';

export interface UseWebSocketOptions {
  /** Reconnexion automatique (défaut: true) */
  reconnect?: boolean;
  /** Délai initial de reconnexion (ms) */
  reconnectInterval?: number;
  /** Délai max de reconnexion (ms) */
  reconnectMaxInterval?: number;
  /** Facteur de backoff */
  reconnectBackoff?: number;
  /** Nombre max de tentatives (0 = illimité) */
  reconnectAttempts?: number;
  /** Connexion uniquement si true (ex. when authenticated) */
  enabled?: boolean;
  /** Callback à l'ouverture */
  onOpen?: (ev: Event) => void;
  /** Callback à la fermeture */
  onClose?: (ev: CloseEvent) => void;
  /** Callback erreur */
  onError?: (ev: Event) => void;
}

export interface UseWebSocketReturn {
  status: WebSocketStatus;
  lastMessage: MessageEvent | null;
  send: (data: string | ArrayBufferLike | Blob) => void;
  close: () => void;
  reconnect: () => void;
}

export function useWebSocket(
  url: string | null,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    reconnect: shouldReconnect = true,
    reconnectInterval = 1000,
    reconnectMaxInterval = 30000,
    reconnectBackoff = 1.5,
    reconnectAttempts = 0,
    enabled = true,
    onOpen,
    onClose,
    onError,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>('closed');
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  const connect = useCallback(() => {
    if (!url || !enabled) return;

    setStatus('connecting');
    const ws = new WebSocket(url);

    ws.onopen = (ev) => {
      attemptRef.current = 0;
      setStatus('open');
      onOpen?.(ev);
    };

    ws.onmessage = (ev) => setLastMessage(ev);

    ws.onclose = (ev) => {
      wsRef.current = null;
      setStatus('closed');
      onClose?.(ev);

      if (shouldReconnect && enabled && url) {
        const next =
          reconnectAttempts > 0 && attemptRef.current >= reconnectAttempts
            ? null
            : Math.min(
                reconnectInterval * reconnectBackoff ** attemptRef.current,
                reconnectMaxInterval
              );
        if (next != null) {
          attemptRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => connect(), next);
        }
      }
    };

    ws.onerror = (ev) => {
      setStatus('error');
      onError?.(ev);
    };

    wsRef.current = ws;
  }, [
    url,
    enabled,
    shouldReconnect,
    reconnectInterval,
    reconnectMaxInterval,
    reconnectBackoff,
    reconnectAttempts,
    onOpen,
    onClose,
    onError,
  ]);

  useEffect(() => {
    if (url && enabled) connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus('closed');
    };
  }, [url, enabled, connect]);

  const send = useCallback((data: string | ArrayBufferLike | Blob) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(data);
  }, []);

  const close = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('closed');
  }, []);

  const reconnect = useCallback(() => {
    attemptRef.current = 0;
    if (wsRef.current) wsRef.current.close();
    else if (url && enabled) connect();
  }, [url, enabled, connect]);

  return { status, lastMessage, send, close, reconnect };
}
