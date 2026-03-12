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

  // Piston runtime versions (also used to validate supported languages)
  private languageVersionMap: Record<string, string> = {
    python: '3.10.0',
    javascript: '18.15.0',
    'c++': '10.2.0',
    c: '10.2.0',
    java: '15.0.2',
  };

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
          files: [{ name: 'main', content: code }],
          stdin,
        };

        const apiKey = process.env.PISTON_API_KEY;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        const response = await axios.post(this.pistonEndpoint, payload, {
          timeout: Number.isFinite(this.requestTimeoutMs) ? this.requestTimeoutMs : 15000,
          headers,
          maxBodyLength: 1_000_000,
          maxContentLength: 1_000_000,
          validateStatus: () => true,
        });

        if (response.status === 401 || response.status >= 400) {
          const msg = response.status === 401 ? 'PISTON_401' : (response.data?.message || `Piston API error: ${response.status}`);
          throw new Error(msg);
        }

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
        const msg = err?.message || '';
        const isPistonUnavailable = msg === 'PISTON_401' || msg.includes('Piston API error') || err?.response?.status === 401;
        if (isPistonUnavailable) {
          this.logger.warn('Piston unavailable, falling back to local execution.');
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
      const expected = (tc.expectedOutput ?? '').trim();
      const actual = (res.output ?? '').trim();
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
const lines = INPUT.split('\\n').filter(Boolean);
let lineIndex = 0;
const readline = () => lines[lineIndex++] || '';
${code}
`;
    const file = path.join(tmpDir, 'solution.js');
    fs.writeFileSync(file, fullCode);
    try {
      const output = execSync(`node "${file}"`, { timeout: this.localTimeoutMs, encoding: 'utf8' });
      return { output: output.trim(), executionTimeMs: Date.now() - start };
    } catch (err: any) {
      return { output: '', error: err.stderr?.toString()?.trim() || err.message, executionTimeMs: Date.now() - start };
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
        cwd: tmpDir,
        windowsHide: true,
      });
      const stdout = (result.stdout || '').trim();
      const stderr = (result.stderr || '').trim();
      if (result.status !== 0 && !stdout && stderr) {
        return { output: '', error: stderr, executionTimeMs: Date.now() - start };
      }
      return { output: stdout, executionTimeMs: Date.now() - start };
    } catch (err: any) {
      const msg = err.stderr?.toString?.()?.trim?.() || err.stdout?.toString?.()?.trim?.() || err.message;
      return { output: '', error: msg, executionTimeMs: Date.now() - start };
    }
  }

  private runLocalJava(code: string, input: string, tmpDir: string, start: number): { output: string; error?: string; executionTimeMs: number } {
    const file = path.join(tmpDir, 'Solution.java');
    fs.writeFileSync(file, code);
    try {
      execSync(`javac "${file}"`, { timeout: this.localTimeoutMs, encoding: 'utf8', cwd: tmpDir });
      const output = execSync(`echo ${JSON.stringify(input)} | java -cp "${tmpDir}" Solution`, { timeout: this.localTimeoutMs, encoding: 'utf8' });
      return { output: output.trim(), executionTimeMs: Date.now() - start };
    } catch (err: any) {
      return { output: '', error: err.stderr?.toString()?.trim() || err.message, executionTimeMs: Date.now() - start };
    }
  }

  private runLocalCpp(code: string, input: string, tmpDir: string, start: number): { output: string; error?: string; executionTimeMs: number } {
    const srcFile = path.join(tmpDir, 'solution.cpp');
    const binFile = path.join(tmpDir, 'solution');
    fs.writeFileSync(srcFile, code);
    try {
      execSync(`g++ -o "${binFile}" "${srcFile}"`, { timeout: this.localTimeoutMs, encoding: 'utf8' });
      const output = execSync(`echo ${JSON.stringify(input)} | "${binFile}"`, { timeout: this.localTimeoutMs, encoding: 'utf8' });
      return { output: output.trim(), executionTimeMs: Date.now() - start };
    } catch (err: any) {
      return { output: '', error: err.stderr?.toString()?.trim() || err.message, executionTimeMs: Date.now() - start };
    }
  }

  async validateSolution(code: string, language: string, testCases: any[]) {
    return this.executeCode({ code, language, testCases });
  }
}
