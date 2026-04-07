import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Button, Modal } from '../shared/components';

type PopupVariant = 'default' | 'danger' | 'success';

interface PopupOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: PopupVariant;
}

interface PopupRequest extends PopupOptions {
  kind: 'confirm' | 'alert';
  resolve: (accepted: boolean) => void;
}

interface PopupContextValue {
  confirm: (options: PopupOptions) => Promise<boolean>;
  alert: (options: Omit<PopupOptions, 'cancelText'>) => Promise<void>;
}

const PopupContext = createContext<PopupContextValue | null>(null);

export function PopupProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<PopupRequest | null>(null);

  const confirm = useCallback((options: PopupOptions) => {
    return new Promise<boolean>((resolve) => {
      setCurrent({
        kind: 'confirm',
        title: options.title ?? 'Please confirm',
        message: options.message,
        confirmText: options.confirmText ?? 'Confirm',
        cancelText: options.cancelText ?? 'Cancel',
        variant: options.variant ?? 'default',
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: Omit<PopupOptions, 'cancelText'>) => {
    return new Promise<void>((resolve) => {
      setCurrent({
        kind: 'alert',
        title: options.title ?? 'Information',
        message: options.message,
        confirmText: options.confirmText ?? 'OK',
        cancelText: '',
        variant: options.variant ?? 'default',
        resolve: () => resolve(),
      });
    });
  }, []);

  const closeWith = useCallback((accepted: boolean) => {
    setCurrent((prev) => {
      if (prev) prev.resolve(accepted);
      return null;
    });
  }, []);

  const value = useMemo<PopupContextValue>(() => ({ confirm, alert }), [confirm, alert]);
  const isDanger = current?.variant === 'danger';
  const confirmVariant: 'primary' | 'danger' = isDanger ? 'danger' : 'primary';

  return (
    <PopupContext.Provider value={value}>
      {children}
      <Modal
        isOpen={!!current}
        onClose={() => closeWith(false)}
        title={current?.title || 'Information'}
      >
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{current?.message}</p>
        <div className="mt-6 flex items-center justify-end gap-2">
          {current?.kind === 'confirm' && (
            <Button variant="secondary" onClick={() => closeWith(false)}>
              {current.cancelText}
            </Button>
          )}
          <Button variant={confirmVariant} onClick={() => closeWith(true)}>
            {current?.confirmText}
          </Button>
        </div>
      </Modal>
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const ctx = useContext(PopupContext);
  if (!ctx) throw new Error('usePopup must be used within PopupProvider');
  return ctx;
}
