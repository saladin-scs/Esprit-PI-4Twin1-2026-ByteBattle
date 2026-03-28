import type { ReclamationStatus } from '../../../services/api';
import { RECLAMATION_STATUS_LABELS } from '../constants';

const STYLES: Record<ReclamationStatus, string> = {
  open: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  read: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100',
  resolved: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  cancelled: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};

export function ReclamationStatusBadge({ status }: { status: ReclamationStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {RECLAMATION_STATUS_LABELS[status]}
    </span>
  );
}
