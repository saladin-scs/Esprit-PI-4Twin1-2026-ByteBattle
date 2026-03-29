import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketIoServerUrl } from '../config/publicEnv';

export interface ChatLine {
  id?: string;
  room?: string;
  message: string;
  user: { userId: string; username: string };
  timestamp: string | Date;
}

export interface UseSocketChatOptions {
  enabled?: boolean;
}

export interface UseSocketChatReturn {
  connected: boolean;
  lines: ChatLine[];
  typingUsers: Record<string, string>;
  sendMessage: (text: string) => void;
  setTyping: (typing: boolean) => void;
  prependHistory: (older: ChatLine[]) => void;
  error: string | null;
  transport: 'websocket' | 'polling' | 'unknown';
  reconnect: () => void;
  /** Messages en file d’attente (hors connexion temps réel). */
  pendingOutboundCount: number;
}

/**
 * Socket.IO — aligné sur ChatGateway Nest.
 * Filtre les messages par `room` si le serveur envoie le champ (multi-instance future).
 */
export function useSocketChat(
  room: string | null,
  options: UseSocketChatOptions = {},
): UseSocketChatReturn {
  const { enabled = true } = options;
  const [connected, setConnected] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [transport, setTransport] = useState<'websocket' | 'polling' | 'unknown'>('unknown');
  const socketRef = useRef<Socket | null>(null);
  const roomRef = useRef<string | null>(null);
  const pendingOutboundRef = useRef<string[]>([]);
  const [pendingOutboundCount, setPendingOutboundCount] = useState(0);

  const flushPendingOutbound = useCallback(() => {
    const s = socketRef.current;
    const r = roomRef.current;
    if (!s?.connected || !r) return;
    const q = [...pendingOutboundRef.current];
    pendingOutboundRef.current = [];
    setPendingOutboundCount(0);
    for (const t of q) {
      s.emit('message', { room: r, message: t });
    }
  }, []);

  const reconnect = useCallback(() => {
    const s = socketRef.current;
    if (s && !s.connected) {
      setError(null);
      s.connect();
    }
  }, []);

  useEffect(() => {
    if (!enabled || !room) {
      setConnected(false);
      setLines([]);
      setTypingUsers({});
      setTransport('unknown');
      pendingOutboundRef.current = [];
      setPendingOutboundCount(0);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Connexion requise pour le chat');
      setLines([]);
      setTypingUsers({});
      pendingOutboundRef.current = [];
      setPendingOutboundCount(0);
      return;
    }

    setLines([]);
    setTypingUsers({});
    setError(null);
    pendingOutboundRef.current = [];
    setPendingOutboundCount(0);
    roomRef.current = room;

    const serverUrl = getSocketIoServerUrl();
    const socket = serverUrl
      ? io(serverUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 20,
          reconnectionDelay: 600,
          reconnectionDelayMax: 12_000,
          randomizationFactor: 0.5,
        })
      : io({
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 20,
          reconnectionDelay: 600,
          reconnectionDelayMax: 12_000,
          randomizationFactor: 0.5,
        });

    socketRef.current = socket;

    const onMessage = (payload: ChatLine & { message: string; room?: string }) => {
      const activeRoom = roomRef.current;
      if (payload.room && activeRoom && payload.room !== activeRoom) return;
      setLines((prev) => [
        ...prev,
        {
          id: payload.id,
          room: payload.room,
          message: payload.message,
          user: payload.user,
          timestamp: payload.timestamp,
        },
      ]);
    };

    const onTyping = (payload: { userId: string; username: string; typing: boolean }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (payload.typing) next[payload.userId] = payload.username;
        else delete next[payload.userId];
        return next;
      });
    };

    const syncTransport = () => {
      const name = (socket.io.engine as { transport?: { name?: string } })?.transport?.name;
      setTransport(name === 'websocket' || name === 'polling' ? name : 'unknown');
    };

    socket.on('connect', () => {
      setConnected(true);
      syncTransport();
      const r = roomRef.current;
      if (r) socket.emit('join-room', r);
      setTimeout(() => flushPendingOutbound(), 200);
    });

    socket.io.engine?.on('upgrade', syncTransport);

    socket.on('disconnect', (reason) => {
      setConnected(false);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('connect_error', (err: Error) => {
      setError(err?.message || 'Connexion temps réel impossible');
    });

    socket.on('error', (payload: { message?: string; code?: string }) => {
      if (payload?.message) {
        const code = payload.code ? `[${payload.code}] ` : '';
        setError(`${code}${payload.message}`);
      }
    });

    socket.on('message', onMessage);
    socket.on('user-typing', onTyping);

    return () => {
      const r = roomRef.current;
      if (r && socket.connected) {
        socket.emit('leave-room', r);
      }
      socket.off('message', onMessage);
      socket.off('user-typing', onTyping);
      socket.disconnect();
      socketRef.current = null;
      roomRef.current = null;
      setConnected(false);
      setTransport('unknown');
    };
  }, [room, enabled, flushPendingOutbound]);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const s = socketRef.current;
    const r = roomRef.current;
    if (s?.connected && r) {
      s.emit('message', { room: r, message: trimmed });
      return;
    }
    if (r) {
      const cap = 20;
      if (pendingOutboundRef.current.length >= cap) {
        pendingOutboundRef.current.shift();
      }
      pendingOutboundRef.current.push(trimmed);
      setPendingOutboundCount(pendingOutboundRef.current.length);
    }
  }, []);

  const setTyping = useCallback((typing: boolean) => {
    const s = socketRef.current;
    const r = roomRef.current;
    if (!s?.connected || !r) return;
    s.emit('typing', { room: r, typing });
  }, []);

  const prependHistory = useCallback((older: ChatLine[]) => {
    setLines((prev) => [...older, ...prev]);
  }, []);

  return {
    connected,
    lines,
    typingUsers,
    sendMessage,
    setTyping,
    prependHistory,
    error,
    transport,
    reconnect,
    pendingOutboundCount,
  };
}
