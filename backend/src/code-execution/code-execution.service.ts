/* eslint-disable prettier/prettier */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ExecuteCodeDto } from './dto/execute-code.dto';
import axios from 'axios';
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class CodeExecutionService {
  private readonly logger = new Logger(CodeExecutionService.name);

  private readonly pistonEndpoint =
    process.env.PISTON_ENDPOINT || 'https://emkc.org/api/v2/piston/execute';

  private readonly requestTimeoutMs = Number(process.env.CODE_EXECUTION_TIMEOUT_MS || 15000);
  private readonly maxTestCases = Number(process.env.CODE_EXECUTION_MAX_TESTCASES || 20);
  private readonly maxCodeChars = Number(process.env.CODE_EXECUTION_MAX_CODE_CHARS || 20000);
  private readonly maxStdinChars = Number(process.env.CODE_EXECUTION_MAX_STDIN_CHARS || 5000);
  private readonly localTimeoutMs = 5000;
  private readonly localMaxBuffer = 4 * 1024 * 1024; // 4MB stdout/stderr cap per run

  // Piston runtime versions (align with GET /api/v2/runtimes on your Piston instance)
  private languageVersionMap: Record<string, string> = {
    python: '3.10.0',
    javascript: '18.15.0',
    'c++': '10.2.0',
    c: '10.2.0',
    java: '15.0.2',
  };

  /** Piston expects a file name; some runtimes use the extension. */
  private getPistonFileName(lang: string): string {
    switch (lang) {
      case 'python': return 'main.py';
      case 'javascript': return 'main.js';
      case 'java': return 'Main.java';
      case 'c++': return 'main.cpp';
      case 'c': return 'main.c';
      default: return 'main';
    }
  }

  // Local executor uses 'cpp', Piston uses 'c++'
  private toLocalLanguage(lang: string): string {
    return lang === 'c++' ? 'cpp' : lang;
  }

  /** Normalize stdin so "2, 3" becomes "2 3" for compatibility with input().split() */
  private normalizeStdin(input: string): string {
    const s = String(input ?? '').trim();
    if (!s) return s;
    if (/^[\d\s,.+-eE]+$/.test(s)) {
      return s.replace(/\s*,\s*/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return s;
  }

  /**
   * Normalize output for comparison: line endings to \n, trim each line and whole string.
   * Avoids false negatives from \r\n, trailing newlines, or trailing spaces per line.
   */
  private normalizeOutput(s: string): string {
    if (s == null || s === '') return '';
    return String(s)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trim();
  }

  async executeCode(dto: ExecuteCodeDto) {
    const { code, language, testCases } = dto;

    if (!code || !code.trim()) {
      throw new BadRequestException('Code cannot be empty');
    }

    if (code.length > this.maxCodeChars) {
      throw new BadRequestException(`Code is too large (max ${this.maxCodeChars} chars)`);
    }

    if (!testCases || testCases.length === 0) {
      throw new BadRequestException('At least one test case is required');
    }

    if (testCases.length > this.maxTestCases) {
      throw new BadRequestException(`Too many test cases (max ${this.maxTestCases})`);
    }

    const lang = language.toLowerCase();
    const version = this.languageVersionMap[lang];
    if (!version) {
      throw new BadRequestException(
        `Unsupported language: ${language}. Supported: ${Object.keys(this.languageVersionMap).join(', ')}`,
      );
    }

    // Detect obvious mismatch: e.g. JavaScript code sent with language=python
    const looksLikeJs = /^\s*(function\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|\w+\s*=>)/m.test(code) || (code.includes('readline()') && code.includes('console.log'));
    const looksLikePython = /^\s*(def\s+\w+|import\s+|from\s+\w+\s+import|class\s+\w+)/m.test(code) || (code.includes('input()') && code.includes('print('));
    if (lang === 'python' && looksLikeJs && !looksLikePython) {
      throw new BadRequestException(
        'The code looks like JavaScript but Python is selected. Please select "JavaScript" in the language selector above the editor.',
      );
    }
    if (lang === 'javascript' && looksLikePython && !looksLikeJs) {
      throw new BadRequestException(
        'The code looks like Python but JavaScript is selected. Please select "Python" in the language selector above the editor.',
      );
    }

    const results: { testCase: number; passed: boolean; output: string; error: string; executionTime: number }[] = [];

    for (const [index, testCase] of testCases.entries()) {
      try {
        const stdin = this.normalizeStdin(testCase.input);
        if (stdin.length > this.maxStdinChars) {
          throw new BadRequestException(
            `Test case ${index + 1} input is too large (max ${this.maxStdinChars} chars)`,
          );
        }

        const payload = {
          language: lang,
          version,
          files: [{ name: this.getPistonFileName(lang), content: code }],
          stdin,
          run_timeout: Math.min(this.requestTimeoutMs, 15000),
        };

        const apiKey = process.env.PISTON_API_KEY?.trim();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        const response = await axios.post(this.pistonEndpoint, payload, {
          timeout: Math.min(Number(this.requestTimeoutMs) || 15000, 20000),
          headers,
          maxBodyLength: 1_000_000,
          maxContentLength: 1_000_000,
          validateStatus: () => true,
        });

        if (response.status === 401 || response.status >= 400) {
          const msg = response.status === 401 ? 'PISTON_401' : (response.data?.message || `Piston API error: ${response.status}`);
          throw new Error(msg);
        }

        const runPayload = response.data?.run ?? {};
        const rawOutput = typeof runPayload.stdout === 'string' ? runPayload.stdout : '';
        const output = this.normalizeOutput(rawOutput);
        const stderrStr = typeof runPayload.stderr === 'string' ? runPayload.stderr : '';
        const error = stderrStr.trim();
        const expected = this.normalizeOutput(String(testCase.expectedOutput ?? ''));
        const passed = output === expected;
        results.push({
          testCase: index + 1,
          passed,
          output,
          error,
          executionTime: Number(runPayload.time) || 0,
        });
      } catch (err: any) {
        const msg = err?.message || '';
        const isPistonUnavailable =
          msg === 'PISTON_401' ||
          msg.includes('Piston API error') ||
          err?.response?.status === 401 ||
          err?.code === 'ECONNREFUSED' ||
          err?.code === 'ETIMEDOUT' ||
          err?.code === 'ENOTFOUND';
        if (isPistonUnavailable) {
          return this.runAllTestCasesLocally(code, lang, testCases);
        }
        this.logger.error(`Execution error for test case ${index + 1}`, msg);
        results.push({
          testCase: index + 1,
          passed: false,
          output: '',
          error: err?.response?.data?.message || msg || 'Execution failed',
          executionTime: 0,
        });
      }
    }

    const totalPassed = results.filter(r => r.passed).length;
    return { results, overall: { passed: totalPassed, total: testCases.length } };
  }

  /** Run all test cases locally (fallback when Piston is unavailable) */
  private async runAllTestCasesLocally(
    code: string,
    language: string,
    testCases: { input: string; expectedOutput: string }[],
  ) {
    const localLang = this.toLocalLanguage(language);
    const results: { testCase: number; passed: boolean; output: string; error: string; executionTime: number }[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const input = this.normalizeStdin(tc.input);
      const res = await this.runLocalSingle(code, localLang, input);
      const expected = this.normalizeOutput(tc.expectedOutput ?? '');
      const actual = this.normalizeOutput(res.output ?? '');
      results.push({
        testCase: i + 1,
        passed: actual === expected,
        output: actual,
        error: res.error ?? '',
        executionTime: res.executionTimeMs ?? 0,
      });
    }
    const totalPassed = results.filter(r => r.passed).length;
    return { results, overall: { passed: totalPassed, total: testCases.length } };
  }

  private async runLocalSingle(code: string, language: string, input: string): Promise<{ output: string; error?: string; executionTimeMs: number }> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-'));
    const start = Date.now();
    try {
      switch (language) {
        case 'javascript': return this.runLocalJavaScript(code, input, tmpDir, start);
        case 'python': return this.runLocalPython(code, input, tmpDir, start);
        case 'java': return this.runLocalJava(code, input, tmpDir, start);
        case 'cpp': return this.runLocalCpp(code, input, tmpDir, start);
        default: return { output: '', error: `Unsupported: ${language}`, executionTimeMs: Date.now() - start };
      }
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }

  private getPythonCommand(): string {
    const win = os.platform() === 'win32';
    if (win) {
      try {
        execSync('python --version', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        return 'python';
      } catch {
        try {
          execSync('py -3 --version', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
          return 'py -3';
        } catch {
          return 'python';
        }
      }
    }
    try {
      execSync('python3 --version', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      return 'python3';
    } catch {
      return 'python';
    }
  }

  private runLocalJavaScript(code: string, input: string, tmpDir: string, start: number): { output: string; error?: string; executionTimeMs: number } {
    const fullCode = `
const INPUT = ${JSON.stringify(input)};
const lines = INPUT.split('\\n');
let lineIndex = 0;
const readline = () => lines[lineIndex++] ?? '';
${code}
`;
    const file = path.join(tmpDir, 'solution.js');
    fs.writeFileSync(file, fullCode, 'utf8');
    try {
      const result = spawnSync('node', [file], {
        encoding: 'utf8',
        timeout: this.localTimeoutMs,
        maxBuffer: this.localMaxBuffer,
        cwd: tmpDir,
        windowsHide: true,
      });
      const stdout = (result.stdout ?? '').trim();
      const stderr = (result.stderr ?? '').trim();
      if (result.status !== 0) {
        return { output: '', error: stderr || `Process exited with code ${result.status}`, executionTimeMs: Date.now() - start };
      }
      return { output: stdout, executionTimeMs: Date.now() - start };
    } catch (err: any) {
      const msg = err.stderr?.toString?.()?.trim() || err.stdout?.toString?.()?.trim() || err.message;
      return { output: '', error: msg || 'Node execution failed', executionTimeMs: Date.now() - start };
    }
  }

  private runLocalPython(code: string, input: string, tmpDir: string, start: number): { output: string; error?: string; executionTimeMs: number } {
    const file = path.join(tmpDir, 'solution.py');
    const normalized = (code || '').trimStart();
    fs.writeFileSync(file, normalized, 'utf8');
    const pythonCmd = this.getPythonCommand();
    const args = pythonCmd === 'py -3' ? ['-3', file] : [file];
    const prog = pythonCmd === 'py -3' ? 'py' : pythonCmd;
    try {
      const result = spawnSync(prog, args, {
        input,
        encoding: 'utf8',
        timeout: this.localTimeoutMs,
        maxBuffer: this.localMaxBuffer,
        cwd: tmpDir,
        windowsHide: true,
      });
      const stdout = (result.stdout || '').trim();
      const stderr = (result.stderr || '').trim();
      if (result.status !== 0) {
        return { output: '', error: stderr || `Process exited with code ${result.status}`, executionTimeMs: Date.now() - start };
      }
      return { output: stdout, executionTimeMs: Date.now() - start };
    } catch (err: any) {
      const msg = err.stderr?.toString?.()?.trim?.() || err.stdout?.toString?.()?.trim?.() || err.message;
      return { output: '', error: msg || 'Python execution failed', executionTimeMs: Date.now() - start };
    }
  }

  private runLocalJava(code: string, input: string, tmpDir: string, start: number): { output: string; error?: string; executionTimeMs: number } {
    const isMain = /\bpublic\s+class\s+Main\b/.test(code);
    const className = isMain ? 'Main' : 'Solution';
    const file = path.join(tmpDir, `${className}.java`);
    fs.writeFileSync(file, code, 'utf8');
    try {
      const compile = spawnSync('javac', [file], {
        encoding: 'utf8',
        timeout: this.localTimeoutMs,
        maxBuffer: this.localMaxBuffer,
        cwd: tmpDir,
        windowsHide: true,
      });
      if (compile.status !== 0) {
        const err = (compile.stderr ?? compile.stdout ?? '').trim() || 'Compilation failed';
        return { output: '', error: err, executionTimeMs: Date.now() - start };
      }
      const run = spawnSync('java', ['-cp', tmpDir, className], {
        input,
        encoding: 'utf8',
        timeout: this.localTimeoutMs,
        maxBuffer: this.localMaxBuffer,
        cwd: tmpDir,
        windowsHide: true,
      });
      const stdout = (run.stdout ?? '').trim();
      const stderr = (run.stderr ?? '').trim();
      if (run.status !== 0) {
        return { output: '', error: stderr || `Process exited with code ${run.status}`, executionTimeMs: Date.now() - start };
      }
      return { output: stdout, executionTimeMs: Date.now() - start };
    } catch (err: any) {
      const msg = err.stderr?.toString?.()?.trim() || err.stdout?.toString?.()?.trim() || err.message;
      return { output: '', error: msg || 'Java execution failed', executionTimeMs: Date.now() - start };
    }
  }

  private runLocalCpp(code: string, input: string, tmpDir: string, start: number): { output: string; error?: string; executionTimeMs: number } {
    const srcFile = path.join(tmpDir, 'solution.cpp');
    const binName = os.platform() === 'win32' ? 'solution.exe' : 'solution';
    const binFile = path.join(tmpDir, binName);
    fs.writeFileSync(srcFile, code, 'utf8');
    try {
      const compile = spawnSync('g++', ['-o', binFile, srcFile], {
        encoding: 'utf8',
        timeout: this.localTimeoutMs,
        maxBuffer: this.localMaxBuffer,
        cwd: tmpDir,
        windowsHide: true,
      });
      if (compile.status !== 0) {
        const err = (compile.stderr ?? compile.stdout ?? '').trim() || 'Compilation failed';
        return { output: '', error: err, executionTimeMs: Date.now() - start };
      }
      const run = spawnSync(binFile, [], {
        input,
        encoding: 'utf8',
        timeout: this.localTimeoutMs,
        maxBuffer: this.localMaxBuffer,
        cwd: tmpDir,
        windowsHide: true,
      });
      const stdout = (run.stdout ?? '').trim();
      const stderr = (run.stderr ?? '').trim();
      if (run.status !== 0) {
        return { output: '', error: stderr || `Process exited with code ${run.status}`, executionTimeMs: Date.now() - start };
      }
      return { output: stdout, executionTimeMs: Date.now() - start };
    } catch (err: any) {
      const msg = err.stderr?.toString?.()?.trim() || err.stdout?.toString?.()?.trim() || err.message;
      return { output: '', error: msg || 'C++ execution failed', executionTimeMs: Date.now() - start };
    }
  }

  async validateSolution(code: string, language: string, testCases: any[]) {
    return this.executeCode({ code, language, testCases });
  }
}
