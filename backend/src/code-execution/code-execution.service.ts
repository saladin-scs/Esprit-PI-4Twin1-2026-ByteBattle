/* eslint-disable prettier/prettier */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ExecuteCodeDto } from './dto/execute-code.dto';
import axios from 'axios';
import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/** One row from GET …/api/v2/runtimes (Piston public API). */
interface PistonRuntimeEntry {
  language: string;
  version: string;
  aliases?: string[];
  runtime?: string;
}

@Injectable()
export class CodeExecutionService {
  private readonly logger = new Logger(CodeExecutionService.name);

  /** Default: local Docker Piston (scripts/start-piston.ps1). Production: set PISTON_ENDPOINT (e.g. emkc + key if authorized). */
  private readonly pistonEndpoint =
    (process.env.PISTON_ENDPOINT || '').trim() || 'http://127.0.0.1:2000/api/v2/execute';

  private readonly requestTimeoutMs = Number(process.env.CODE_EXECUTION_TIMEOUT_MS || 15000);
  private readonly maxTestCases = Number(process.env.CODE_EXECUTION_MAX_TESTCASES || 20);
  private readonly maxCodeChars = Number(process.env.CODE_EXECUTION_MAX_CODE_CHARS || 20000);
  private readonly maxStdinChars = Number(process.env.CODE_EXECUTION_MAX_STDIN_CHARS || 5000);
  private readonly localTimeoutMs = 5000;
  private readonly localMaxBuffer = 4 * 1024 * 1024; // 4MB stdout/stderr cap per run

  // Fallback versions when GET …/runtimes is unreachable (align with your Piston instance)
  private languageVersionMap: Record<string, string> = {
    python: '3.10.0',
    javascript: '18.15.0',
    'c++': '10.2.0',
    c: '10.2.0',
    java: '15.0.2',
  };

  private runtimeCache: { base: string; at: number; list: PistonRuntimeEntry[] } | null = null;
  private readonly runtimeCacheTtlMs = 60 * 60 * 1000;

  /** GET /runtimes — public emkc has multiple "javascript" entries (Deno vs Node). */
  private getPistonApiBase(): string {
    const ep = (this.pistonEndpoint || '').trim().replace(/\/$/, '');
    if (ep.endsWith('/execute')) return ep.slice(0, -'/execute'.length);
    return ep;
  }

  private async fetchPistonRuntimesList(): Promise<PistonRuntimeEntry[] | null> {
    const base = this.getPistonApiBase();
    if (!base) return null;
    const now = Date.now();
    if (
      this.runtimeCache &&
      this.runtimeCache.base === base &&
      now - this.runtimeCache.at < this.runtimeCacheTtlMs
    ) {
      return this.runtimeCache.list;
    }
    try {
      const url = `${base}/runtimes`;
      const res = await axios.get<PistonRuntimeEntry[]>(url, {
        timeout: 8000,
        validateStatus: (s) => s === 200,
      });
      if (!Array.isArray(res.data) || res.data.length === 0) return null;
      this.runtimeCache = { base, at: now, list: res.data };
      return res.data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Piston runtimes fetch failed (${msg}) — using static languageVersionMap`);
      return null;
    }
  }

  private pickVersionFromRuntimes(lang: string, runtimes: PistonRuntimeEntry[]): string | null {
    const langNorm = lang.toLowerCase();
    const candidates = runtimes.filter((r) => {
      if (r.language.toLowerCase() === langNorm) return true;
      return (r.aliases || []).some((a) => a.toLowerCase() === langNorm);
    });
    if (!candidates.length) return null;
    const fallback = this.languageVersionMap[lang];

    if (langNorm === 'javascript') {
      const node = candidates.find((c) => c.runtime === 'node');
      if (node) return node.version;
      const byFallback = fallback ? candidates.find((c) => c.version === fallback) : undefined;
      if (byFallback) return byFallback.version;
      const v18 = candidates.find((c) => String(c.version).startsWith('18.'));
      if (v18) return v18.version;
    }
    if (langNorm === 'c++' || langNorm === 'c') {
      const gcc = candidates.find((c) => c.runtime === 'gcc' && c.language.toLowerCase() === langNorm);
      if (gcc) return gcc.version;
    }
    if (fallback) {
      const exact = candidates.find((c) => c.version === fallback);
      if (exact) return exact.version;
    }
    return candidates[0].version;
  }

  private async resolvePistonVersionForLanguage(lang: string): Promise<string> {
    const fallback = this.languageVersionMap[lang];
    const list = await this.fetchPistonRuntimesList();
    if (!list) return fallback;
    const picked = this.pickVersionFromRuntimes(lang, list);
    if (picked) {
      this.logger.debug(`Piston ${lang} → version ${picked} @ ${this.getPistonApiBase()}`);
      return picked;
    }
    return fallback;
  }

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

  /** Normalize Java entry class for Piston (file is Main.java). */
  private wrapJavaForPiston(userCode: string): string {
    const src = String(userCode || '');
    if (/\bpublic\s+class\s+Main\b/.test(src)) return src;
    if (/\bpublic\s+class\s+Solution\b/.test(src)) {
      return src.replace(/\bpublic\s+class\s+Solution\b/, 'public class Main');
    }
    return src;
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

  /** Run on server (Node / Python) first - matches judge0-style stdin; avoids Piston limits & readline gaps. */
  private shouldRunLocallyFirst(lang: string): boolean {
    if (lang === 'javascript') return true;
    if (lang !== 'python') return false;
    return this.getPythonExecutablePath() != null;
  }

  /**
   * Default: Piston first (local Docker or PISTON_ENDPOINT).
   * CODE_EXECUTION_PREFER_LOCAL=true -> Node / Python on machine when available ("judge0-like" dev behavior).
   * CODE_EXECUTION_PREFER_PISTON=true -> force Piston. false -> force local logic whenever possible (legacy).
   */
  private useLocalRunnerFirst(lang: string): boolean {
    if (process.env.CODE_EXECUTION_PREFER_PISTON === 'true') return false;
    if (process.env.CODE_EXECUTION_PREFER_PISTON === 'false') return this.shouldRunLocallyFirst(lang);
    if (process.env.CODE_EXECUTION_PREFER_LOCAL === 'true') return this.shouldRunLocallyFirst(lang);
    return false;
  }

  private canRunLanguageLocally(lang: string): boolean {
    const l = this.toLocalLanguage(lang);
    if (l === 'javascript') {
      const r = spawnSync('node', ['--version'], { encoding: 'utf8', timeout: 4000, windowsHide: true });
      return r.status === 0 && !!(r.stdout || '').trim();
    }
    if (l === 'python') return this.getPythonExecutablePath() != null;
    if (l === 'java') {
      const r = spawnSync('javac', ['-version'], { encoding: 'utf8', timeout: 6000, windowsHide: true });
      return r.status === 0;
    }
    if (l === 'cpp') {
      const r = spawnSync('g++', ['--version'], { encoding: 'utf8', timeout: 6000, windowsHide: true });
      return r.status === 0;
    }
    return false;
  }

  private allTestsFailed(
    testCases: { input: string; expectedOutput: string }[],
    error: string,
  ): { results: { testCase: number; passed: boolean; output: string; error: string; executionTime: number }[]; overall: { passed: number; total: number } } {
    const err = String(error || 'Execution failed').slice(0, 800);
    const results = testCases.map((_, i) => ({
      testCase: i + 1,
      passed: false,
      output: '',
      error: err,
      executionTime: 0,
    }));
    return { results, overall: { passed: 0, total: testCases.length } };
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
    if (!this.languageVersionMap[lang]) {
      throw new BadRequestException(
        `Unsupported language: ${language}. Supported: ${Object.keys(this.languageVersionMap).join(', ')}`,
      );
    }

    const pistonVersion = await this.resolvePistonVersionForLanguage(lang);

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

    if (this.useLocalRunnerFirst(lang)) {
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
          lang === 'javascript'
            ? this.wrapJavaScriptForPiston(code)
            : lang === 'java'
              ? this.wrapJavaForPiston(code)
              : code;
        const payload = {
          language: lang,
          version: pistonVersion,
          files: [{ name: this.getPistonFileName(lang), content: codeForPiston }],
          stdin,
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
          const bodyMsg =
            response.status === 401
              ? 'Piston API returned 401. Set PISTON_API_KEY if your host requires a Bearer token.'
              : typeof response.data?.message === 'string'
                ? response.data.message
                : `Piston API error: ${response.status}`;
          const e = new Error(bodyMsg) as Error & { pistonHttpStatus?: number };
          e.pistonHttpStatus = response.status;
          throw e;
        }
        const compileCode = response.data?.compile?.code;
        const compileErr = response.data?.compile?.stderr || response.data?.compile?.output;
        if (compileCode !== undefined && compileCode !== null && compileCode !== 0) {
          throw new Error(`PISTON_COMPILE: ${String(compileErr).slice(0, 200)}`);
        }

        const runPayload = response.data?.run ?? {};
        const rawOutput =
          typeof runPayload.stdout === 'string'
            ? runPayload.stdout
            : typeof runPayload.output === 'string'
              ? runPayload.output
              : '';
        const stderrStr = typeof runPayload.stderr === 'string' ? runPayload.stderr : '';
        const exitCode = runPayload.code;
        const signal = runPayload.signal;
        const hasBadExit = exitCode !== null && exitCode !== undefined && exitCode !== 0;
        const hasSignal = signal != null && signal !== '';

        if (hasBadExit || hasSignal) {
          const output = this.normalizeOutput(rawOutput);
          const errMsg = hasSignal
            ? (stderrStr.trim() || `Terminated: ${signal}`)
            : stderrStr.trim() || `Process exited with code ${exitCode}`;
          results.push({
            testCase: index + 1,
            passed: false,
            output,
            error: errMsg,
            executionTime: Number(runPayload.time) || 0,
          });
          continue;
        }

        const output = this.normalizeOutput(rawOutput);
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
        if (err instanceof BadRequestException) throw err;
        const msg = err?.message || '';
        const pistonHttp = err?.pistonHttpStatus as number | undefined;
        if (pistonHttp === 401 || pistonHttp === 403 || pistonHttp === 429) {
          this.logger.warn(`Piston HTTP ${pistonHttp}: ${msg.slice(0, 200)}`);
          if (this.canRunLanguageLocally(lang)) {
            return this.runAllTestCasesLocally(code, lang, testCases);
          }
          return this.allTestsFailed(testCases, msg);
        }
        const isPistonUnavailable =
          msg.startsWith('PISTON_COMPILE') ||
          msg.includes('Piston API error') ||
          err?.response?.status === 401 ||
          err?.response?.status === 429 ||
          (err?.response?.status >= 500 && err?.response?.status < 600) ||
          err?.code === 'ECONNREFUSED' ||
          err?.code === 'ETIMEDOUT' ||
          err?.code === 'ECONNABORTED' ||
          err?.code === 'ENOTFOUND';
        if (isPistonUnavailable) {
          if (this.canRunLanguageLocally(lang)) {
            return this.runAllTestCasesLocally(code, lang, testCases);
          }
          if (msg.startsWith('PISTON_COMPILE')) {
            return this.allTestsFailed(testCases, msg);
          }
          const hint =
            `Piston unavailable (${msg.slice(0, 240)}). ` +
            `Start an executor: from repository root run .\\scripts\\start-piston.ps1 (Docker), ` +
            `then install runtimes (piston CLI: ppman install node python java gcc). ` +
            `Check PISTON_ENDPOINT in backend/.env (default http://127.0.0.1:2000/api/v2/execute). ` +
            `The public emkc.org API has been allowlist-only since 2026 - use a self-hosted instance or API key.`;
          return this.allTestsFailed(testCases, hint);
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
        error:
          'Python not found locally. Use Piston (Docker): run scripts/start-piston.ps1, set PISTON_ENDPOINT=http://127.0.0.1:2000/api/v2/execute, or install Python 3 on the server.',
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
