import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  MessageCircle,
  Send,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocketChat, type ChatLine } from '../../hooks/useSocketChat';
import { chatApi } from '../../services/api';
import { cn } from '../../lib/utils';
import { useDebouncedCallback } from 'use-debounce';
import { RootState } from '../../store/store';

const HISTORY_PAGE = 45;

export interface CollaborationChatProps {
  room: string;
  title?: string;
  className?: string;
  enabled?: boolean;
  /** Hauteur max. zone messages (scroll) */
  messagesMaxHeightClass?: string;
}

function formatTime(d: string | Date) {
  try {
    const x = typeof d === 'string' ? new Date(d) : d;
    return x.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function CollaborationChat({
  room,
  title = 'Discussion',
  className,
  enabled = true,
  messagesMaxHeightClass = 'max-h-[min(360px,42vh)]',
}: CollaborationChatProps) {
  const [input, setInput] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  const myId = useSelector((s: RootState) => s.auth.user?.id ?? null);

  const {
    connected,
    lines,
    typingUsers,
    sendMessage,
    setTyping,
    prependHistory,
    error,
    transport,
    reconnect,
  } = useSocketChat(enabled ? room : null, { enabled });

  const roomFetchRef = useRef(room);
  roomFetchRef.current = room;
  const linesRef = useRef(lines);
  linesRef.current = lines;

  const initialHistoryLoaded = useRef(false);

  useEffect(() => {
    initialHistoryLoaded.current = false;
    setHasMoreHistory(true);
  }, [room]);

  useEffect(() => {
    if (!enabled || !room) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const requestedRoom = room;
    let cancelled = false;
    setHistoryLoading(true);
    chatApi
      .getHistory(requestedRoom, { limit: HISTORY_PAGE })
      .then((res) => {
        if (cancelled || roomFetchRef.current !== requestedRoom) return;
        const mapped: ChatLine[] = (res.data.messages ?? []).map((m) => ({
          id: m.id,
          room: requestedRoom,
          message: m.body,
          user: { userId: m.userId, username: m.username },
          timestamp: m.createdAt,
        }));
        prependHistory(mapped);
        setHasMoreHistory(mapped.length >= HISTORY_PAGE);
        initialHistoryLoaded.current = true;
      })
      .catch(() => {
        setHasMoreHistory(false);
      })
      .finally(() => {
        if (!cancelled && roomFetchRef.current === requestedRoom) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [room, enabled, prependHistory]);

  const loadOlder = useCallback(async () => {
    if (!room || loadingOlder || !hasMoreHistory) return;
    const oldest = linesRef.current[0]?.id;
    if (!oldest) return;
    const el = scrollRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;
    setLoadingOlder(true);
    try {
      const res = await chatApi.getHistory(room, { limit: HISTORY_PAGE, before: oldest });
      const mapped: ChatLine[] = (res.data.messages ?? []).map((m) => ({
        id: m.id,
        room,
        message: m.body,
        user: { userId: m.userId, username: m.username },
        timestamp: m.createdAt,
      }));
      if (mapped.length < HISTORY_PAGE) setHasMoreHistory(false);
      if (mapped.length) prependHistory(mapped);
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop = el.scrollHeight - prevScrollHeight + el.scrollTop;
        }
      });
    } catch {
      setHasMoreHistory(false);
    } finally {
      setLoadingOlder(false);
    }
  }, [room, loadingOlder, hasMoreHistory, prependHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    const last = lines.length ? lines[lines.length - 1] : null;
    if (last && liveRef.current) {
      liveRef.current.textContent = `${last.user.username}: ${last.message.slice(0, 120)}${last.message.length > 120 ? '…' : ''}`;
    }
  }, [lines.length]);

  const emitTypingDebounced = useDebouncedCallback((typing: boolean) => {
    setTyping(typing);
  }, 400);

  const onInputChange = useCallback(
    (v: string) => {
      setInput(v);
      if (v.trim()) emitTypingDebounced(true);
      else emitTypingDebounced(false);
    },
    [emitTypingDebounced],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    emitTypingDebounced(false);
    setInput('');
  };

  const typingLabel = Object.values(typingUsers).filter(Boolean).join(', ');
  const transportLabel =
    transport === 'websocket' ? 'WebSocket' : transport === 'polling' ? 'Polling' : '…';

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900/90 dark:ring-white/5',
        className,
      )}
      role="region"
      aria-label={title}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2.5 dark:border-slate-700 sm:px-4">
        <MessageCircle className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span
            className="hidden rounded-full bg-slate-100 px-2 py-0.5 font-mono dark:bg-slate-800 sm:inline"
            title="Transport Socket.IO"
          >
            {transportLabel}
          </span>
          {connected ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Wifi className="h-3.5 w-3.5" aria-hidden />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <WifiOff className="h-3.5 w-3.5" aria-hidden />
              {historyLoading ? 'Sync…' : 'Hors ligne'}
            </span>
          )}
          {!connected && !historyLoading && (
            <button
              type="button"
              onClick={() => reconnect()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <RefreshCw className="h-3 w-3" aria-hidden />
              Reconnecter
            </button>
          )}
        </div>
      </div>

      <div ref={liveRef} className="sr-only" aria-live="polite" aria-atomic="true" />

      {error && (
        <p
          className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200"
          role="alert"
        >
          {error}
        </p>
      )}

      <div
        ref={scrollRef}
        className={cn(
          'min-h-[180px] flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-2',
          messagesMaxHeightClass,
        )}
        role="log"
        aria-label="Fil de messages"
        aria-relevant="additions"
      >
        {hasMoreHistory && lines.length > 0 && (
          <div className="flex justify-center pb-1">
            <button
              type="button"
              onClick={() => void loadOlder()}
              disabled={loadingOlder}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {loadingOlder ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              )}
              Messages plus anciens
            </button>
          </div>
        )}

        {lines.length === 0 && !historyLoading && (
          <p className="py-10 text-center text-xs text-slate-500">
            Aucun message. Sois le premier à écrire.
          </p>
        )}

        <AnimatePresence initial={false}>
          {lines.map((line, i) => {
            const mine = myId != null && line.user.userId === myId;
            return (
              <motion.div
                key={line.id ?? `${line.user.userId}-${i}-${String(line.timestamp)}`}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  'max-w-[92%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                  mine
                    ? 'ml-auto bg-primary-600 text-white dark:bg-primary-700'
                    : 'mr-auto border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/80',
                )}
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      mine ? 'text-primary-100' : 'text-primary-700 dark:text-primary-300',
                    )}
                  >
                    {mine ? 'Moi' : line.user.username || 'Joueur'}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] uppercase tracking-wide',
                      mine ? 'text-primary-200/90' : 'text-slate-400',
                    )}
                  >
                    {formatTime(line.timestamp)}
                  </span>
                </div>
                <p
                  className={cn(
                    'mt-1 whitespace-pre-wrap break-words',
                    mine ? 'text-white' : 'text-slate-700 dark:text-slate-200',
                  )}
                >
                  {line.message}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {typingLabel ? (
        <p className="px-3 pb-1 text-[11px] italic text-slate-500 dark:text-slate-400">
          <span className="inline-flex gap-1">
            <span className="font-medium not-italic text-slate-600 dark:text-slate-300">
              {typingLabel}
            </span>
            écrit…
          </span>
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="border-t border-slate-200 p-2 dark:border-slate-700"
        aria-label="Envoyer un message"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onBlur={() => setTyping(false)}
            placeholder={connected ? 'Écrire un message…' : 'Connexion temps réel requise'}
            disabled={!connected}
            maxLength={2000}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={!connected || !input.trim()}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-white shadow-sm hover:bg-primary-700 disabled:opacity-40"
            aria-label="Envoyer le message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-right text-[10px] text-slate-400">{input.length}/2000</p>
      </form>
    </div>
  );
}
