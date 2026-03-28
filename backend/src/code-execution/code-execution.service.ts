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
  /** Piston runs plain Node — inject readline() from stdin (same idea as local runner). */
  private wrapJavaScriptForPiston(userCode: string): string {
    const prelude = [
      "const fs=require('fs');",
      "const _bbStdin=(()=>{try{return fs.readFileSync(0,'utf8');}catch(e){return'';}})();",
      "const _bbLines=_bbStdin.replace(/\\r\\n/g,'\\n').split('\\n');",
      'let _bbI=0;',
      "const readline=()=>_bbLines[_bbI++]??'';",
    ].join('');
    return `${prelude}\n${userCode}`;
  }

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

  /** Run on server (Node / Python) first — matches judge0-style stdin; avoids Piston limits & readline gaps. */
  private shouldRunLocallyFirst(lang: string): boolean {
    if (lang === 'javascript') return true;
    if (lang !== 'python') return false;
    return this.getPythonExecutablePath() != null;
  }

  /**
   * Judges often send stdin without a final \\n. `sys.stdin.readline()` then waits for a newline
   * or EOF; with an open pipe that can hang or fail. Always end stdin with \\n when non-empty.
   */
  private finalizeStdinForExecution(stdin: string): string {
    const s = String(stdin ?? '');
    if (!s.length) return s;
    return s.endsWith('\n') ? s : `${s}\n`;
  }

  /**
   * Keep newlines intact for multi-line stdin (e.g. "n" then array line).
   * Only normalize single-line numeric-ish input: "2, 3" → "2 3".
   */
  private normalizeStdin(input: string): string {
    const raw = String(input ?? '');
    const s = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!s.trim()) return '';
    if (s.includes('\n')) {
      return s.replace(/\s+$/m, '').split('\n').map((l) => l.trimEnd()).join('\n');
    }
    const line = s.trim();
    if (/^[\d\s,.+-eE]+$/.test(line)) {
      return line.replace(/\s*,\s*/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return line;
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
    const looksLikePython =
      /^\s*(def\s+\w+|import\s+|from\s+\w+\s+import|class\s+\w+)/m.test(code) ||
      (code.includes('input()') && code.includes('print(')) ||
      (/\bstdin\b/.test(code) && /\bprint\s*\(/.test(code));
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

    const preferLocal =
      process.env.CODE_EXECUTION_PREFER_PISTON === 'true'
        ? false
        : this.shouldRunLocallyFirst(lang);

    if (preferLocal) {
      return this.runAllTestCasesLocally(code, lang, testCases);
    }

    for (const [index, testCase] of testCases.entries()) {
      try {
        let stdin = this.normalizeStdin(testCase.input);
        stdin = this.finalizeStdinForExecution(stdin);
        if (stdin.length > this.maxStdinChars) {
          throw new BadRequestException(
            `Test case ${index + 1} input is too large (max ${this.maxStdinChars} chars)`,
          );
        }

        const codeForPiston =
          lang === 'javascript' ? this.wrapJavaScriptForPiston(code) : code;
        const payload = {
          language: lang,
          version,
          files: [{ name: this.getPistonFileName(lang), content: codeForPiston }],
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
        const compileErr = response.data?.compile?.stderr || response.data?.compile?.output;
        if (compileErr && String(compileErr).trim()) {
          throw new Error(`PISTON_COMPILE: ${String(compileErr).slice(0, 200)}`);
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
          msg.startsWith('PISTON_COMPILE') ||
          msg.includes('Piston API error') ||
          err?.response?.status === 401 ||
          err?.response?.status === 429 ||
          (err?.response?.status >= 500 && err?.response?.status < 600) ||
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
      const input = this.finalizeStdinForExecution(this.normalizeStdin(tc.input));
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

  /**
   * Full path to python.exe — avoids spawnSync ENOENT when `py` is not on PATH for child processes.
   */
  private getPythonExecutablePath(): string | null {
    const win = os.platform() === 'win32';
    const probes = win
      ? ['py -3 -c "import sys; print(sys.executable)"', 'python -c "import sys; print(sys.executable)"']
      : ['python3 -c "import sys; print(sys.executable)"', 'python -c "import sys; print(sys.executable)"'];
    for (const cmd of probes) {
      try {
        const out = execSync(cmd, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
          maxBuffer: 8192,
          ...(win ? { shell: process.env.ComSpec || 'cmd.exe' } : {}),
          windowsHide: true,
        }).trim();
        const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const p = lines[lines.length - 1];
        if (p && fs.existsSync(p)) return p;
      } catch {
        /* try next */
      }
    }
    return null;
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
    const pythonExe = this.getPythonExecutablePath();
    if (!pythonExe) {
      return {
        output: '',
        error: 'Python not found. Install Python 3 or set CODE_EXECUTION_PREFER_PISTON=true in .env',
        executionTimeMs: Date.now() - start,
      };
    }
    try {
      const result = spawnSync(pythonExe, ['-u', file], {
        input,
        encoding: 'utf8',
        timeout: this.localTimeoutMs,
        maxBuffer: this.localMaxBuffer,
        cwd: tmpDir,
        windowsHide: true,
      });
      const stdout = (result.stdout || '').trim();
      const stderr = (result.stderr || '').trim();
      if (result.error) {
        return { output: '', error: stderr || result.error.message || 'Python not found (install Python 3)', executionTimeMs: Date.now() - start };
      }
      if (result.status === 0 || (result.status === null && stdout.length > 0 && !stderr)) {
        return { output: stdout, executionTimeMs: Date.now() - start };
      }
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
