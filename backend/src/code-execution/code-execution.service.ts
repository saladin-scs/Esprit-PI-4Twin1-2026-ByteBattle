/* eslint-disable prettier/prettier */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ExecuteCodeDto } from './dto/execute-code.dto';
import axios from 'axios';

@Injectable()
export class CodeExecutionService {
  private readonly logger = new Logger(CodeExecutionService.name);

  private readonly pistonEndpoint = 'https://emkc.org/api/v2/piston/execute';

  // Map human-readable languages to supported Piston runtime versions
  private languageVersionMap: Record<string, string> = {
    python: '3.10.0',
    javascript: '18.15.0',
    'c++': '10.2.0',
    c: '10.2.0',
    java: '15.0.2',
  };

  async executeCode(dto: ExecuteCodeDto) {
    const { code, language, testCases } = dto;

    if (!code || !code.trim()) {
      throw new BadRequestException('Code cannot be empty');
    }

    if (!testCases || testCases.length === 0) {
      throw new BadRequestException('At least one test case is required');
    }

    const version = this.languageVersionMap[language.toLowerCase()];

    if (!version) {
      throw new BadRequestException(
        `Unsupported language: ${language}. Supported languages: ${Object.keys(this.languageVersionMap).join(', ')}`,
      );
    }

    const results = [];

    for (const [index, testCase] of testCases.entries()) {
      try {
        const payload = {
          language: language.toLowerCase(),
          version,
          files: [{ name: 'main', content: code }],
          stdin: testCase.input ?? '',
        };

        const response = await axios.post(this.pistonEndpoint, payload);

        const output = response.data?.run?.stdout?.trim() || '';
        const error = response.data?.run?.stderr?.trim() || '';

        const passed = output === (testCase.expectedOutput?.trim() || '');

        results.push({
          testCase: index + 1,
          passed,
          output,
          error,
          executionTime: response.data?.run?.time || 0,
        });
      } catch (err: any) {
        this.logger.error(`Execution error for test case ${index + 1}`, err.message);
        results.push({
          testCase: index + 1,
          passed: false,
          output: '',
          error: err.message,
          executionTime: 0,
        });
      }
    }

    const totalPassed = results.filter(r => r.passed).length;

    return {
      results,
      overall: {
        passed: totalPassed,
        total: testCases.length,
      },
    };
  }

  async validateSolution(code: string, language: string, testCases: any[]) {
    return this.executeCode({ code, language, testCases });
  }
}
