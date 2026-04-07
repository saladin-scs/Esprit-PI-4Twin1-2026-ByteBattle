import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { challengesApi } from '../../services/api';
import { PageContainer, Card, Button, Input, Spinner } from '../../shared/components';
import { DifficultyBadge } from '../../components/Challenges';
import toast from 'react-hot-toast';
import { Sparkles, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePopup } from '../../contexts/PopupContext';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

type Example = { input: string; output: string; explanation?: string };
type TestCase = { input: string; expectedOutput: string; isHidden?: boolean; isPerformance?: boolean };
type StarterCode = Record<string, string>;

const DEFAULT_STARTER_CODE: StarterCode = {
  javascript: 'const [a, b] = readline().trim().split(/\\s+/).map(Number);\nconsole.log(a + b);',
  python: 'a, b = map(int, input().split())\nprint(a + b)',
  java:
    'import java.io.*;\nimport java.util.*;\n\npublic class Solution {\n  public static void main(String[] args) throws Exception {\n    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n    StringTokenizer st = new StringTokenizer(br.readLine());\n    long a = Long.parseLong(st.nextToken());\n    long b = Long.parseLong(st.nextToken());\n    System.out.println(a + b);\n  }\n}\n',
  'c++':
    '#include <bits/stdc++.h>\nusing namespace std;\nint main(){ long long a,b; if(!(cin>>a>>b)) return 0; cout << (a+b); }\n',
};

function displayLanguage(language: string): string {
  return language.trim().toLowerCase() === 'cpp' ? 'C++' : language;
}

function normalizeLanguage(language: string): string {
  const value = language.trim().toLowerCase();
  return value === 'c++' ? 'cpp' : value;
}

function displayLanguagesInput(text: string): string {
  return text
    .split(',')
    .map((language) => displayLanguage(language.trim()))
    .filter(Boolean)
    .join(', ');
}

function normalizeStarterCodeKeys(starterCode: StarterCode): StarterCode {
  return Object.fromEntries(
    Object.entries(starterCode).map(([language, code]) => [normalizeLanguage(language), code]),
  );
}

function sanitizeExamples(examples: any[]): Example[] {
  return examples.map((example) => ({
    input: String(example?.input ?? ''),
    output: String(example?.output ?? ''),
    ...(example?.explanation != null ? { explanation: String(example.explanation) } : {}),
  }));
}

function sanitizeTestCases(testCases: any[]): TestCase[] {
  return testCases.map((testCase) => ({
    input: String(testCase?.input ?? ''),
    expectedOutput: String(testCase?.expectedOutput ?? ''),
    ...(typeof testCase?.isHidden === 'boolean' ? { isHidden: testCase.isHidden } : {}),
    ...(typeof testCase?.isPerformance === 'boolean' ? { isPerformance: testCase.isPerformance } : {}),
  }));
}

function safeJsonParse<T>(text: string, fallback: T): T {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

function normalizeAiPayload(data: any): {
  title?: string;
  description?: string;
  tags?: string[];
  examples?: Example[];
  testCases?: TestCase[];
  starterCode?: StarterCode;
  officialSolution?: StarterCode;
} {
  const obj = (data && typeof data === 'object') ? data : {};
  const tags = Array.isArray(obj.tags) ? obj.tags.filter((t: any) => typeof t === 'string') : undefined;
  const examples = Array.isArray(obj.examples) ? obj.examples : undefined;
  const testCases = Array.isArray(obj.testCases) ? obj.testCases : undefined;
  const starterCode =
    obj.starterCode && typeof obj.starterCode === 'object' && !Array.isArray(obj.starterCode)
      ? obj.starterCode
      : undefined;
  const officialSolution =
    obj.officialSolution && typeof obj.officialSolution === 'object' && !Array.isArray(obj.officialSolution)
      ? obj.officialSolution
      : undefined;
  return {
    title: typeof obj.title === 'string' ? obj.title : undefined,
    description: typeof obj.description === 'string' ? obj.description : undefined,
    tags,
    examples,
    testCases,
    starterCode,
    officialSolution,
  };
}

function isAiErrorPayload(payload: ReturnType<typeof normalizeAiPayload>): boolean {
  const title = payload.title?.trim().toLowerCase();
  const description = payload.description?.trim().toLowerCase() || '';
  return (
    title === 'api key missing' ||
    description.includes('openrouter_api_key') ||
    description.includes('generate challenges') ||
    description.includes('challenge generation is unavailable')
  );
}

export default function AdminChallenges() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirm } = usePopup();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<Record<string, number>>({});

  const isNew = useMemo(() => {
    return (id: string) => typeof newIds[id] === 'number';
  }, [newIds]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'medium' as Difficulty,
    topic: '',
    xpReward: 100,
    languages: 'javascript, python, java, C++',
    tags: '',
    examplesJson: JSON.stringify(
      [
        { input: '1 2', output: '3', explanation: 'Add the two numbers.' },
      ] satisfies Example[],
      null,
      2,
    ),
    testCasesJson: JSON.stringify(
      [
        { input: '1 2', expectedOutput: '3', isHidden: false },
        { input: '100 250', expectedOutput: '350', isHidden: true },
      ] satisfies TestCase[],
      null,
      2,
    ),
    starterCodeJson: JSON.stringify(
      DEFAULT_STARTER_CODE satisfies StarterCode,
      null,
      2,
    ),
    solutionCodeJson: JSON.stringify(
      DEFAULT_STARTER_CODE satisfies StarterCode,
      null,
      2,
    ),
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await challengesApi.getAll({ limit: 100 });
      setChallenges((data as any).challenges || []);
    } catch (err) {
      toast.error('Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const ai = searchParams.get('ai');
    const create = searchParams.get('create');
    if (ai === '1' || create === '1') {
      resetForm();
      if (ai === '1') {
        setFormData((prev) => ({ ...prev, topic: prev.topic || 'Two sum' }));
      }
      setShowModal(true);
      const next = new URLSearchParams(searchParams);
      next.delete('ai');
      next.delete('create');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleGenerateAI = async () => {
    if (!formData.topic) {
      toast.error('Please provide a topic for the AI to generate');
      return;
    }
    
    setGenerateLoading(true);
    try {
      toast.loading('AI is generating challenge...', { id: 'ai-gen' });
      const { data } = await challengesApi.generate({
        difficulty: formData.difficulty,
        topic: formData.topic,
      });

      const normalized = normalizeAiPayload(data);
      if (isAiErrorPayload(normalized)) {
        throw new Error('AI challenge generation is not configured correctly on the server.');
      }
      const nextExamples = normalized.examples ? sanitizeExamples(normalized.examples) : undefined;
      const nextTestCases = normalized.testCases ? sanitizeTestCases(normalized.testCases) : undefined;
      const nextStarter = normalized.starterCode ? normalizeStarterCodeKeys(normalized.starterCode) : undefined;
      const nextSolution = normalized.officialSolution
        ? normalizeStarterCodeKeys(normalized.officialSolution)
        : nextStarter;

      setFormData((prev) => {
        const hasAnyTestCases = Array.isArray(nextTestCases) && nextTestCases.length > 0;
        const fallbackFromExamples: TestCase[] | null =
          Array.isArray(nextExamples) && nextExamples.length > 0
            ? [
                {
                  input: String((nextExamples[0] as any)?.input ?? ''),
                  expectedOutput: String((nextExamples[0] as any)?.output ?? ''),
                  isHidden: false,
                },
              ]
            : null;

        const finalTestCases =
          hasAnyTestCases ? nextTestCases : (fallbackFromExamples ?? safeJsonParse<TestCase[]>(prev.testCasesJson, []));

        return {
          ...prev,
          title: normalized.title || prev.title,
          description: normalized.description || prev.description,
          tags: normalized.tags ? normalized.tags.join(', ') : prev.tags,
          examplesJson: nextExamples ? JSON.stringify(nextExamples, null, 2) : prev.examplesJson,
          testCasesJson: finalTestCases.length ? JSON.stringify(finalTestCases, null, 2) : prev.testCasesJson,
          starterCodeJson: nextStarter ? JSON.stringify(nextStarter, null, 2) : prev.starterCodeJson,
          solutionCodeJson: nextSolution ? JSON.stringify(nextSolution, null, 2) : prev.solutionCodeJson,
        };
      });

      if (!Array.isArray(nextTestCases) || nextTestCases.length === 0) {
        toast('AI did not return test cases. I filled a basic one for you — please review before creating.', {
          id: 'ai-gen-missing-tests',
        });
      }
      toast.success('Generated successfully!', { id: 'ai-gen' });
    } catch (err: any) {
      console.error(err);
      toast.error(`Error: ${err.response?.data?.message || err.message || 'AI generation failed'}`, { id: 'ai-gen' });
    } finally {
      setGenerateLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      difficulty: 'medium' as Difficulty,
      topic: '',
      xpReward: 100,
      languages: 'javascript, python, java, C++',
      tags: '',
      examplesJson: JSON.stringify(
        [{ input: '1 2', output: '3', explanation: 'Add the two numbers.' }] satisfies Example[],
        null,
        2,
      ),
      testCasesJson: JSON.stringify(
        [
          { input: '1 2', expectedOutput: '3', isHidden: false },
          { input: '100 250', expectedOutput: '350', isHidden: true },
        ] satisfies TestCase[],
        null,
        2,
      ),
      starterCodeJson: JSON.stringify(
        DEFAULT_STARTER_CODE satisfies StarterCode,
        null,
        2,
      ),
      solutionCodeJson: JSON.stringify(
        DEFAULT_STARTER_CODE satisfies StarterCode,
        null,
        2,
      ),
    });
  };

  const isOfficialSolutionValidationError = (err: any) => {
    const message = err?.response?.data?.message;
    if (Array.isArray(message)) {
      return message.some((entry) => String(entry).toLowerCase().includes('officialsolution'));
    }
    return String(message || '').toLowerCase().includes('officialsolution');
  };

  const handleEdit = async (challenge: any) => {
    setEditingId(challenge._id);
    setShowModal(true);
    setEditLoading(true);
    try {
      const { data } = await challengesApi.getOneAdmin(challenge._id);
        setFormData((prev) => ({
          ...prev,
        title: data.title || '',
        description: data.description || '',
        difficulty: (data.difficulty || 'medium') as Difficulty,
        topic: '',
        xpReward: Number(data.xpReward || 100),
        languages: Array.isArray(data.languages)
          ? data.languages.map((language: string) => displayLanguage(language)).join(', ')
          : 'javascript, python',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
        examplesJson: JSON.stringify(data.examples || [], null, 2),
        testCasesJson: JSON.stringify(data.testCases || [], null, 2),
        starterCodeJson: JSON.stringify(data.starterCode || {}, null, 2),
        solutionCodeJson: JSON.stringify(data.officialSolution || data.starterCode || {}, null, 2),
        }));
    } catch (err) {
      toast.error('Failed to load challenge details');
      setShowModal(false);
      resetForm();
    } finally {
      setEditLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updatePayload = {
          title: formData.title,
          description: formData.description,
          difficulty: formData.difficulty,
          xpReward: Number(formData.xpReward),
          languages: formData.languages.split(',').map((l) => normalizeLanguage(l)).filter(Boolean),
          tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
          examples: safeJsonParse<Example[]>(formData.examplesJson, []),
          testCases: safeJsonParse<TestCase[]>(formData.testCasesJson, []),
          starterCode: normalizeStarterCodeKeys(safeJsonParse<StarterCode>(formData.starterCodeJson, {})),
          officialSolution: normalizeStarterCodeKeys(safeJsonParse<StarterCode>(formData.solutionCodeJson, {})),
          isPublished: true,
        };
        let res;
        try {
          res = await challengesApi.update(editingId, updatePayload);
        } catch (err: any) {
          if (!isOfficialSolutionValidationError(err)) {
            throw err;
          }
          const { officialSolution, ...legacyPayload } = updatePayload;
          res = await challengesApi.update(editingId, legacyPayload);
          toast('Challenge mis a jour. Redemarre le backend pour enregistrer aussi la solution admin.', {
            id: 'official-solution-compat-update',
          });
        }
        const updated = (res as any)?.data;
        setChallenges((prev) => prev.map((c) => (c?._id === editingId ? { ...c, ...(updated || updatePayload) } : c)));
        toast.success('Challenge updated successfully!');
        setShowModal(false);
        resetForm();
        return;
      }

      const examples = sanitizeExamples(safeJsonParse<Example[]>(formData.examplesJson, []));
      const testCases = sanitizeTestCases(safeJsonParse<TestCase[]>(formData.testCasesJson, []));
      const starterCode = normalizeStarterCodeKeys(
        safeJsonParse<StarterCode>(formData.starterCodeJson, {}),
      );
      const officialSolution = normalizeStarterCodeKeys(
        safeJsonParse<StarterCode>(formData.solutionCodeJson, {}),
      );

      if (!Array.isArray(examples) || examples.length === 0) {
        toast.error('Examples JSON is empty or invalid. Please provide at least 1 example.');
        return;
      }
      if (!Array.isArray(testCases) || testCases.length === 0) {
        toast.error('Test cases JSON is empty or invalid. Please provide at least 1 test case.');
        return;
      }
      if (!starterCode || typeof starterCode !== 'object' || Array.isArray(starterCode)) {
        toast.error('Starter code JSON is invalid. It must be an object mapping language -> code.');
        return;
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        difficulty: formData.difficulty,
        xpReward: Number(formData.xpReward),
        languages: formData.languages.split(',').map(l => normalizeLanguage(l)).filter(Boolean),
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        isPublished: true,
        examples,
        testCases,
        starterCode,
        officialSolution,
      };

      let res;
      try {
        res = await challengesApi.create(payload);
      } catch (err: any) {
        if (!isOfficialSolutionValidationError(err)) {
          throw err;
        }
        const { officialSolution: _officialSolution, ...legacyPayload } = payload;
        res = await challengesApi.create(legacyPayload);
        toast('Challenge cree. Redemarre le backend pour enregistrer aussi la solution admin.', {
          id: 'official-solution-compat-create',
        });
      }
      const created = (res as any)?.data;
      toast.success('Challenge created successfully!');
      setShowModal(false);
      if (created?._id) {
        setChallenges((prev) => [created, ...prev.filter((c) => c?._id !== created._id)]);
        setNewIds((prev) => ({ ...prev, [created._id]: Date.now() }));
        window.setTimeout(() => {
          setNewIds((prev) => {
            const { [created._id]: _drop, ...rest } = prev;
            return rest;
          });
        }, 9000);
      } else {
        loadData();
      }
      resetForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || (editingId ? 'Failed to update challenge' : 'Failed to create challenge'));
    }
  };

  const handleDelete = async (challenge: any) => {
    const id = challenge?._id as string | undefined;
    if (!id) return;
    const title = String(challenge?.title ?? 'this challenge');
    const accepted = await confirm({
      title: 'Delete challenge',
      message: `Delete "${title}"?\n\nThis will remove submissions/solutions related to it.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!accepted) return;

    setDeletingId(id);
    try {
      await challengesApi.delete(id);
      setChallenges((prev) => prev.filter((c) => c?._id !== id));
      setNewIds((prev) => {
        const { [id]: _drop, ...rest } = prev;
        return rest;
      });
      toast.success('Challenge deleted.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete challenge');
    } finally {
      setDeletingId((cur) => (cur === id ? null : cur));
    }
  };

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Challenges Management</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Create manual challenges or let AI generate them for you.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>+ Create Challenge</Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-900/60">
              <tr className="text-left">
                <th className="p-3 text-gray-700 dark:text-gray-300 font-medium">Title</th>
                <th className="p-3 text-gray-700 dark:text-gray-300 font-medium">Difficulty</th>
                <th className="p-3 text-gray-700 dark:text-gray-300 font-medium">Languages</th>
                <th className="p-3 text-gray-700 dark:text-gray-300 font-medium">XP Reward</th>
                <th className="p-3 text-gray-700 dark:text-gray-300 font-medium">Acceptance</th>
                <th className="p-3 text-gray-700 dark:text-gray-300 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-8 text-center" colSpan={6}>
                    <Spinner size="md" />
                  </td>
                </tr>
              ) : challenges.length === 0 ? (
                <tr>
                  <td className="p-8 text-center text-gray-500" colSpan={6}>
                    No challenges found. Create or generate one!
                  </td>
                </tr>
              ) : (
                <AnimatePresence initial={false}>
                  {challenges.map((c) => {
                    const acceptanceRate =
                      c.totalSubmissions > 0 ? Math.round((c.totalAccepted / c.totalSubmissions) * 100) : 0;
                    const highlight = c?._id ? isNew(c._id) : false;
                    return (
                    <motion.tr
                      key={c._id}
                      initial={highlight ? { opacity: 0, y: -10 } : false}
                      animate={highlight ? { opacity: 1, y: 0 } : undefined}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className={`border-t border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50 ${highlight ? 'bg-emerald-500/10' : ''}`}
                    >
                      <td className="p-3 text-gray-800 dark:text-gray-200 font-medium">
                        <div className="flex items-center gap-2">
                          <span>{c.title}</span>
                          {highlight && (
                              <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700 dark:text-emerald-300 animate-pulse">
                              NEW
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3"><DifficultyBadge difficulty={c.difficulty} size="sm" /></td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">
                        {(c.languages || []).slice(0, 3).map((language: string) => displayLanguage(language)).join(', ')}
                      </td>
                      <td className="p-3 text-amber-600 dark:text-amber-500 font-semibold">+{c.xpReward}</td>
                      <td className="p-3 text-gray-500 dark:text-gray-400">{acceptanceRate}%</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(c)}
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/15"
                            title="Edit challenge"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            disabled={deletingId === c._id}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-500/15 disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Delete challenge"
                          >
                            {deletingId === c._id ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-transparent" />
                                Deleting…
                              </span>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal View */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Update Challenge' : 'Create New Challenge'}</h2>
            
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg mb-6 flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-1">AI Topic / Idea</label>
                <Input 
                  placeholder="e.g. Reverse a binary tree, Matrix multiplication..." 
                  value={formData.topic} 
                  onChange={e => setFormData({ ...formData, topic: e.target.value })} 
                />
              </div>
              <Button 
                 type="button" 
                 onClick={handleGenerateAI} 
                 disabled={generateLoading}
                 className="flex items-center gap-2 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {generateLoading ? <Spinner size="sm" /> : <Sparkles className="w-4 h-4" />}
                Autofill with AI
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {editLoading && (
                <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">
                  Loading challenge details...
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <Input required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea 
                  required
                  rows={4}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white" 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Examples (JSON)</label>
                <textarea
                  required
                  rows={5}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-mono text-xs"
                  value={formData.examplesJson}
                  onChange={(e) => setFormData({ ...formData, examplesJson: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Format: <code>[{"{"}"input":"1 2","output":"3","explanation":"..."{"}"}]</code>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Test cases (JSON)</label>
                <textarea
                  required
                  rows={6}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-mono text-xs"
                  value={formData.testCasesJson}
                  onChange={(e) => setFormData({ ...formData, testCasesJson: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Format: <code>[{"{"}"input":"1 2","expectedOutput":"3","isHidden":false{"}"}]</code>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Solution code per language (JSON)</label>
                <textarea
                  required
                  rows={6}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-mono text-xs"
                  value={formData.solutionCodeJson}
                  onChange={(e) => setFormData({ ...formData, solutionCodeJson: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Visible for admins only. Keys should match selected languages (e.g. <code>javascript</code>, <code>python</code>, <code>java</code>, <code>c++</code>).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Difficulty</label>
                  <select 
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">XP Reward</label>
                  <Input type="number" required value={formData.xpReward} onChange={e => setFormData({ ...formData, xpReward: parseInt(e.target.value) || 0 })} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Supported Languages (comma separated)</label>
                <Input
                  required
                  value={formData.languages}
                  onChange={e => setFormData({ ...formData, languages: displayLanguagesInput(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                <Input placeholder="algorithms, math" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} />
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <Button type="button" variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
                <Button type="submit">{editingId ? 'Update Challenge' : 'Create Challenge'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
