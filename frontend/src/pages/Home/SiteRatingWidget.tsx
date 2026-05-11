import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Star } from 'lucide-react';
import { SITE_RATING_MAX_STARS, siteRatingsApi } from '../../services/api';
import { Button, Alert } from '../../shared/components';
import type { RootState } from '../../store/store';
import { cn } from '../../lib/utils';

const LABELS: Record<number, string> = {
  1: 'very satisfied',
  2: 'somewhat satisfied',
  3: 'neutral',
  4: 'satisfied',
  5: 'very satisfied',
};

export function SiteRatingWidget({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const [stats, setStats] = useState<{ average: number; count: number } | null>(null);
  const [savedStars, setSavedStars] = useState<number | null>(null);
  const [draftStars, setDraftStars] = useState<number | null>(null);
  const [hoverStars, setHoverStars] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refreshStats = useCallback(async () => {
    try {
      const { data } = await siteRatingsApi.getStats();
      setStats({ average: data.average, count: data.count });
    } catch {
      setStats(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingStats(true);
      await refreshStats();
      if (!cancelled) setLoadingStats(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshStats]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedStars(null);
      setDraftStars(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await siteRatingsApi.getMe();
        if (!cancelled) setSavedStars(data.stars);
      } catch {
        if (!cancelled) setSavedStars(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const lit = hoverStars || draftStars || savedStars || 0;
  const effectiveChoice = draftStars ?? savedStars;

  const submit = async () => {
    const stars = draftStars ?? savedStars;
    if (!stars || stars < 1 || stars > SITE_RATING_MAX_STARS) return;
    const prevSaved = savedStars;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await siteRatingsApi.setRating(stars);
      setSavedStars(stars);
      setDraftStars(null);
      setSuccess(
        prevSaved != null && prevSaved !== stars
          ? 'Rating updated successfully.'
          : 'Rating saved successfully.',
      );
      await refreshStats();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } }; message?: string };
      const msg = ax?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || ax?.message || 'Envoi impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        'mx-auto max-w-md rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-6 py-5 dark:bg-amber-400/[0.08]',
        compact ? 'mt-0' : 'mt-10',
        className,
      )}
      aria-label="Note sur l’application"
    >
      <p className="bb-section-title text-center text-sm font-semibold tracking-wide text-amber-950/90 dark:text-amber-100">
        your feedback matters! ⭐
      </p>
      <p className="bb-body-text mt-1 text-center text-sm text-gray-700 dark:text-gray-300">
        Choose between <strong>1 and 5 stars</strong> based on your experience on the platform.
      </p>

      {!loadingStats && stats && stats.count > 0 && (
        <p className="mt-3 text-center text-xs text-gray-600 dark:text-gray-400">
          Community average:{' '}
          <span className="font-semibold text-amber-800 dark:text-amber-200">
            {stats.average.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} /{' '}
            {SITE_RATING_MAX_STARS}
          </span>{' '}
          · {stats.count} reviews
        </p>
      )}

      <div
        className="mt-4 flex justify-center gap-2 sm:gap-3"
        role="group"
        aria-label={`Notation de 1 à ${SITE_RATING_MAX_STARS} étoiles`}
        onMouseLeave={() => setHoverStars(0)}
      >
        {Array.from({ length: SITE_RATING_MAX_STARS }, (_, i) => {
          const n = i + 1;
          const filled = n <= lit;
          return (
            <button
              key={n}
              type="button"
              className="rounded-lg p-1 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
              aria-label={`${n} étoile${n > 1 ? 's' : ''} — ${LABELS[n]}`}
              aria-pressed={effectiveChoice === n}
              onMouseEnter={() => setHoverStars(n)}
              onClick={() => {
                if (!isAuthenticated) return;
                setDraftStars(n);
                setSuccess('');
                setError('');
              }}
            >
              <Star
                className={`h-9 w-9 sm:h-10 sm:w-10 transition-colors ${
                  filled
                    ? 'fill-amber-400 text-amber-500 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)] dark:fill-amber-300 dark:text-amber-200'
                    : 'fill-transparent text-gray-400 dark:text-gray-600'
                }`}
                strokeWidth={filled ? 0 : 1.5}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      {effectiveChoice != null && effectiveChoice >= 1 && (
        <p className="mt-2 text-center text-xs font-medium text-amber-900/80 dark:text-amber-200/90">
          {LABELS[effectiveChoice]}
        </p>
      )}

      {!isAuthenticated && (
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <Link to="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Sign in
          </Link>{' '}
          or{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            create an account
          </Link>{' '}
          to save your rating.
        </p>
      )}

      {isAuthenticated && (
        <div className="mt-4 space-y-3">
          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <Button
            type="button"
            fullWidth
            disabled={draftStars == null || submitting}
            loading={submitting}
            onClick={() => void submit()}
          >
            {savedStars != null ? 'Update my rating' : 'Save my rating'}
          </Button>
          {savedStars != null && draftStars == null && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
             saved rating : {savedStars} / {SITE_RATING_MAX_STARS}. You can update your rating.
            </p>
          )}
        </div>
      )}
    </div>
  );
}