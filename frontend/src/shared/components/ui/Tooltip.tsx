import type { ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../../lib/utils';

export function TooltipProvider({
  children,
  delayDuration = 200,
}: {
  children: ReactNode;
  delayDuration?: number;
}) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration}>{children}</TooltipPrimitive.Provider>;
}

export function SimpleTooltip({
  children,
  content,
  side = 'top',
  className,
}: {
  children: ReactNode;
  content: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-[200] max-w-xs rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 text-xs text-white shadow-lg dark:border-slate-600 dark:bg-slate-800',
            className,
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-slate-900 dark:fill-slate-800" width={10} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
