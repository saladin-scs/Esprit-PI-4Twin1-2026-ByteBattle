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

const DEFAULT_STARTER: Record<string, string> = {
  javascript: '// Your code here\n',
  python: '# Your code here\n',
  java: '// Your code here\n',
  cpp: '// Your code here\n',
};

export function useCompetitionDetail(id: string | undefined) {
  const [competition, setCompetition] = useState<CompetitionDetail | null>(null);
  const [challenge, setChallenge] = useState<ChallengeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState('python');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const challengeId = competition?.challengeIds?.[0];

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setSubmitResult(null);
    setSubmitError(null);
    competitionsApi
      .getOne(id)
      .then((res: { data: CompetitionDetail }) => {
        const comp = res.data;
        setCompetition(comp);
        const chId = comp?.challengeIds?.[0];
        if (chId) {
          return challengesApi.getOne(chId).then((r: { data: ChallengeInfo }) => {
            const ch = r.data;
            setChallenge(ch);
            const langs = comp.supportedLanguages?.length ? comp.supportedLanguages : (ch?.languages ?? ['python', 'javascript']);
            const lang = langs.includes('python') ? 'python' : langs[0];
            setSelectedLang(lang);
            const starter = ch?.starterCode?.[lang] ?? DEFAULT_STARTER[lang] ?? '';
            setCode(starter || '');
          });
        }
      })
      .catch((err: unknown) => {
        const msg =
          err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
            ? (err as { response: { data: { message: string } } }).response.data.message
            : err instanceof Error ? err.message : 'Failed to load competition';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (challenge && selectedLang) {
      setCode(challenge.starterCode?.[selectedLang] ?? DEFAULT_STARTER[selectedLang] ?? '');
    }
  }, [challenge?._id, selectedLang]);

  const submit = useCallback(() => {
    if (!id || !code.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);
    competitionsApi
      .submit(id, { code, language: selectedLang, challengeId: challengeId ?? undefined })
      .then((res: { data: SubmitResult }) => {
        setSubmitResult(res.data);
      })
      .catch((err: unknown) => {
        const msg =
          err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
            ? (err as { response: { data: { message: string } } }).response.data.message
            : err instanceof Error ? err.message : 'Submission failed';
        setSubmitError(msg);
      })
      .finally(() => setSubmitting(false));
  }, [id, code, selectedLang, challengeId]);

  return {
    competition,
    challenge,
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
