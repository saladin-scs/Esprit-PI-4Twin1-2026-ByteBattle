/* eslint-disable prettier/prettier */
// src/feedback/feedback.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';

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
  private readonly aiServiceUrl: string;

  constructor(private configService: ConfigService) {
    this.aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ||
      'http://localhost:8000';
  }

  /**
   * Sends code to the Python AI service and returns structured analysis.
   * @param request Code analysis request with code and optional context
   * @returns FeedbackResponse object
   */
  async getFeedback(request: CodeAnalysisRequest): Promise<FeedbackResponse> {
    try {
      const url = `${this.aiServiceUrl}/ai/analyze-code`;
      this.logger.debug(`Calling AI service at ${url}`);

      const response: AxiosResponse<FeedbackResponse> = await axios.post(
        url,
        {
          code: request.code,
          language: request.language || 'python',
          tests_passed: request.tests_passed,
          execution_error: request.execution_error,
          runtime_ms: request.runtime_ms,
          memory_kb: request.memory_kb,
          task_description: request.task_description,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        },
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Error calling AI service:',
        error.response?.data ?? error.message,
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
