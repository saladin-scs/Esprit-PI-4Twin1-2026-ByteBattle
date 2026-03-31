import type { ReclamationCategory, ReclamationStatus } from '../../services/api';

export const RECLAMATION_CATEGORY_LABELS: Record<ReclamationCategory, string> = {
  bug: 'Technical issue',
  account: 'Account or access',
  content: 'Content (challenge, course...)',
  harassment: 'Harassment or misconduct',
  other: 'Other',
};

export const RECLAMATION_STATUS_LABELS: Record<ReclamationStatus, string> = {
  open: 'Pending',
  read: 'Under review',
  resolved: 'Resolved',
  cancelled: 'Cancelled',
};

export const RECLAMATION_CATEGORIES_SELECT: { value: ReclamationCategory; label: string }[] = [
  { value: 'bug', label: RECLAMATION_CATEGORY_LABELS.bug },
  { value: 'account', label: RECLAMATION_CATEGORY_LABELS.account },
  { value: 'content', label: RECLAMATION_CATEGORY_LABELS.content },
  { value: 'harassment', label: RECLAMATION_CATEGORY_LABELS.harassment },
  { value: 'other', label: RECLAMATION_CATEGORY_LABELS.other },
];
