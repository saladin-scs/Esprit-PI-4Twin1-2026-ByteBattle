/* eslint-disable prettier/prettier */
// src/feedback/feedback.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

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

  constructor(private readonly aiService: AiService) {}

  /**
   * Sends code to the Python AI service and returns structured analysis.
   * @param request Code analysis request with code and optional context
   * @returns FeedbackResponse object
   */
  async getFeedback(request: CodeAnalysisRequest): Promise<FeedbackResponse> {
    try {
      return await this.aiService.analyzeCode(request as any);
    } catch (error: any) {
      this.logger.error(
        'Error calling AI service:',
        error?.message ?? error,
      );

      // Return a safe fallback response
      return {
        overall_score: 0,
        summary: 'Error: unable to analyze code. Please try again later.',
        points: [
          {
            title: 'Service unavailable',
            description:
              'The AI analysis service is currently unavailable. Please check your code manually.',
            category: 'improvement',
            severity: 'high',
          },
        ],
      };
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
  ): Promise<FeedbackResponse> {
    return this.getFeedback({ code, language });
  }
}
