import { Link } from 'react-router-dom';
import { MessageCircle, Trophy, Zap } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

const STORAGE_KEY = 'bb_post_register_onboarding';

export function shouldShowPostRegisterOnboarding(): boolean {
  return sessionStorage.getItem(STORAGE_KEY) === '1';
}

export function clearPostRegisterOnboardingFlag(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function setPostRegisterOnboardingFlag(): void {
  sessionStorage.setItem(STORAGE_KEY, '1');
}

interface PostRegisterOnboardingModalProps {
  open: boolean;
  onDismiss: () => void;
}

export function PostRegisterOnboardingModal({ open, onDismiss }: PostRegisterOnboardingModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bb-onboarding-title"
    >
      <Card className="bb-card relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-2xl">
        <h2 id="bb-onboarding-title" className="bb-section-title mb-1 text-lg">
          Welcome to ByteBattle
        </h2>
        <p className="bb-body-text mb-5 text-sm">Three steps to get started:</p>
        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400">
              <Zap className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">1. First challenge</p>
              <p className="bb-body-text text-sm">Open a challenge and submit a solution.</p>
              <Link to="/challenges" className="mt-1 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                View challenges →
              </Link>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <MessageCircle className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">2. First chat</p>
              <p className="bb-body-text text-sm">In a challenge, use the Chat tab; in a contest, use the right column.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Trophy className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">3. First contest</p>
              <p className="bb-body-text text-sm">Join a timed competition.</p>
              <Link to="/competitions" className="mt-1 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400">
                View contests →
              </Link>
            </div>
          </li>
        </ol>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onDismiss}>
            Close
          </Button>
          <Link to="/dashboard">
            <Button type="button" onClick={onDismiss}>
              Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
