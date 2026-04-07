import { useState, useEffect, useCallback } from 'react';
import { competitionsApi, challengesApi } from '../../services/api';
import type { CompetitionDetail } from './types';
import type { SubmitResult } from './types';

interface ChallengeInfo {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  languages: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  starterCode: Record<string, string>;
}

function normalizeChallengeId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    const id = (value as { _id?: unknown })._id;
    if (typeof id === 'string') return id;
  }
  return null;
}

function normalizeChallengeObject(value: unknown): ChallengeInfo | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Partial<ChallengeInfo> & { _id?: unknown };
  if (typeof obj._id !== 'string') return null;
  if (typeof obj.title !== 'string' || typeof obj.description !== 'string') return null;
  return {
    _id: obj._id,
    title: obj.title,
    description: obj.description,
    difficulty: typeof obj.difficulty === 'string' ? obj.difficulty : 'medium',
    languages: Array.isArray(obj.languages) ? obj.languages : ['python', 'javascript'],
    examples: Array.isArray(obj.examples) ? obj.examples : [],
    starterCode: obj.starterCode ?? {},
  };
}

function getSupportedLanguages(comp?: CompetitionDetail | null): string[] {
  if (comp?.supportedLanguages?.length) return comp.supportedLanguages;
  return ['python', 'javascript'];
}

function buildFallbackChallenge(comp?: CompetitionDetail | null): ChallengeInfo {
  const langs = getSupportedLanguages(comp);
  const starterCode = langs.reduce<Record<string, string>>((acc, lang) => {
    acc[lang] = DEFAULT_STARTER[lang] ?? DEFAULT_STARTER.python;
    return acc;
  }, {});

  return {
    _id: 'fallback',
    title: 'Competition challenge',
    description:
      'The challenge statement is currently unavailable. You can still write code below and submit when the challenge is configured.',
    difficulty: comp?.difficulty ?? 'medium',
    languages: langs,
    examples: [],
    starterCode,
  };
}

const DEFAULT_STARTER: Record<string, string> = {
  javascript: '// Your code here\n',
  python: '# Your code here\n',
  java: '// Your code here\n',
  cpp: '// Your code here\n',
};

export function useCompetitionDetail(id: string | undefined) {
  const [competition, setCompetition] = useState<CompetitionDetail | null>(null);
  const [challenge, setChallenge] = useState<ChallengeInfo | null>(null);
  const [challenges, setChallenges] = useState<ChallengeInfo[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState('python');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const challengeId = selectedChallengeId || competition?.challengeIds?.[0];

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setSubmitResult(null);
      setSubmitError(null);

      try {
        const res = await competitionsApi.getOne(id);
        const comp = res.data as CompetitionDetail;
        if (!mounted) return;

        setCompetition(comp);

        const responseChallenges = (comp.challenges ?? [])
          .map((c) => normalizeChallengeObject(c))
          .filter((c): c is ChallengeInfo => !!c);

        const challengeIds = (comp.challengeIds ?? [])
          .map((c) => normalizeChallengeId(c))
          .filter((c): c is string => !!c);

        const challengeMap = new Map<string, ChallengeInfo>();
        responseChallenges.forEach((c) => challengeMap.set(c._id, c));

        const missingIds = challengeIds.filter((cid) => !challengeMap.has(cid));
        if (missingIds.length) {
          const fetched = await Promise.allSettled(missingIds.map((cid) => challengesApi.getOne(cid)));
          if (!mounted) return;

          fetched.forEach((r) => {
            if (r.status !== 'fulfilled') return;
            const c = normalizeChallengeObject(r.value.data);
            if (c) challengeMap.set(c._id, c);
          });
        }

        const orderedChallenges = challengeIds
          .map((cid) => challengeMap.get(cid))
          .filter((c): c is ChallengeInfo => !!c);
        const extraChallenges = [...challengeMap.values()].filter(
          (c) => !challengeIds.includes(c._id),
        );
        const resolvedChallenges = [...orderedChallenges, ...extraChallenges];

        let resolvedChallenge: ChallengeInfo;
        if (resolvedChallenges.length) {
          resolvedChallenge = resolvedChallenges[0];
        } else {
          resolvedChallenge = buildFallbackChallenge(comp);
          if (challengeIds.length) {
            setSubmitError('Challenge details are unavailable right now. You can still write code and try submitting.');
          } else {
            setSubmitError('No challenge is configured for this competition yet.');
          }
        }

        setChallenges(resolvedChallenges);
        setChallenge(resolvedChallenge);
        setSelectedChallengeId(
          resolvedChallenge._id !== 'fallback' ? resolvedChallenge._id : challengeIds[0] ?? '',
        );

        const langs = comp.supportedLanguages?.length
          ? comp.supportedLanguages
          : (resolvedChallenge.languages ?? ['python', 'javascript']);
        const lang = langs.includes('python') ? 'python' : langs[0];
        setSelectedLang(lang);
        const starter = resolvedChallenge.starterCode?.[lang] ?? DEFAULT_STARTER[lang] ?? '';
        setCode(starter || '');
      } catch (err: unknown) {
        if (!mounted) return;
        const msg =
          err &&
          typeof err === 'object' &&
          'response' in err &&
          (err as { response?: { data?: { message?: string } } }).response?.data?.message
            ? (err as { response: { data: { message: string } } }).response.data.message
            : err instanceof Error
              ? err.message
              : 'Failed to load competition';
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (challenge && selectedLang) {
      setCode(challenge.starterCode?.[selectedLang] ?? DEFAULT_STARTER[selectedLang] ?? '');
    }
  }, [challenge?._id, selectedLang]);

  const selectChallenge = useCallback(
    (newChallengeId: string) => {
      setSelectedChallengeId(newChallengeId);
      const next = challenges.find((c) => c._id === newChallengeId);
      if (!next) return;

      setChallenge(next);
      const langs = competition?.supportedLanguages?.length
        ? competition.supportedLanguages
        : (next.languages ?? ['python', 'javascript']);
      const lang = langs.includes(selectedLang) ? selectedLang : (langs.includes('python') ? 'python' : langs[0]);
      setSelectedLang(lang);
      setCode(next.starterCode?.[lang] ?? DEFAULT_STARTER[lang] ?? '');
    },
    [challenges, competition?.supportedLanguages, selectedLang],
  );

  const submit = useCallback(() => {
    if (!id || !code.trim()) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setSubmitError('Please log in to submit your code.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);
    competitionsApi
      .submit(id, { code, language: selectedLang, challengeId: challengeId ?? undefined })
      .then((res: { data: SubmitResult }) => {
        setSubmitResult(res.data);
      })
      .catch((err: unknown) => {
        const ax = err as {
          response?: { status?: number; data?: { message?: string | string[] } };
        };
        if (ax.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          setSubmitError('Session expired. Please sign in again.');
          return;
        }

        const rawMessage = ax.response?.data?.message;
        const apiMessage = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
        const msg = apiMessage ?? (err instanceof Error ? err.message : 'Submission failed');
        setSubmitError(msg);
      })
      .finally(() => setSubmitting(false));
  }, [id, code, selectedLang, challengeId]);

  return {
    competition,
    challenge,
    challenges,
    selectedChallengeId,
    setSelectedChallengeId: selectChallenge,
    loading,
    error,
    selectedLang,
    setSelectedLang,
    code,
    setCode,
    submit,
    submitting,
    submitResult,
    submitError,
  };
}
