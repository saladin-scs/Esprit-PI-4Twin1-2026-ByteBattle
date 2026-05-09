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

// Restore missing export
export const RECLAMATION_CATEGORIES_SELECT: { value: ReclamationCategory; label: string }[] = [
  { value: 'bug', label: RECLAMATION_CATEGORY_LABELS.bug },
  { value: 'account', label: RECLAMATION_CATEGORY_LABELS.account },
  { value: 'content', label: RECLAMATION_CATEGORY_LABELS.content },
  { value: 'harassment', label: RECLAMATION_CATEGORY_LABELS.harassment },
  { value: 'other', label: RECLAMATION_CATEGORY_LABELS.other },
];

// New tags with urgency levels
export type ReportTag =
  | 'website_bug'
  | 'account_stolen'
  | 'payment_issue'
  | 'content_error'
  | 'harassment'
  | 'other';

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export const TAG_OPTIONS: { value: ReportTag; label: string; urgency: UrgencyLevel }[] = [
  { value: 'website_bug', label: 'Website bug', urgency: 'high' },
  { value: 'account_stolen', label: 'Account or email stolen', urgency: 'critical' },
  { value: 'payment_issue', label: 'Payment issue', urgency: 'critical' },
  { value: 'content_error', label: 'Content error', urgency: 'medium' },
  { value: 'harassment', label: 'Harassment', urgency: 'high' },
  { value: 'other', label: 'Other', urgency: 'low' },
];

export const URGENCY_ORDER: Record<UrgencyLevel, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

export function getUrgencyFromTag(tag: ReportTag): UrgencyLevel {
  const found = TAG_OPTIONS.find(t => t.value === tag);
  return found?.urgency ?? 'low';
}

export function mapTagToCategory(tag: ReportTag): ReclamationCategory {
  switch (tag) {
    case 'website_bug': return 'bug';
    case 'account_stolen': return 'account';
    case 'payment_issue': return 'account';
    case 'content_error': return 'content';
    case 'harassment': return 'harassment';
    default: return 'other';
  }
}

export const TAG_SELECT_OPTIONS = TAG_OPTIONS.map(({ value, label }) => ({ value, label }));