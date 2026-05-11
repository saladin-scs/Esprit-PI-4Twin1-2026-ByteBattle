/**
 * WebSocket hook with automatic reconnection (exponential backoff).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type WebSocketStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error';

export interface UseWebSocketOptions {
  /** Automatic reconnection (default: true) */
  reconnect?: boolean;
  /** Initial reconnection delay (ms) */
  reconnectInterval?: number;
  /** Maximum reconnection delay (ms) */
  reconnectMaxInterval?: number;
  /** Backoff factor */
  reconnectBackoff?: number;
  /** Maximum number of attempts (0 = unlimited) */
  reconnectAttempts?: number;
  /** Connect only when true (e.g. when authenticated) */
  enabled?: boolean;
  /** Callback on open */
  onOpen?: (ev: Event) => void;
  /** Callback on close */
  onClose?: (ev: CloseEvent) => void;
  /** Error callback */
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
