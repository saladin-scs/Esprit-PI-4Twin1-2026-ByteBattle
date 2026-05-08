import { challengesApi } from '../services/api';

const TWO_SUM_PY = `n, target = map(int, input().split())
arr = list(map(int, input().split()))
seen = {}
for j, x in enumerate(arr):
    need = target - x
    if need in seen:
        print(seen[need], j)
        break
    if x not in seen:
        seen[x] = j
else:
    print(-1)
`;

const TWO_SUM_JS = `const fs = require('fs');
const data = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);
let p = 0;
const n = data[p++] ?? 0;
const target = data[p++] ?? 0;
const arr = data.slice(p, p + n);
const seen = new Map();
let ok = false;
for (let j = 0; j < arr.length; j++) {
  const x = arr[j];
  const need = target - x;
  if (seen.has(need)) {
    console.log(seen.get(need), j);
    ok = true;
    break;
  }
  if (!seen.has(x)) seen.set(x, j);
}
if (!ok) console.log(-1);
`;

const TWO_SUM_JAVA = `import java.io.*;
import java.util.*;

public class Main {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    int n = Integer.parseInt(st.nextToken());
    int target = Integer.parseInt(st.nextToken());
    st = new StringTokenizer(br.readLine());
    int[] arr = new int[n];
    for (int i = 0; i < n; i++) arr[i] = Integer.parseInt(st.nextToken());
    Map<Integer, Integer> seen = new HashMap<>();
    for (int j = 0; j < n; j++) {
      int need = target - arr[j];
      if (seen.containsKey(need)) {
        System.out.println(seen.get(need) + " " + j);
        return;
      }
      seen.putIfAbsent(arr[j], j);
    }
    System.out.println(-1);
  }
}
`;

const TWO_SUM_CPP = `#include <bits/stdc++.h>
using namespace std;

int main() {
  ios::sync_with_stdio(false);
  cin.tie(nullptr);

  int n, target;
  if (!(cin >> n >> target)) return 0;
  vector<int> a(n);
  for (int i = 0; i < n; i++) cin >> a[i];

  unordered_map<int, int> seen;
  for (int j = 0; j < n; j++) {
    int need = target - a[j];
    if (seen.count(need)) {
      cout << seen[need] << " " << j;
      return 0;
    }
    if (!seen.count(a[j])) seen[a[j]] = j;
  }
  cout << -1;
  return 0;
}
`;

const GENERIC_BY_LANG: Record<string, string> = {
  python: "import sys\n# Temporary test prefill\\nprint('ready')\n",
  javascript: "console.log('ready');\n",
  java: "public class Main { public static void main(String[] args){ System.out.println(\"ready\"); } }\n",
  cpp: "#include <iostream>\nint main(){ std::cout << \"ready\"; return 0; }\n",
};

const TEST_PREFILL_ENABLED = import.meta.env.VITE_PREFILL_TEST_SOLUTIONS === 'true';
const PREFILL_FROM_SOLUTIONS = import.meta.env.VITE_PREFILL_FROM_ACCEPTED_SOLUTIONS === 'true';
const prefillCache = new Map<string, string>();

function normalizeLanguage(lang: string): string {
  const l = String(lang || '').toLowerCase().trim();
  if (l === 'c++') return 'cpp';
  return l;
}

function twoSumPrefillByLang(lang: string): string {
  if (lang === 'python') return TWO_SUM_PY;
  if (lang === 'javascript') return TWO_SUM_JS;
  if (lang === 'java') return TWO_SUM_JAVA;
  if (lang === 'cpp') return TWO_SUM_CPP;
  return GENERIC_BY_LANG[lang] ?? '';
}

export function getEditorPrefillCode(title: string | undefined, language: string, starterCode: string): string {
  if (starterCode && starterCode.trim()) return starterCode;
  if (!TEST_PREFILL_ENABLED) return '';
  const t = String(title || '').toLowerCase();
  if (t.includes('two sum')) return twoSumPrefillByLang(language);
  return GENERIC_BY_LANG[language] ?? '';
}

async function fetchTopSolutionCode(challengeId: string, language: string): Promise<string | null> {
  const lang = normalizeLanguage(language);
  const key = `${challengeId}:${lang}`;
  if (prefillCache.has(key)) return prefillCache.get(key) ?? null;

  try {
    const res = await challengesApi.getSolutions(challengeId, { page: 1, limit: 30, sortBy: 'upvotes' });
    const data = res.data as { solutions?: Array<{ code?: string; language?: string; upvotes?: number }> };
    const solutions = Array.isArray(data?.solutions) ? data.solutions : [];
    const candidates = solutions.filter((s) => normalizeLanguage(s.language || '') === lang && !!s.code?.trim());
    if (!candidates.length) return null;

    candidates.sort((a, b) => (Number(b.upvotes || 0) - Number(a.upvotes || 0)));
    const code = String(candidates[0].code || '').trim();
    if (!code) return null;

    prefillCache.set(key, code);
    return code;
  } catch {
    return null;
  }
}

export async function getEditorPrefillCodeAsync(params: {
  challengeId?: string;
  title?: string;
  language: string;
  starterCode: string;
}): Promise<string> {
  const fallback = getEditorPrefillCode(params.title, params.language, params.starterCode);
  if (!TEST_PREFILL_ENABLED || !PREFILL_FROM_SOLUTIONS || !params.challengeId) return fallback;
  const top = await fetchTopSolutionCode(params.challengeId, params.language);
  return top || fallback;
}

