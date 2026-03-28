import * as Progress from '@radix-ui/react-progress';
import { cn } from '../../../lib/utils';

/** value 0–100 */
export function ProgressBar({
  value,
  className,
  indicatorClassName,
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
}) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <Progress.Root
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700',
        className,
      )}
      value={v}
    >
      <Progress.Indicator
        className={cn(
          'h-full rounded-full bg-primary-500 transition-all duration-500 ease-out dark:bg-primary-400',
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - v}%)` }}
      />
    </Progress.Root>
  );
}
