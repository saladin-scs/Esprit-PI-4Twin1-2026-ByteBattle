/* eslint-disable prettier/prettier */
// src/ai/ai.service.ts
import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface CodeAnalysisRequest {
  code: string;
  language?: string;
  tests_passed?: boolean;
  execution_error?: string;
  runtime_ms?: number;
  memory_kb?: number;
  task_description?: string;
}

interface CodeAnalysisResponse {
  overall_score: number;
  summary: string;
  points: Array<{
    title: string;
    description: string;
    category: string;
    severity: string;
  }>;
  extra?: Record<string, any>;
}

@Injectable()
export class AiService {
  private readonly apiKey: string;
  private readonly aiServiceUrl: string;
  private readonly logger = new Logger(AiService.name);

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY') || '';
    this.aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ||
      'http://localhost:8000';
  }

  private async callOpenRouter(prompt: string): Promise<string> {
    if (!this.apiKey) {
      this.logger.warn('OPENROUTER_API_KEY is not set. Challenge generation is unavailable.');
      throw new ServiceUnavailableException(
        'Challenge generation is unavailable because OPENROUTER_API_KEY is not configured.',
      );
    }

    const url = 'https://openrouter.ai/api/v1/chat/completions';

    try {
      const response = await axios.post(
        url,
        {
          model: 'openai/gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are an AI coding challenge generator.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        },
      );

      const text = response.data.choices?.[0]?.message?.content;
      return text ?? 'Error: No text generated';
    } catch (err: any) {
      this.logger.error('OpenRouter API error:', err.response?.data ?? err.message);
      throw new BadGatewayException(
        err.response?.data?.error?.message ||
          'Unable to generate a challenge from the AI provider right now.',
      );
    }
  }

  /**
   * Analyze code using the Python AI service
   * POSTs to http://localhost:8000/ai/analyze-code (or configured AI_SERVICE_URL)
   */
  async analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResponse> {
    const url = `${this.aiServiceUrl}/ai/analyze-code`;

    try {
      this.logger.debug(`Calling Python AI service at ${url}`);

      const response = await axios.post<CodeAnalysisResponse>(
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

      this.logger.debug(
        `AI service response: score=${response.data.overall_score}, points=${response.data.points?.length || 0}`,
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        'Error calling Python AI service:',
        error.response?.data ?? error.message,
      );

      // Return a fallback response instead of throwing
      return {
        overall_score: 0,
        summary: 'Error: Unable to analyze code. The AI service may be unavailable.',
        points: [
          {
            title: 'Service unavailable',
            description:
              'The AI analysis service is currently unavailable. Please try again later.',
            category: 'improvement',
            severity: 'high',
          },
        ],
      };
    }
  }

  async generateChallenge(difficulty: string, topic: string) {
    const prompt = `Generate a ${difficulty} coding challenge about ${topic} in valid JSON with keys:
- title
- description
- difficulty
- examples (array with {input, output, explanation?})
- testCases (array with {input, expectedOutput, isHidden})
- tags
- starterCode (object mapping languages to starter skeleton code. Use keys: javascript, python, java, cpp)
- officialSolution (object mapping languages to complete working solutions that pass the test cases. IMPORTANT: The solution code MUST read from standard input and write to standard output. For JavaScript, use 'readline()' to read strings and 'console.log()' to print. For Python, use 'sys.stdin.read()' or 'input()' to read and 'print()' to output. For Java, use 'Scanner(System.in)' and 'System.out.println()'. For C++, use 'cin' and 'cout'.  Use keys: javascript, python, java, cpp)
Return ONLY valid JSON.`;

    let resultText = await this.callOpenRouter(prompt);

    // Remove extra quotes if AI wraps JSON in a string
    if (resultText.startsWith('"') && resultText.endsWith('"')) {
      resultText = resultText.slice(1, -1).replace(/\\"/g, '"');
    }

    try {
      const parsed = JSON.parse(resultText);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('AI returned an invalid challenge payload.');
      }
      return parsed;
    } catch (err) {
      this.logger.error('Failed to parse AI challenge payload:', resultText);
      throw new BadGatewayException(
        'The AI returned an invalid challenge format. Please try again.',
      );
    }
  }
}
