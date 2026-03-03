/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ExecutionResult {
  output: string;
  error?: string;
  executionTimeMs: number;
}

@Injectable()
export class CodeExecutorService {
  private readonly logger = new Logger(CodeExecutorService.name);
  private readonly TIMEOUT_MS = 5000; // 5 secondes max

  async execute(code: string, language: string, input: string): Promise<ExecutionResult> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-'));
    const start = Date.now();

    try {
      switch (language) {
        case 'javascript': return await this.runJavaScript(code, input, tmpDir, start);
        case 'python':     return await this.runPython(code, input, tmpDir, start);
        case 'java':       return await this.runJava(code, input, tmpDir, start);
        case 'cpp':        return await this.runCpp(code, input, tmpDir, start);
        default:           return { output: '', error: `Langage non supporté: ${language}`, executionTimeMs: 0 };
      }
    } catch (err: any) {
      return { output: '', error: err.message || 'Erreur inconnue', executionTimeMs: Date.now() - start };
    } finally {
      // Nettoyage du dossier temporaire
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }

  private runJavaScript(code: string, input: string, tmpDir: string, start: number): ExecutionResult {
    // On injecte l'input comme variable globale accessible dans le code
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
      const output = execSync(`node "${file}"`, { timeout: this.TIMEOUT_MS, encoding: 'utf8' });
      return { output: output.trim(), executionTimeMs: Date.now() - start };
    } catch (err: any) {
      return { output: '', error: err.stderr?.toString()?.trim() || err.message, executionTimeMs: Date.now() - start };
    }
  }

  private runPython(code: string, input: string, tmpDir: string, start: number): ExecutionResult {
    const file = path.join(tmpDir, 'solution.py');
    fs.writeFileSync(file, code);
    try {
      const output = execSync(`echo ${JSON.stringify(input)} | python3 "${file}"`, { timeout: this.TIMEOUT_MS, encoding: 'utf8' });
      return { output: output.trim(), executionTimeMs: Date.now() - start };
    } catch (err: any) {
      return { output: '', error: err.stderr?.toString()?.trim() || err.message, executionTimeMs: Date.now() - start };
    }
  }

  private runJava(code: string, input: string, tmpDir: string, start: number): ExecutionResult {
    const file = path.join(tmpDir, 'Solution.java');
    fs.writeFileSync(file, code);
    try {
      execSync(`javac "${file}"`, { timeout: this.TIMEOUT_MS, encoding: 'utf8', cwd: tmpDir });
      const output = execSync(`echo ${JSON.stringify(input)} | java -cp "${tmpDir}" Solution`, { timeout: this.TIMEOUT_MS, encoding: 'utf8' });
      return { output: output.trim(), executionTimeMs: Date.now() - start };
    } catch (err: any) {
      return { output: '', error: err.stderr?.toString()?.trim() || err.message, executionTimeMs: Date.now() - start };
    }
  }

  private runCpp(code: string, input: string, tmpDir: string, start: number): ExecutionResult {
    const srcFile = path.join(tmpDir, 'solution.cpp');
    const binFile = path.join(tmpDir, 'solution');
    fs.writeFileSync(srcFile, code);
    try {
      execSync(`g++ -o "${binFile}" "${srcFile}"`, { timeout: this.TIMEOUT_MS, encoding: 'utf8' });
      const output = execSync(`echo ${JSON.stringify(input)} | "${binFile}"`, { timeout: this.TIMEOUT_MS, encoding: 'utf8' });
      return { output: output.trim(), executionTimeMs: Date.now() - start };
    } catch (err: any) {
      return { output: '', error: err.stderr?.toString()?.trim() || err.message, executionTimeMs: Date.now() - start };
    }
  }
}