import { useState, useEffect, useCallback } from 'react';
import { competitionsApi, challengesApi } from '../../services/api';
import type { CompetitionDetail } from './types';
import type { SubmitResult } from './types';
import { getEditorPrefillCodeAsync } from '../../utils/testPrefill';

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

function normalizeLang(lang: string): string {
  const l = String(lang || '').toLowerCase();
  return l === 'c++' ? 'cpp' : l;
}

function readChallengeId(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const obj = raw as { _id?: string; id?: string; toString?: () => string };
    if (typeof obj._id === 'string') return obj._id;
    if (typeof obj.id === 'string') return obj.id;
    if (typeof obj.toString === 'function') {
      const s = obj.toString();
      if (s && s !== '[object Object]') return s;
    }
  }
  return null;
}

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
        const compLangs = (comp.supportedLanguages?.length ? comp.supportedLanguages : ['python', 'javascript']).map(normalizeLang);
        const defaultLang = compLangs.includes('python') ? 'python' : compLangs[0];
        setSelectedLang(defaultLang);
        setCode(DEFAULT_STARTER[defaultLang] ?? '');
        const ids = (comp.challengeIds ?? [])
          .map((x) => readChallengeId(x))
          .filter((x): x is string => !!x);
        if (!ids.length) {
          setSubmitError('This contest has no linked challenge yet. Editor is available, but submit is disabled until an admin links challenges.');
          return;
        }

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
          const langs = (comp.supportedLanguages?.length
            ? comp.supportedLanguages
            : first.languages ?? ['python', 'javascript']).map(normalizeLang);
          const lang = langs.includes('python') ? 'python' : langs[0];
          setSelectedLang(lang);
          const initial = await getEditorPrefillCodeAsync({
            challengeId: first._id,
            title: first.title,
            language: lang,
            starterCode:
              first.starterCode?.[lang] ??
              first.starterCode?.[lang === 'cpp' ? 'c++' : lang] ??
              DEFAULT_STARTER[lang] ??
              '',
          });
          setCode(initial);
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
    let cancelled = false;
    const loadPrefill = async () => {
      const next = await getEditorPrefillCodeAsync({
        challengeId: challenge._id,
        title: challenge.title,
        language: normalizeLang(selectedLang),
        starterCode:
          challenge.starterCode?.[selectedLang] ??
          challenge.starterCode?.[selectedLang === 'cpp' ? 'c++' : selectedLang] ??
          DEFAULT_STARTER[selectedLang] ??
          '',
      });
      if (!cancelled) setCode(next);
    };
    void loadPrefill();
    return () => {
      cancelled = true;
    };
  }, [challenge?._id, selectedLang, challenge, setCode]);

  const setActiveChallengeIdSafe = useCallback(
    (chId: string) => {
      setActiveChallengeId(chId);
      const ch = challenges.find((c) => c._id === chId);
      if (ch && competition) {
        const langs = (competition.supportedLanguages?.length
          ? competition.supportedLanguages
          : ch.languages ?? ['python']).map(normalizeLang);
        const selected = normalizeLang(selectedLang);
        const lang = langs.includes(selected) ? selected : langs.includes('python') ? 'python' : langs[0];
        setSelectedLang(lang);
        void getEditorPrefillCodeAsync({
          challengeId: ch._id,
          title: ch.title,
          language: lang,
          starterCode:
            ch.starterCode?.[lang] ??
            ch.starterCode?.[lang === 'cpp' ? 'c++' : lang] ??
            DEFAULT_STARTER[lang] ??
            '',
        }).then(setCode);
      }
    },
    [challenges, competition, selectedLang],
  );

  const submit = useCallback(() => {
    if (!id || !code.trim()) return;
    if (!activeChallengeId) {
      setSubmitError('This contest has no linked challenge yet. Please ask admin to assign challenge(s).');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);
    competitionsApi
      .submit(id, { code, language: normalizeLang(selectedLang), challengeId: activeChallengeId })
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
