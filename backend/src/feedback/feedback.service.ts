/* eslint-disable prettier/prettier */
// src/feedback/feedback.service.ts

import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
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
  extra?: Record<string, unknown>;
}

interface CodeAnalysisRequest {
  code: string;
  language?: string;
  tests_passed?: boolean;
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
  private readonly aiServiceUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  private readonly aiServiceTimeoutMs = Math.min(
    60000,
    Math.max(1000, Number(process.env.AI_SERVICE_TIMEOUT_MS || 12000)),
  );
  private readonly aiServiceApiKey = (process.env.AI_SERVICE_API_KEY || '').trim();

  private buildHeuristicFallback(request: CodeAnalysisRequest, reason: string): FeedbackResponse {
    const points: FeedbackPoint[] = [];
    let score = 55;

    if (request.tests_passed === true) {
      score += 22;
      points.push({
        title: 'Tests are passing',
        description: 'Current test run succeeded. Keep this confidence by adding edge-case tests.',
        category: 'strength',
        severity: 'low',
      });
    } else if (request.tests_passed === false) {
      score -= 12;
      points.push({
        title: 'Tests are failing',
        description: 'At least one test failed. Focus first on correctness before micro-optimizations.',
        category: 'improvement',
        severity: 'medium',
      });
    } else {
      points.push({
        title: 'No test signal provided',
        description: 'Run tests before analysis for more accurate coaching.',
        category: 'hint',
        severity: 'low',
      });
    }

    if (request.execution_error) {
      score -= 16;
      points.push({
        title: 'Runtime/compile error detected',
        description: 'Fix the execution error first, then rerun analysis for higher-quality suggestions.',
        category: 'improvement',
        severity: 'high',
      });
    }

    if (typeof request.runtime_ms === 'number' && Number.isFinite(request.runtime_ms)) {
      if (request.runtime_ms < 150) score += 8;
      else if (request.runtime_ms > 3000) score -= 8;
    }

    if ((request.code || '').trim().length < 20) {
      score -= 10;
      points.push({
        title: 'Very short submission',
        description: 'Add a fuller implementation so the analyzer can reason about structure and edge cases.',
        category: 'hint',
        severity: 'low',
      });
    }

    score = Math.max(10, Math.min(95, Math.round(score)));
    return {
      overall_score: score,
      summary:
        `Using local in-project fallback analysis because upstream AI is unavailable (${reason}). ` +
        'This result is still actionable and should not block your flow.',
      points:
        points.length > 0
          ? points
          : [
              {
                title: 'General recommendation',
                description: 'Rerun tests and include execution context for a richer analysis report.',
                category: 'hint',
                severity: 'low',
              },
            ],
      extra: { fallback: true, reason, source: 'local_heuristic' },
    };
  }

  private fallbackFeedback(request: CodeAnalysisRequest, reason: string): FeedbackResponse {
    return {
      ...this.buildHeuristicFallback(request, reason),
    };
  }

  private normalizeFeedback(payload: unknown): FeedbackResponse {
    const raw = payload as Partial<FeedbackResponse> | null | undefined;
    const score = Number(raw?.overall_score ?? 0);
    const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
    const summary =
      typeof raw?.summary === 'string' && raw.summary.trim()
        ? raw.summary
        : 'Analysis completed with limited details.';
    const pointsRaw = Array.isArray(raw?.points) ? raw.points : [];
    const points = pointsRaw
      .map((p) => {
        const point = p as Partial<FeedbackPoint>;
        const title = typeof point.title === 'string' ? point.title.trim() : '';
        const description = typeof point.description === 'string' ? point.description.trim() : '';
        if (!title || !description) return null;
        return {
          title,
          description,
          category: typeof point.category === 'string' && point.category.trim() ? point.category : 'improvement',
          severity:
            point.severity === 'high' || point.severity === 'medium' || point.severity === 'low'
              ? point.severity
              : 'low',
        } as FeedbackPoint;
      })
      .filter((x): x is FeedbackPoint => x !== null);

    return {
      overall_score: safeScore,
      summary,
      points:
        points.length > 0
          ? points
          : [
              {
                title: 'General recommendation',
                description: 'No detailed points were returned. Re-run analysis after adding tests and context.',
                category: 'improvement',
                severity: 'low',
              },
            ],
      extra: (raw?.extra as Record<string, unknown>) || undefined,
    };
  }

  /**
   * Analyze code using the internal Python AI service.
   * Returns deterministic fallback payload if upstream is unavailable.
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
    const endpoint = `${this.aiServiceUrl}/ai/analyze-code`;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.aiServiceApiKey) {
        headers['x-api-key'] = this.aiServiceApiKey;
      }
      const response = await axios.post(endpoint, request, {
        timeout: this.aiServiceTimeoutMs,
        headers,
        validateStatus: () => true,
      });
      if (response.status >= 200 && response.status < 300) {
        return this.normalizeFeedback(response.data);
      }
      if (response.status === 429) {
        throw new HttpException('AI analysis service is busy. Please retry in a moment.', HttpStatus.TOO_MANY_REQUESTS);
      }
      this.logger.warn(`AI service returned status ${response.status}`);
      return this.fallbackFeedback(request, 'upstream_error');
    } catch (e: unknown) {
      if (e instanceof HttpException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`AI analysis failed: ${msg}`);
      return this.fallbackFeedback(
        request,
        msg.toLowerCase().includes('timeout') ? 'timeout' : 'service_unavailable',
      );
    }
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
