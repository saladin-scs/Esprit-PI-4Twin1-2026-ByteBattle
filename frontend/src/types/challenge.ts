/**
 * Challenge interface matching the backend schema
 */

export interface TestCase {
  input: any;
  expectedOutput: any;
  isHidden?: boolean;
}

export interface Challenge {
  _id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  testCases: TestCase[];
  starterCode?: string | Record<string, string>;
  tags: string[];
  solvedCount: number;
  attemptCount?: number;
}

/** Test case format expected by code execution API */
export interface ExecuteTestCase {
  input: string;
  expectedOutput: string;
}

export interface SubmissionTestResult {
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  passed: boolean;
  error?: string;
  testNumber?: number;
  isHiddenCase?: boolean;
  message?: string;
}

export interface SubmissionHistory {
  _id: string;
  challengeId: {
    title: string;
    difficulty: string;
  };
  code: string;
  language: string;
  status: 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit' | 'pending';
  testResults: SubmissionTestResult[];
  passedTests: number;
  totalTests: number;
  xpEarned: number;
  executionTimeMs: number;
  createdAt: string;
}

export type OfficialSolution = {
  language?: string;
  code: string;
  challengeTitle: string;
} | {
  solutions: Array<{
    language: string;
    code: string;
  }>;
  challengeTitle: string;
};
