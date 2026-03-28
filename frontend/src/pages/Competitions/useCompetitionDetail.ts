import { useState, useEffect, useCallback } from 'react';
import { competitionsApi, challengesApi } from '../../services/api';
import type { CompetitionDetail } from './types';
import type { SubmitResult } from './types';

export interface ChallengeInfo {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  languages: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  starterCode: Record<string, string>;
}

const DEFAULT_STARTER: Record<string, string> = {
  javascript: '// Your code here\n',
  python: '# Your code here\n',
  java: '// Your code here\n',
  cpp: '// Your code here\n',
};

export function useCompetitionDetail(id: string | undefined) {
  const [competition, setCompetition] = useState<CompetitionDetail | null>(null);
  const [challenges, setChallenges] = useState<ChallengeInfo[]>([]);
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState('python');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const challenge =
    challenges.find((c) => c._id === activeChallengeId) ?? challenges[0] ?? null;

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setSubmitResult(null);
    setSubmitError(null);
    setChallenges([]);
    setActiveChallengeId(null);

    competitionsApi
      .getOne(id)
      .then(async (res: { data: CompetitionDetail }) => {
        const comp = res.data;
        setCompetition(comp);
        const ids = (comp.challengeIds ?? []).filter(Boolean);
        if (!ids.length) return;

        const results = await Promise.all(
          ids.map((chId) =>
            challengesApi.getOne(chId).then((r: { data: ChallengeInfo }) => r.data).catch(() => null),
          ),
        );
        const loaded = results.filter((c): c is ChallengeInfo => c != null);
        setChallenges(loaded);
        const first = loaded[0];
        if (first) {
          setActiveChallengeId(first._id);
          const langs = comp.supportedLanguages?.length
            ? comp.supportedLanguages
            : first.languages ?? ['python', 'javascript'];
          const lang = langs.includes('python') ? 'python' : langs[0];
          setSelectedLang(lang);
          setCode(first.starterCode?.[lang] ?? DEFAULT_STARTER[lang] ?? '');
        }
      })
      .catch((err: unknown) => {
        const msg =
          err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
            ? (err as { response: { data: { message: string } } }).response.data.message
            : err instanceof Error
              ? err.message
              : 'Failed to load competition';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!challenge || !selectedLang) return;
    setCode(challenge.starterCode?.[selectedLang] ?? DEFAULT_STARTER[selectedLang] ?? '');
  }, [challenge?._id, selectedLang]);

  const setActiveChallengeIdSafe = useCallback(
    (chId: string) => {
      setActiveChallengeId(chId);
      const ch = challenges.find((c) => c._id === chId);
      if (ch && competition) {
        const langs = competition.supportedLanguages?.length
          ? competition.supportedLanguages
          : ch.languages ?? ['python'];
        const lang = langs.includes(selectedLang) ? selectedLang : langs.includes('python') ? 'python' : langs[0];
        setSelectedLang(lang);
        setCode(ch.starterCode?.[lang] ?? DEFAULT_STARTER[lang] ?? '');
      }
    },
    [challenges, competition, selectedLang],
  );

  const submit = useCallback(() => {
    if (!id || !code.trim() || !activeChallengeId) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);
    competitionsApi
      .submit(id, { code, language: selectedLang, challengeId: activeChallengeId })
      .then((res: { data: SubmitResult }) => {
        setSubmitResult(res.data);
      })
      .catch((err: unknown) => {
        const msg =
          err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
            ? (err as { response: { data: { message: string } } }).response.data.message
            : err instanceof Error
              ? err.message
              : 'Submission failed';
        setSubmitError(msg);
      })
      .finally(() => setSubmitting(false));
  }, [id, code, selectedLang, activeChallengeId]);

  return {
    competition,
    challenge,
    challenges,
    activeChallengeId,
    setActiveChallengeId: setActiveChallengeIdSafe,
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
