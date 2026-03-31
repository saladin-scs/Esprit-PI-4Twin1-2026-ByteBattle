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

const TEST_PREFILL_ENABLED = import.meta.env.VITE_PREFILL_TEST_SOLUTIONS !== 'false';

function twoSumPrefillByLang(lang: string): string {
  if (lang === 'python') return TWO_SUM_PY;
  if (lang === 'javascript') return TWO_SUM_JS;
  if (lang === 'java') return TWO_SUM_JAVA;
  if (lang === 'cpp') return TWO_SUM_CPP;
  return GENERIC_BY_LANG[lang] ?? '';
}

export function getEditorPrefillCode(title: string | undefined, language: string, starterCode: string): string {
  if (!TEST_PREFILL_ENABLED) return starterCode || '';
  const t = String(title || '').toLowerCase();
  if (t.includes('two sum')) return twoSumPrefillByLang(language);
  if (starterCode && starterCode.trim()) return starterCode;
  return GENERIC_BY_LANG[language] ?? '';
}

