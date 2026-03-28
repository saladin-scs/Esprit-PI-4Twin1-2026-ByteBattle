/**
 * One easy + one medium + one hard — for POST /challenges/dev/post-easy-medium-hard
 */
import type { CreateChallengeDto } from './dto/create-challenge.dto';

const py = (body: string) => body;
const js = (body: string) => body;

export const DEV_TRIPLE_CHALLENGES: CreateChallengeDto[] = [
  {
    title: '[Sample] Easy — Sum two integers',
    description: `Read two integers from one line (space-separated). Print their sum.`,
    difficulty: 'easy',
    languages: ['javascript', 'python', 'java', 'cpp'],
    tags: ['sample', 'easy', 'math'],
    examples: [
      { input: '3 5', output: '8' },
      { input: '10 -4', output: '6' },
    ],
    testCases: [
      { input: '3 5', expectedOutput: '8' },
      { input: '10 -4', expectedOutput: '6' },
      { input: '0 0', expectedOutput: '0' },
      { input: '100 200', expectedOutput: '300' },
    ],
    starterCode: {
      javascript: js(`const [a, b] = readline().split(/\\s+/).map(Number);
console.log(a + b);`),
      python: py(`a, b = map(int, input().split())
print(a + b)`),
      java: `import java.io.*;
import java.util.*;
public class Solution {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    int a = Integer.parseInt(st.nextToken());
    int b = Integer.parseInt(st.nextToken());
    System.out.println(a + b);
  }
}`,
      cpp: `#include <iostream>
using namespace std;
int main() { int a, b; cin >> a >> b; cout << (a + b); return 0; }`,
    },
  },
  {
    title: '[Sample] Medium — Second largest',
    description: `First line: integer n (2 ≤ n ≤ 100). Second line: n **distinct** integers. Print the **second largest** value.`,
    difficulty: 'medium',
    languages: ['javascript', 'python', 'java', 'cpp'],
    tags: ['sample', 'medium', 'arrays'],
    examples: [
      { input: '4\n4 1 7 3', output: '4' },
      { input: '3\n10 20 15', output: '15' },
    ],
    testCases: [
      { input: '4\n4 1 7 3', expectedOutput: '4' },
      { input: '3\n10 20 15', expectedOutput: '15' },
      { input: '2\n5 9', expectedOutput: '5' },
      { input: '5\n-1 -5 -2 -3 -4', expectedOutput: '-2' },
    ],
    starterCode: {
      javascript: `const n = parseInt(readline(), 10);
const arr = readline().split(/\\s+/).map(Number);
// second largest of distinct ints
console.log(0);`,
      python: `n = int(input())
arr = list(map(int, input().split()))
print(0)`,
      java: `import java.io.*; import java.util.*;
public class Solution {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    int n = Integer.parseInt(br.readLine());
    StringTokenizer st = new StringTokenizer(br.readLine());
    int[] a = new int[n];
    for (int i = 0; i < n; i++) a[i] = Integer.parseInt(st.nextToken());
    System.out.println(0);
  }
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
int main() { int n; cin >> n; vector<int> a(n); for (int& x : a) cin >> x; cout << 0; return 0; }`,
    },
  },
  {
    title: '[Sample] Hard — Two sum indices',
    description: `Line 1: n and target (space-separated). Line 2: n integers.  
Find two **different** indices i < j such that a[i] + a[j] == target.  
Print i and j separated by a space. If no pair exists, print \`-1\`.  
Guaranteed at most one valid pair in tests.`,
    difficulty: 'hard',
    languages: ['javascript', 'python', 'java', 'cpp'],
    tags: ['sample', 'hard', 'hashmap'],
    examples: [
      { input: '4 9\n2 7 11 15', output: '0 1' },
      { input: '3 6\n3 3 3', output: '0 1' },
    ],
    testCases: [
      { input: '4 9\n2 7 11 15', expectedOutput: '0 1' },
      { input: '3 6\n3 3 3', expectedOutput: '0 1' },
      { input: '2 0\n0 0', expectedOutput: '0 1' },
      { input: '3 100\n1 2 3', expectedOutput: '-1', isHidden: true },
    ],
    starterCode: {
      javascript: `const [n, t] = readline().split(/\\s+/).map(Number);
const a = readline().split(/\\s+/).map(Number);
console.log('-1');`,
      python: `n, t = map(int, input().split())
a = list(map(int, input().split()))
print(-1)`,
      java: `import java.io.*; import java.util.*;
public class Solution {
  public static void main(String[] args) throws Exception {
    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    StringTokenizer st = new StringTokenizer(br.readLine());
    int n = Integer.parseInt(st.nextToken());
    int t = Integer.parseInt(st.nextToken());
    st = new StringTokenizer(br.readLine());
    int[] a = new int[n];
    for (int i = 0; i < n; i++) a[i] = Integer.parseInt(st.nextToken());
    System.out.println(-1);
  }
}`,
      cpp: `#include <bits/stdc++.h>
using namespace std;
int main() { int n, t; cin >> n >> t; vector<int> a(n); for (int& x : a) cin >> x; cout << -1; return 0; }`,
    },
  },
];
