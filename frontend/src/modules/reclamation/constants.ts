import type { ReclamationCategory, ReclamationStatus } from '../../services/api';

export const RECLAMATION_CATEGORY_LABELS: Record<ReclamationCategory, string> = {
  bug: 'Problème technique',
  account: 'Compte ou accès',
  content: 'Contenu (défi, cours…)',
  harassment: 'Comportement ou harcèlement',
  other: 'Autre',
};

export const RECLAMATION_STATUS_LABELS: Record<ReclamationStatus, string> = {
  open: 'En attente',
  read: 'Prise en compte',
  resolved: 'Résolue',
  cancelled: 'Annulée',
};

export const RECLAMATION_CATEGORIES_SELECT: { value: ReclamationCategory; label: string }[] = [
  { value: 'bug', label: RECLAMATION_CATEGORY_LABELS.bug },
  { value: 'account', label: RECLAMATION_CATEGORY_LABELS.account },
  { value: 'content', label: RECLAMATION_CATEGORY_LABELS.content },
  { value: 'harassment', label: RECLAMATION_CATEGORY_LABELS.harassment },
  { value: 'other', label: RECLAMATION_CATEGORY_LABELS.other },
];
