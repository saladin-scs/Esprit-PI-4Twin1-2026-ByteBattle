/**
 * Seed data: stdin -> stdout challenges (easy / medium / hard).
 * Used by npm run seed:challenges - idempotent on title.
 */
export const SEED_CHALLENGES = [
  // ─── Easy ───────────────────────────────────────────────────────────────
  {
    title: 'Reverse a String',
    description: `Output the reverse of the given string.

**Input:** One line, a string (no leading/trailing spaces).  
**Output:** The string reversed.

**Example:**  
Input: \`hello\` → Output: \`olleh\`  
Input: \`ByteBattle\` → Output: \`elttaBetyB\``,
    difficulty: 'easy' as const,
    languages: ['javascript', 'python', 'java', 'cpp'],
    tags: ['string', 'easy'],
    examples: [
      { input: 'hello', output: 'olleh' },
      { input: 'ByteBattle', output: 'elttaBetyB' },
    ],
    testCases: [
      { input: 'hello', expectedOutput: 'olleh' },
      { input: 'ByteBattle', expectedOutput: 'elttaBetyB' },
      { input: 'a', expectedOutput: 'a' },
      { input: '12345', expectedOutput: '54321' },
    ],
    starterCode: {
      javascript:
        'const s = readline().trim();\n// TODO: reverse s and output the result\nlet result = "";\nconsole.log(result);',
      python:
        's = input().strip()\n# TODO: reverse s and output the result\nresult = ""\nprint(result)',
      java: `import java.io.*;
import java.util.*;

public class Solution {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String s = br.readLine().trim();
    // TODO: reverse s and output the result
    String result = "";
    System.out.println(result);
  }
}`,
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\nint main() { string s; getline(cin, s); string result = ""; /* TODO: reverse s into result */ cout << result << endl; return 0; }',
    },
    officialSolution: {
      javascript:
        "const s = readline().trim();\nconst result = s.split('').reverse().join('');\nconsole.log(result);",
      python: 's = input().strip()\nresult = s[::-1]\nprint(result)',
      java: `import java.io.*;

public class Solution {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String s = br.readLine().trim();
    String result = new StringBuilder(s).reverse().toString();
    System.out.println(result);
  }
}`,
      cpp: '#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\nint main() { string s; getline(cin, s); reverse(s.begin(), s.end()); cout << s << endl; return 0; }',
    },
  },
  {
    title: 'Sum of Array',
    description: `Given an array of integers, output their sum.

**Input:** First line: integer \`n\` (number of elements). Second line: \`n\` space-separated integers.  
**Output:** The sum of all elements.

**Example:**  
Input: \`5\\n1 2 3 4 5\` → Output: \`15\`  
Input: \`3\\n10 -2 7\` → Output: \`15\``,
    difficulty: 'easy' as const,
    languages: ['javascript', 'python', 'java', 'cpp'],
    tags: ['arrays', 'math', 'easy'],
    examples: [
      { input: '5\n1 2 3 4 5', output: '15' },
      { input: '3\n10 -2 7', output: '15' },
    ],
    testCases: [
      { input: '5\n1 2 3 4 5', expectedOutput: '15' },
      { input: '3\n10 -2 7', expectedOutput: '15' },
      { input: '1\n42', expectedOutput: '42' },
      { input: '4\n0 0 0 0', expectedOutput: '0' },
    ],
    starterCode: {
      javascript:
        'const n = parseInt(readline(), 10);\nconst arr = readline().split(/\\s+/).map(Number);\n// TODO: compute sum of arr and output it\nlet sum = 0;\nconsole.log(sum);',
      python:
        'n = int(input())\narr = list(map(int, input().split()))\n# TODO: compute sum of arr and output it\nsum_val = 0\nprint(sum_val)',
      java: `import java.io.*;
import java.util.*;

public class Solution {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine());
    StringTokenizer st = new StringTokenizer(br.readLine());
    long sum = 0;
    // TODO: read each token from st and add to sum
    System.out.println(sum);
  }
}`,
      cpp: '#include <iostream>\nusing namespace std;\nint main() { int n; cin >> n; long long sum = 0; int x; for (int i = 0; i < n && cin >> x; i++) { /* TODO: add x to sum */ } cout << sum << endl; return 0; }',
    },
    officialSolution: {
      javascript:
        'const n = parseInt(readline(), 10);\nconst arr = readline().split(/\\s+/).map(Number);\nlet sum = 0;\nfor (let i = 0; i < arr.length; i++) { sum += arr[i]; }\nconsole.log(sum);',
      python:
        'n = int(input())\narr = list(map(int, input().split()))\nprint(sum(arr))',
      java: `import java.io.*;
import java.util.*;

public class Solution {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine());
    StringTokenizer st = new StringTokenizer(br.readLine());
    long sum = 0;
    while (st.hasMoreTokens()) {
      sum += Long.parseLong(st.nextToken());
    }
    System.out.println(sum);
  }
}`,
      cpp: '#include <iostream>\nusing namespace std;\nint main() { int n; cin >> n; long long sum = 0; int x; for (int i = 0; i < n && cin >> x; i++) { sum += x; } cout << sum << endl; return 0; }',
    },
    hints: [
      {
        text: 'Iterate through the array with a loop (`for` or `while`) and **add** each element to a `sum` variable initialized to 0.',
        tier: 'basic' as const,
        cost: 0,
      },
      {
        text: 'In Python, once `arr` is read correctly with `list(map(int, input().split()))`, you can use the **`sum(arr)`** function.',
        tier: 'detailed' as const,
        cost: 0,
      },
    ],
  },
  // ─── Medium ─────────────────────────────────────────────────────────────
  {
    title: 'Fibonacci Numbers',
    description: `Given the first two numbers of a Fibonacci sequence (each on a line or space-separated), output the next \`n\` numbers.

**Input:** Two integers (e.g. \`a b\` or two lines) then an integer \`n\` (number of terms to output).  
**Output:** The next n Fibonacci numbers, space-separated.

**Example:**  
Input: \`0 1\\n5\`  
Output: \`1 2 3 5 8\``,
    difficulty: 'medium' as const,
    languages: ['javascript', 'python', 'java', 'cpp'],
    tags: ['math', 'fibonacci'],
    examples: [
      { input: '0 1\n5', output: '1 2 3 5 8' },
      { input: '1 1\n6', output: '2 3 5 8 13 21' },
    ],
    testCases: [
      { input: '0 1\n5', expectedOutput: '1 2 3 5 8' },
      { input: '1 1\n6', expectedOutput: '2 3 5 8 13 21' },
      { input: '2 3\n4', expectedOutput: '5 8 13 21' },
    ],
    starterCode: {
      javascript:
        'const line1 = readline().split(/\\s+/).map(Number);\nconst n = parseInt(readline(), 10);\nlet a = line1[0], b = line1[1];\n// TODO: output the next n Fibonacci numbers (space-separated)\nconst out = [];\nconsole.log(out.join(" "));',
      python:
        'a, b = map(int, input().split())\nn = int(input())\n# TODO: output the next n Fibonacci numbers (space-separated)\nout = []\nprint(" ".join(map(str, out)))',
      java: `import java.io.*;
import java.util.*;

public class Solution {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    int a = Integer.parseInt(st.nextToken()), b = Integer.parseInt(st.nextToken());
    int n = Integer.parseInt(br.readLine());
    // TODO: output the next n Fibonacci numbers (space-separated)
    StringBuilder sb = new StringBuilder();
    System.out.println(sb.toString().trim());
  }
}`,
      cpp: '#include <iostream>\nusing namespace std;\nint main() { int a, b, n; cin >> a >> b >> n; /* TODO: output the next n Fibonacci numbers, space-separated */ cout << endl; return 0; }',
    },
    officialSolution: {
      javascript:
        'const line1 = readline().split(/\\s+/).map(Number);\nconst n = parseInt(readline(), 10);\nlet a = line1[0], b = line1[1];\nconst out = [];\nfor (let i = 0; i < n; i++) { const next = a + b; out.push(next); a = b; b = next; }\nconsole.log(out.join(" "));',
      python:
        'a, b = map(int, input().split())\nn = int(input())\nout = []\nfor _ in range(n):\n  c = a + b\n  out.append(c)\n  a, b = b, c\nprint(" ".join(map(str, out)))',
      java: `import java.io.*;
import java.util.*;

public class Solution {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String[] parts = br.readLine().split("\\\\s+");
    long a = Long.parseLong(parts[0]);
    long b = Long.parseLong(parts[1]);
    int n = Integer.parseInt(br.readLine());
    List<Long> out = new ArrayList<>();
    for (int i = 0; i < n; i++) {
      long c = a + b;
      out.add(c);
      a = b;
      b = c;
    }
    System.out.println(String.join(" ", out.stream().map(String::valueOf).toArray(String[]::new)));
  }
}`,
      cpp: '#include <iostream>\n#include <vector>\nusing namespace std;\nint main() { long long a, b, n; cin >> a >> b >> n; vector<long long> out; for (int i = 0; i < n; i++) { long long c = a + b; out.push_back(c); a = b; b = c; } for (int i = 0; i < out.size(); i++) { if (i > 0) cout << " "; cout << out[i]; } cout << endl; return 0; }',
    },
  },
  {
    title: 'Zipper Merge',
    description: `Merge two arrays in a zipper-like fashion: take one element from the first array, then one from the second, and so on.

**Input:** Two lines. First line: space-separated integers (array A). Second line: space-separated integers (array B).  
**Output:** One line with the zipper-merged sequence (space-separated). If one array is longer, append the rest at the end.

**Example:**  
Input: \`1 2 3\\n4 5 6\`  
Output: \`1 4 2 5 3 6\``,
    difficulty: 'medium' as const,
    languages: ['javascript', 'python', 'java', 'cpp'],
    tags: ['arrays', 'merge'],
    examples: [
      { input: '1 2 3\n4 5 6', output: '1 4 2 5 3 6' },
      { input: '1 2\n10 20 30', output: '1 10 2 20 30' },
    ],
    testCases: [
      { input: '1 2 3\n4 5 6', expectedOutput: '1 4 2 5 3 6' },
      { input: '1 2\n10 20 30', expectedOutput: '1 10 2 20 30' },
      { input: '7 8\n9', expectedOutput: '7 9 8' },
    ],
    starterCode: {
      javascript:
        'const a = readline().split(/\\s+/).filter(Boolean);\nconst b = readline().split(/\\s+/).filter(Boolean);\n// TODO: zipper-merge a and b (alternate one from each), output space-separated\nconst out = [];\nconsole.log(out.join(" "));',
      python:
        'a = input().split()\nb = input().split()\n# TODO: zipper-merge a and b (alternate one from each), output space-separated\nout = []\nprint(" ".join(out))',
      java: `import java.io.*;
import java.util.*;

public class Solution {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String[] a = br.readLine().trim().split("\\\\s+");
    String[] b = br.readLine().trim().split("\\\\s+");
    // TODO: zipper-merge a and b, output space-separated
    StringBuilder sb = new StringBuilder();
    System.out.println(sb.toString().trim());
  }
}`,
      cpp: '#include <iostream>\n#include <sstream>\n#include <vector>\n#include <string>\nusing namespace std;\nint main() { string line; getline(cin, line); stringstream sa(line); vector<string> a; string x; while (sa >> x) a.push_back(x); getline(cin, line); stringstream sb(line); vector<string> b; while (sb >> x) b.push_back(x); /* TODO: zipper-merge a and b, output space-separated */ cout << endl; return 0; }',
    },
  },
  // ─── Hard ────────────────────────────────────────────────────────────────
  {
    title: 'Roman Numeral to Decimal',
    description: `Convert a Roman numeral (string) to its decimal value. Input is valid, less than 1000 in value.  
Standard symbols: I=1, V=5, X=10, L=50, C=100, D=500, M=1000.

**Input:** One line, the Roman numeral (e.g. \`XIV\`, \`MCMXCIV\`).  
**Output:** The integer value.

**Example:**  
Input: \`XIV\` → Output: \`14\`  
Input: \`MCMXCIV\` → Output: \`1994\``,
    difficulty: 'hard' as const,
    languages: ['javascript', 'python', 'java', 'cpp'],
    tags: ['math', 'string', 'parsing'],
    examples: [
      { input: 'XIV', output: '14' },
      { input: 'MCMXCIV', output: '1994' },
      { input: 'III', output: '3' },
    ],
    testCases: [
      { input: 'XIV', expectedOutput: '14' },
      { input: 'MCMXCIV', expectedOutput: '1994' },
      { input: 'III', expectedOutput: '3' },
      { input: 'LVIII', expectedOutput: '58' },
      { input: 'IX', expectedOutput: '9' },
    ],
    starterCode: {
      javascript:
        'const s = readline().trim();\n// TODO: convert Roman numeral s to decimal (I=1, V=5, X=10, L=50, C=100, D=500, M=1000)\nlet result = 0;\nconsole.log(result);',
      python:
        's = input().strip()\n# TODO: convert Roman numeral s to decimal (I=1, V=5, X=10, L=50, C=100, D=500, M=1000)\nresult = 0\nprint(result)',
      java: `import java.io.*;
import java.util.*;

public class Solution {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String s = br.readLine().trim();
    // TODO: convert Roman numeral s to decimal
    int result = 0;
    System.out.println(result);
  }
}`,
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\nint main() { string s; getline(cin, s); int result = 0; /* TODO: convert Roman s to decimal */ cout << result << endl; return 0; }',
    },
  },
  {
    title: 'Pig Latin to English',
    description: `Translate a sentence from Pig Latin back to English.

Pig Latin rules (reverse them):  
- Words starting with a consonant: move first letter to end and add "ay" (e.g. "hello" → "ellohay").  
- Words starting with a vowel: add "way" at the end (e.g. "apple" → "appleway").

**Input:** One line, a sentence in Pig Latin (lowercase, words separated by spaces).  
**Output:** The English sentence.

**Example:**  
Input: \`ellohay orldway\` → Output: \`hello world\`  
Input: \`appleway isway reatgay\` → Output: \`apple is great\``,
    difficulty: 'hard' as const,
    languages: ['javascript', 'python', 'java', 'cpp'],
    tags: ['string', 'parsing'],
    examples: [
      { input: 'ellohay orldway', output: 'hello world' },
      { input: 'appleway isway reatgay', output: 'apple is great' },
    ],
    testCases: [
      { input: 'ellohay orldway', expectedOutput: 'hello world' },
      { input: 'appleway isway reatgay', expectedOutput: 'apple is great' },
      { input: 'igpay atinlay', expectedOutput: 'pig latin' },
    ],
    starterCode: {
      javascript:
        'const line = readline().trim();\nconst words = line.split(/\\s+/);\n// TODO: translate each Pig Latin word to English ("...ay" and "...way" rules)\nconst out = [];\nconsole.log(out.join(" "));',
      python:
        'line = input().strip()\nwords = line.split()\n# TODO: translate each Pig Latin word to English ("...ay" and "...way" rules)\nout = []\nprint(" ".join(out))',
      java: `import java.io.*;
import java.util.*;

public class Solution {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String line = br.readLine().trim();
    String[] words = line.split("\\\\s+");
    // TODO: translate each Pig Latin word to English
    StringBuilder sb = new StringBuilder();
    System.out.println(sb.toString().trim());
  }
}`,
      cpp: '#include <iostream>\n#include <sstream>\n#include <vector>\n#include <string>\nusing namespace std;\nint main() { string line; getline(cin, line); stringstream ss(line); vector<string> words; string w; while (ss >> w) words.push_back(w); /* TODO: translate each Pig Latin word to English */ cout << endl; return 0; }',
    },
  },
  // ─── More easy ───────────────────────────────────────────────────────────
  {
    title: 'Maximum of Three',
    description: `Read three integers and print the largest.

**Input:** One line with three space-separated integers.  
**Output:** The maximum value.

**Example:**  
Input: \`1 5 3\` → Output: \`5\`  
Input: \`-2 -8 -1\` → Output: \`-1\``,
    difficulty: 'easy' as const,
    languages: ['javascript', 'python', 'java', 'cpp'],
    tags: ['math', 'easy'],
    examples: [
      { input: '1 5 3', output: '5' },
      { input: '-2 -8 -1', output: '-1' },
    ],
    testCases: [
      { input: '1 5 3', expectedOutput: '5' },
      { input: '-2 -8 -1', expectedOutput: '-1' },
      { input: '10 10 9', expectedOutput: '10' },
      { input: '0 0 0', expectedOutput: '0' },
    ],
    starterCode: {
      javascript:
        'const [a, b, c] = readline().split(/\\s+/).map(Number);\n// TODO: print max of a, b, c\nconsole.log(0);',
      python:
        'a, b, c = map(int, input().split())\n# TODO: print max of a, b, c\nprint(0)',
      java: `import java.io.*;
import java.util.*;

public class Solution {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    int a = Integer.parseInt(st.nextToken()), b = Integer.parseInt(st.nextToken()), c = Integer.parseInt(st.nextToken());
    // TODO: print max of a, b, c
    System.out.println(0);
  }
}`,
      cpp: '#include <iostream>\nusing namespace std;\nint main() { int a, b, c; cin >> a >> b >> c; /* TODO: print max */ cout << 0 << endl; return 0; }',
    },
    hints: [
      {
        text: 'Compare values pairwise, or use a built-in **max** function from the language.',
        tier: 'basic' as const,
        cost: 0,
      },
    ],
  },
  {
    title: 'Vowel Counter',
    description: `Count how many vowels appear in a line of text (case-insensitive).  
Vowels: **a, e, i, o, u**.

**Input:** One line (non-empty string, letters and spaces allowed).  
**Output:** A single integer — the number of vowels.

**Example:**  
Input: \`ByteBattle\` → Output: \`4\`  
Input: \`rhythm\` → Output: \`0\``,
    difficulty: 'easy' as const,
    languages: ['javascript', 'python', 'java', 'cpp'],
    tags: ['string', 'easy'],
    examples: [
      { input: 'ByteBattle', output: '4' },
      { input: 'rhythm', output: '0' },
    ],
    testCases: [
      { input: 'ByteBattle', expectedOutput: '4' },
      { input: 'rhythm', expectedOutput: '0' },
      { input: 'AEIOU', expectedOutput: '5' },
      { input: 'a', expectedOutput: '1' },
    ],
    starterCode: {
      javascript:
        'const s = readline();\n// TODO: count vowels a,e,i,o,u (ignore case)\nconsole.log(0);',
      python:
        's = input()\n# TODO: count vowels a,e,i,o,u (ignore case)\nprint(0)',
      java: `import java.io.*;

public class Solution {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String s = br.readLine();
    // TODO: count vowels a,e,i,o,u (ignore case)
    System.out.println(0);
  }
}`,
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\nint main() { string s; getline(cin, s); /* TODO: count vowels */ cout << 0 << endl; return 0; }',
    },
  },
  // ─── More medium ─────────────────────────────────────────────────────────
  {
    title: 'Anagram Check',
    description: `Two words are **anagrams** if they use the same letters the same number of times (ignoring order).

**Input:** Two lines — first word, second word (lowercase letters only, non-empty).  
**Output:** \`YES\` if they are anagrams, otherwise \`NO\`.

**Example:**  
Input: \`listen\\nsilent\` → Output: \`YES\`  
Input: \`hello\\nworld\` → Output: \`NO\``,
    difficulty: 'medium' as const,
    languages: ['javascript', 'python', 'java', 'cpp'],
    tags: ['string', 'sorting'],
    examples: [
      { input: 'listen\nsilent', output: 'YES' },
      { input: 'hello\nworld', output: 'NO' },
    ],
    testCases: [
      { input: 'listen\nsilent', expectedOutput: 'YES' },
      { input: 'hello\nworld', expectedOutput: 'NO' },
      { input: 'a\na', expectedOutput: 'YES' },
      { input: 'abc\ncba', expectedOutput: 'YES' },
      { input: 'abc\nabz', expectedOutput: 'NO' },
    ],
    starterCode: {
      javascript:
        'const a = readline().trim();\nconst b = readline().trim();\n// TODO: print YES if anagrams else NO\nconsole.log("NO");',
      python:
        'a = input().strip()\nb = input().strip()\n# TODO: print YES if anagrams else NO\nprint("NO")',
      java: `import java.io.*;

public class Solution {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String a = br.readLine().trim();
    String b = br.readLine().trim();
    // TODO: print YES if anagrams else NO
    System.out.println("NO");
  }
}`,
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\nint main() { string a, b; getline(cin, a); getline(cin, b); /* TODO: YES/NO anagram */ cout << "NO" << endl; return 0; }',
    },
    hints: [
      {
        text: 'Sort characters of both words (or count each letter with a map), then compare.',
        tier: 'basic' as const,
        cost: 0,
      },
    ],
  },
  {
    title: 'Cyclic Rotation Check',
    description: `String \`B\` is a **cyclic rotation** of \`A\` if you can split \`A\` into \`XY\` such that \`B = YX\` (same length, same characters in order around the circle).

**Input:** Two lines — string \`A\`, then string \`B\` (same length, lowercase letters).  
**Output:** \`YES\` or \`NO\`.

**Example:**  
Input: \`abcde\\ncdeab\` → Output: \`YES\`  
Input: \`abcde\\nabced\` → Output: \`NO\``,
    difficulty: 'medium' as const,
    languages: ['javascript', 'python', 'java', 'cpp'],
    tags: ['string'],
    examples: [
      { input: 'abcde\ncdeab', output: 'YES' },
      { input: 'abcde\nabced', output: 'NO' },
    ],
    testCases: [
      { input: 'abcde\ncdeab', expectedOutput: 'YES' },
      { input: 'abcde\nabced', expectedOutput: 'NO' },
      { input: 'a\na', expectedOutput: 'YES' },
      { input: 'ab\nba', expectedOutput: 'YES' },
      { input: 'ab\nca', expectedOutput: 'NO' },
    ],
    starterCode: {
      javascript:
        'const A = readline().trim();\nconst B = readline().trim();\n// TODO: YES if B is a rotation of A\nconsole.log("NO");',
      python:
        'A = input().strip()\nB = input().strip()\n# TODO: YES if B is a rotation of A\nprint("NO")',
      java: `import java.io.*;

public class Solution {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    String A = br.readLine().trim();
    String B = br.readLine().trim();
    // TODO: YES if B is a rotation of A
    System.out.println("NO");
  }
}`,
      cpp: '#include <iostream>\n#include <string>\nusing namespace std;\nint main() { string A, B; getline(cin, A); getline(cin, B); /* TODO */ cout << "NO" << endl; return 0; }',
    },
    hints: [
      {
        text: 'If **A** and **B** have the same length, check whether **B** is a substring of **A+A**.',
        tier: 'detailed' as const,
        cost: 0,
      },
    ],
  },
  // ─── More hard ───────────────────────────────────────────────────────────
  {
    title: 'Power of Two',
    description: `Given a positive integer \`n\`, decide if it is a **power of two** (i.e. \`n = 2^k\` for some integer \`k ≥ 0\`).

**Input:** One line, integer \`n\` (\`1 ≤ n ≤ 10^9\`).  
**Output:** \`YES\` or \`NO\`.

**Example:**  
Input: \`8\` → Output: \`YES\`  
Input: \`10\` → Output: \`NO\`  
Input: \`1\` → Output: \`YES\``,
    difficulty: 'hard' as const,
    languages: ['javascript', 'python', 'java', 'cpp'],
    tags: ['math', 'bit-manipulation'],
    examples: [
      { input: '8', output: 'YES' },
      { input: '10', output: 'NO' },
      { input: '1', output: 'YES' },
    ],
    testCases: [
      { input: '8', expectedOutput: 'YES' },
      { input: '10', expectedOutput: 'NO' },
      { input: '1', expectedOutput: 'YES' },
      { input: '1024', expectedOutput: 'YES' },
      { input: '1023', expectedOutput: 'NO' },
      { input: '536870912', expectedOutput: 'YES' },
    ],
    starterCode: {
      javascript:
        'const n = parseInt(readline().trim(), 10);\n// TODO: YES if n is a power of two\nconsole.log("NO");',
      python:
        'n = int(input().strip())\n# TODO: YES if n is a power of two\nprint("NO")',
      java: `import java.io.*;

public class Solution {
  public static void main(String[] args) throws IOException {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    long n = Long.parseLong(br.readLine().trim());
    // TODO: YES if n is a power of two
    System.out.println("NO");
  }
}`,
      cpp: '#include <iostream>\nusing namespace std;\nint main() { long long n; cin >> n; /* TODO */ cout << "NO" << endl; return 0; }',
    },
    hints: [
      {
        text: 'Powers of 2 in binary have only **one bit** set to 1 (e.g. 8 = 1000).',
        tier: 'basic' as const,
        cost: 0,
      },
      {
        text: 'You can also keep dividing **n** by 2 while it is even and check whether you reach 1.',
        tier: 'detailed' as const,
        cost: 0,
      },
    ],
  },
];
