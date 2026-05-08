import type { ReclamationStatus } from '../../../services/api';

type Props = {
  status: ReclamationStatus;
};

const LABEL: Record<ReclamationStatus, string> = {
  open: 'Pending',
  read: 'Under review',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

const CLASS: Record<ReclamationStatus, string> = {
  open: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  read: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

export function ReclamationStatusBadge({ status }: Props) {
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${CLASS[status]}`}>{LABEL[status]}</span>;
}
