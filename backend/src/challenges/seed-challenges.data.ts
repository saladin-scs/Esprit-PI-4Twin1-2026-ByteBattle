/**
 * Seed data: 2 easy + 2 medium + 2 hard challenges (stdin → stdout).
 * Used by POST /admin/seed-challenges or on first run.
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
      javascript: 'const s = readline().trim();\n// TODO: reverse s and output the result\nlet result = "";\nconsole.log(result);',
      python: 's = input().strip()\n# TODO: reverse s and output the result\nresult = ""\nprint(result)',
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
      javascript: 'const n = parseInt(readline(), 10);\nconst arr = readline().split(/\\s+/).map(Number);\n// TODO: compute sum of arr and output it\nlet sum = 0;\nconsole.log(sum);',
      python: 'n = int(input())\narr = list(map(int, input().split()))\n# TODO: compute sum of arr and output it\nsum_val = 0\nprint(sum_val)',
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
      javascript: 'const line1 = readline().split(/\\s+/).map(Number);\nconst n = parseInt(readline(), 10);\nlet a = line1[0], b = line1[1];\n// TODO: output the next n Fibonacci numbers (space-separated)\nconst out = [];\nconsole.log(out.join(" "));',
      python: 'a, b = map(int, input().split())\nn = int(input())\n# TODO: output the next n Fibonacci numbers (space-separated)\nout = []\nprint(" ".join(map(str, out)))',
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
      javascript: 'const a = readline().split(/\\s+/).filter(Boolean);\nconst b = readline().split(/\\s+/).filter(Boolean);\n// TODO: zipper-merge a and b (alternate one from each), output space-separated\nconst out = [];\nconsole.log(out.join(" "));',
      python: 'a = input().split()\nb = input().split()\n# TODO: zipper-merge a and b (alternate one from each), output space-separated\nout = []\nprint(" ".join(out))',
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
      javascript: 'const s = readline().trim();\n// TODO: convert Roman numeral s to decimal (I=1, V=5, X=10, L=50, C=100, D=500, M=1000)\nlet result = 0;\nconsole.log(result);',
      python: 's = input().strip()\n# TODO: convert Roman numeral s to decimal (I=1, V=5, X=10, L=50, C=100, D=500, M=1000)\nresult = 0\nprint(result)',
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
      javascript: 'const line = readline().trim();\nconst words = line.split(/\\s+/);\n// TODO: translate each Pig Latin word to English ("...ay" and "...way" rules)\nconst out = [];\nconsole.log(out.join(" "));',
      python: 'line = input().strip()\nwords = line.split()\n# TODO: translate each Pig Latin word to English ("...ay" and "...way" rules)\nout = []\nprint(" ".join(out))',
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
];
