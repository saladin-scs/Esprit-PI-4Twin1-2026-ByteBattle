import { useState, useEffect, useCallback } from 'react';
import { competitionsApi, challengesApi } from '../../services/api';
import type { CompetitionDetail } from './types';
import type { SubmitResult } from './types';
import { getEditorPrefillCode } from '../../utils/testPrefill';

export interface ChallengeInfo {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  languages: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  starterCode: Record<string, string>;
}

type ChallengeState = {
  selectedLang: string;
  code: string;
  running: boolean;
  runResult: {
    results: Array<{
      testNumber: number;
      passed: boolean;
      input?: string;
      expectedOutput?: string;
      actualOutput?: string;
      error?: string;
      executionTimeMs?: number;
    }>;
    overall: { passed: number; total: number };
    executionTimeMs?: number;
  } | null;
  submitting: boolean;
  submitResult: SubmitResult | null;
  submitError: string | null;
};

const DEFAULT_STARTER: Record<string, string> = {
  javascript: '// Your code here\n',
  python: '# Your code here\n',
  java: '// Your code here\n',
  cpp: '// Your code here\n',
};

function pickPreferredLanguage(languages: string[]) {
  const priority = ['javascript', 'java', 'python', 'cpp'];
  const match = priority.find((language) => languages.includes(language));
  return match ?? languages[0] ?? 'javascript';
}

export function useCompetitionDetail(id: string | undefined) {
  const [competition, setCompetition] = useState<CompetitionDetail | null>(null);
  const [challenges, setChallenges] = useState<ChallengeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [challengeState, setChallengeState] = useState<Record<string, ChallengeState>>({});

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setChallenges([]);
    setChallengeState({});

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

        const nextState: Record<string, ChallengeState> = {};
        for (const challenge of loaded) {
          const langs = comp.supportedLanguages?.length
            ? comp.supportedLanguages
            : challenge.languages ?? ['python', 'javascript'];
          const lang = pickPreferredLanguage(langs);

          nextState[challenge._id] = {
            selectedLang: lang,
            code: getEditorPrefillCode(
              challenge.title,
              lang,
              challenge.starterCode?.[lang] ?? DEFAULT_STARTER[lang] ?? '',
            ),
            running: false,
            runResult: null,
            submitting: false,
            submitResult: null,
            submitError: null,
          };
        }
        setChallengeState(nextState);
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

  const setSelectedLang = useCallback(
    (challengeId: string, lang: string) => {
      const challenge = challenges.find((item) => item._id === challengeId);
      if (!challenge) return;

      setChallengeState((prev) => ({
        ...prev,
        [challengeId]: {
          ...(prev[challengeId] ?? {
            running: false,
            runResult: null,
            submitting: false,
            submitResult: null,
            submitError: null,
          }),
          selectedLang: lang,
          code: getEditorPrefillCode(
            challenge.title,
            lang,
            challenge.starterCode?.[lang] ?? DEFAULT_STARTER[lang] ?? '',
          ),
          runResult: null,
          submitResult: null,
          submitError: null,
        },
      }));
    },
    [challenges],
  );

  const setCode = useCallback((challengeId: string, code: string) => {
    setChallengeState((prev) => ({
      ...prev,
      [challengeId]: {
        ...(prev[challengeId] ?? {
          selectedLang: 'python',
          running: false,
          runResult: null,
          submitting: false,
          submitResult: null,
          submitError: null,
        }),
        code,
      },
    }));
  }, []);

  const run = useCallback(
    (challengeId: string) => {
      const state = challengeState[challengeId];
      if (!id || !state?.code.trim()) return;

      setChallengeState((prev) => ({
        ...prev,
        [challengeId]: {
          ...prev[challengeId],
          running: true,
          runResult: null,
          submitError: null,
        },
      }));

      competitionsApi
        .run(id, { code: state.code, language: state.selectedLang, challengeId })
        .then((res: { data: ChallengeState['runResult'] }) => {
          setChallengeState((prev) => ({
            ...prev,
            [challengeId]: {
              ...prev[challengeId],
              running: false,
              runResult: res.data,
              submitError: null,
            },
          }));
        })
        .catch((err: unknown) => {
          const msg =
            err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
              ? (err as { response: { data: { message: string } } }).response.data.message
              : err instanceof Error
                ? err.message
                : 'Test failed';

          setChallengeState((prev) => ({
            ...prev,
            [challengeId]: {
              ...prev[challengeId],
              running: false,
              runResult: null,
              submitError: msg,
            },
          }));
        });
    },
    [challengeState, id],
  );

  const submit = useCallback(
    (challengeId: string) => {
      const state = challengeState[challengeId];
      if (!id || !state?.code.trim()) return;

      setChallengeState((prev) => ({
        ...prev,
        [challengeId]: {
          ...prev[challengeId],
          submitting: true,
          runResult: null,
          submitError: null,
          submitResult: null,
        },
      }));

      competitionsApi
        .submit(id, { code: state.code, language: state.selectedLang, challengeId })
        .then((res: { data: SubmitResult }) => {
          setChallengeState((prev) => ({
            ...prev,
            [challengeId]: {
              ...prev[challengeId],
              submitting: false,
              submitResult: res.data,
              submitError: null,
            },
          }));
        })
        .catch((err: unknown) => {
          const msg =
            err && typeof err === 'object' && 'response' in err && (err as { response?: { data?: { message?: string } } }).response?.data?.message
              ? (err as { response: { data: { message: string } } }).response.data.message
              : err instanceof Error
                ? err.message
                : 'Submission failed';

          setChallengeState((prev) => ({
            ...prev,
            [challengeId]: {
              ...prev[challengeId],
              submitting: false,
              submitResult: null,
              submitError: msg,
            },
          }));
        });
    },
    [challengeState, id],
  );

  return {
    competition,
    challenges,
    loading,
    error,
    getChallengeState: (challengeId: string) => challengeState[challengeId] ?? null,
    setSelectedLang,
    setCode,
    run,
    submit,
  };
}
