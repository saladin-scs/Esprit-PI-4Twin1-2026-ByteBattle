/* eslint-disable prettier/prettier */
// src/feedback/feedback.service.ts

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RateLimiterMemory } from 'rate-limiter-flexible';

interface FeedbackPoint {
  title: string;
  description: string;
  category: string;
  severity: string;
}

interface FeedbackResponse {
  overall_score: number;
  summary: string;
  points: FeedbackPoint[];
  extra?: Record<string, any>;
}

interface CodeAnalysisRequest {
  code: string;
  language?: string;
  tests_passed?: boolean;
  tests_passed_count?: number;
  tests_total?: number;
  execution_error?: string;
  runtime_ms?: number;
  memory_kb?: number;
  task_description?: string;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  /** Abuse limit: 40 requests per hour per user. */
  private readonly userLimiter = new RateLimiterMemory({
    points: 40,
    duration: 3600,
  });

  private clamp(n: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, n));
  }

  private sanitizeLanguage(lang?: string): string {
    const v = String(lang || 'python').toLowerCase();
    if (v === 'js') return 'javascript';
    if (v === 'c++') return 'cpp';
    return v;
  }

  private addPoint(
    points: FeedbackPoint[],
    title: string,
    description: string,
    category: 'strength' | 'improvement' | 'hint',
    severity: 'info' | 'low' | 'medium' | 'high',
  ) {
    points.push({ title, description, category, severity });
  }

  private runLocalAnalysis(request: CodeAnalysisRequest): FeedbackResponse {
    const code = String(request.code || '');
    const language = this.sanitizeLanguage(request.language);
    const codeTrim = code.trim();
    const lines = code.replace(/\r\n/g, '\n').split('\n');
    const nonEmptyLines = lines.filter((l) => l.trim().length > 0).length;
    const charCount = code.length;
    const runtime = Number.isFinite(request.runtime_ms as number) ? Number(request.runtime_ms) : null;
    const testsPassedBool = typeof request.tests_passed === 'boolean' ? request.tests_passed : null;
    const testsPassedCount =
      Number.isInteger(request.tests_passed_count) && Number(request.tests_passed_count) >= 0
        ? Number(request.tests_passed_count)
        : null;
    const testsTotal =
      Number.isInteger(request.tests_total) && Number(request.tests_total) >= 0
        ? Number(request.tests_total)
        : null;
    const hasExecError = Boolean(String(request.execution_error || '').trim());
    const points: FeedbackPoint[] = [];

    let score = 60;

    if (!codeTrim) {
      return {
        overall_score: 0,
        summary: 'No code was provided to analyze.',
        points: [
          {
            title: 'Empty submission',
            description: 'Write your implementation first, then run AI Coach again for targeted advice.',
            category: 'improvement',
            severity: 'high',
          },
        ],
      };
    }

    if (testsPassedCount !== null && testsTotal !== null && testsTotal > 0) {
      const ratio = testsPassedCount / testsTotal;
      score += Math.round((ratio - 0.5) * 40);
      if (ratio === 1) {
        this.addPoint(
          points,
          'All tests passed',
          `Great job: ${testsPassedCount}/${testsTotal} tests are passing. Focus now on readability and edge-case robustness.`,
          'strength',
          'info',
        );
      } else {
        this.addPoint(
          points,
          'Partial test coverage',
          `Only ${testsPassedCount}/${testsTotal} tests pass. Compare failing outputs and verify boundary conditions.`,
          'improvement',
          'medium',
        );
      }
    } else if (testsPassedBool === true) {
      score += 18;
      this.addPoint(
        points,
        'Tests status is positive',
        'Current test signal indicates the solution is accepted. Consider simplifying or documenting key steps.',
        'strength',
        'info',
      );
    } else if (testsPassedBool === false) {
      score -= 15;
      this.addPoint(
        points,
        'Tests are failing',
        'At least one test is failing. Re-check input/output format and edge-case handling.',
        'improvement',
        'medium',
      );
    }

    if (hasExecError) {
      score -= 25;
      this.addPoint(
        points,
        'Execution error detected',
        `Runtime/compile error: ${String(request.execution_error).slice(0, 180)}`,
        'improvement',
        'high',
      );
    }

    if (runtime !== null) {
      if (runtime > 2500) {
        score -= 12;
        this.addPoint(
          points,
          'Performance risk',
          `Observed runtime is ${Math.round(runtime)} ms. Consider reducing complexity or avoiding repeated scans/parsing.`,
          'improvement',
          'medium',
        );
      } else if (runtime <= 250) {
        score += 5;
        this.addPoint(
          points,
          'Fast execution',
          `Observed runtime (${Math.round(runtime)} ms) is good for this run.`,
          'strength',
          'low',
        );
      }
    }

    const hasPlaceholder =
      /TODO|FIXME|pass\b|return\s+input\b|print\(0\)|console\.log\(0\)|out\s*=\s*\[\s*\]/i.test(code);
    if (hasPlaceholder) {
      score -= 18;
      this.addPoint(
        points,
        'Template placeholder still present',
        'Your code still looks close to starter/template logic (e.g., TODO/pass/return input). Replace placeholders with full algorithmic logic.',
        'improvement',
        'high',
      );
    }

    const looksHardcodedMap =
      /(CASE_MAP|map\.put\(|unordered_map<|\{\s*"\d+"\s*:\s*"\d+")/i.test(code) &&
      (testsTotal === null || testsTotal <= 3);
    if (looksHardcodedMap) {
      score -= 12;
      this.addPoint(
        points,
        'Hardcoded-case smell',
        'The solution appears to rely on input-output mapping. This is fragile when hidden tests are used. Prefer a general algorithm.',
        'improvement',
        'medium',
      );
    }

    const hasStructure =
      language === 'python'
        ? /\bdef\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/.test(code)
        : language === 'javascript'
          ? /(function\s+[a-zA-Z_]|=>)/.test(code)
          : language === 'java'
            ? /class\s+\w+/.test(code)
            : /(int\s+main\s*\(|\bvoid\s+\w+\s*\()/.test(code);
    if (hasStructure) {
      score += 6;
      this.addPoint(
        points,
        'Clear structure',
        'The solution has a clear code structure (function/class blocks), which helps maintainability and debugging.',
        'strength',
        'low',
      );
    }

    if (nonEmptyLines > 160 || charCount > 12000) {
      score -= 8;
      this.addPoint(
        points,
        'Large solution size',
        'The submission is quite long. Consider extracting repeated logic or simplifying conditions to improve clarity.',
        'hint',
        'low',
      );
    }

    const needsInputOutputHint =
      language === 'python'
        ? !/input\(|sys\.stdin/.test(code)
        : language === 'javascript'
          ? !/readline\(|fs\.readFileSync\(0/.test(code)
          : language === 'java'
            ? !/BufferedReader|Scanner/.test(code)
            : !/cin|getline/.test(code);
    if (needsInputOutputHint) {
      this.addPoint(
        points,
        'Input/output format check',
        'Make sure the solution reads stdin and prints exactly the expected stdout format (no extra labels or spaces).',
        'hint',
        'medium',
      );
    }

    if (!points.length) {
      this.addPoint(
        points,
        'Baseline analysis',
        'No major red flags were detected. Compare against edge cases and complexity expectations for final polishing.',
        'hint',
        'low',
      );
    }

    const summaryParts: string[] = [];
    if (testsPassedCount !== null && testsTotal !== null && testsTotal > 0) {
      summaryParts.push(`Tests: ${testsPassedCount}/${testsTotal}`);
    } else if (testsPassedBool !== null) {
      summaryParts.push(`Tests status: ${testsPassedBool ? 'passed' : 'failing'}`);
    }
    if (runtime !== null) {
      summaryParts.push(`Runtime: ${Math.round(runtime)} ms`);
    }
    summaryParts.push(`Size: ${nonEmptyLines} non-empty lines`);

    const nextSteps = points
      .filter((p) => p.category !== 'strength')
      .slice(0, 3)
      .map((p) => p.title);

    return {
      overall_score: this.clamp(score, 0, 100),
      summary:
        `Local AI Coach analysis completed. ${summaryParts.join(' | ')}. ` +
        'Use the points below as a short action plan to improve correctness and robustness.',
      points,
      extra: {
        analyzer: 'local-heuristic-v2',
        metrics: {
          language,
          lines: nonEmptyLines,
          chars: charCount,
          runtime_ms: runtime,
          tests_passed_count: testsPassedCount,
          tests_total: testsTotal,
          tests_passed: testsPassedBool,
        },
        next_steps: nextSteps,
      },
    };
  }

  /**
   * Local code feedback with deterministic heuristics.
   */
  async getFeedback(request: CodeAnalysisRequest, userId: string): Promise<FeedbackResponse> {
    try {
      await this.userLimiter.consume(userId, 1);
    } catch {
      throw new HttpException(
        'Analysis limit reached for this hour. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.logger.debug('Feedback requested (local heuristic analyzer)');
    return this.runLocalAnalysis(request);
  }

  /**
   * Convenience method for simple code analysis without execution context.
   * @param code The code submitted by the user
   * @param language Programming language (default: 'python')
   * @returns FeedbackResponse object
   */
  async analyzeCode(
    code: string,
    language: string = 'python',
    userId = 'anonymous',
  ): Promise<FeedbackResponse> {
    return this.getFeedback({ code, language }, userId);
  }
}
