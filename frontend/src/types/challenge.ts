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
