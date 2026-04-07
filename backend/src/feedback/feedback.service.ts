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

  /**
   * Code feedback is not available without an external analysis service.
   */
  async getFeedback(_request: CodeAnalysisRequest, userId: string): Promise<FeedbackResponse> {
    try {
      await this.userLimiter.consume(userId, 1);
    } catch {
      throw new HttpException(
        'Analysis limit reached for this hour. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.logger.debug('Feedback requested (analysis disabled)');
    return {
      overall_score: 0,
      summary: 'Automated code analysis is not enabled on this deployment.',
      points: [
        {
          title: 'Manual review',
          description: 'Review your solution against the problem statement and run the provided tests.',
          category: 'improvement',
          severity: 'low',
        },
      ],
    };
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
