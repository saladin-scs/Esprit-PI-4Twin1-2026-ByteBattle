import { ChallengeService } from './challenges.service';

describe('ChallengeService', () => {
  let service: ChallengeService;

  beforeEach(() => {
    service = new ChallengeService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('returns no accepted starter code when there are no test cases', () => {
    expect(service.buildAcceptedStarterCodeFromTests(undefined)).toEqual({});
    expect(service.buildAcceptedStarterCodeFromTests([])).toEqual({});
    expect(service.buildAcceptedStarterCodeFromTests([{ input: '', expectedOutput: '' }])).toEqual({});
  });

  it('builds executable accepted starter code for all supported languages', () => {
    const generated = service.buildAcceptedStarterCodeFromTests([
      {
        input: 'line1\nline2',
        expectedOutput: 'result "ok"\\done',
      },
      {
        input: '  spaced input  ',
        expectedOutput: 'trimmed output',
      },
    ]);

    expect(generated.python).toContain("CASE_MAP = {");
    expect(generated.python).toContain('"line1\\nline2": "result \\\"ok\\\"\\\\done"');
    expect(generated.python).toContain('out = CASE_MAP.get(raw)');

    expect(generated.javascript).toContain('const CASE_MAP = {');
    expect(generated.javascript).toContain('"line1\\nline2": "result \\\"ok\\\"\\\\done"');
    expect(generated.javascript).toContain("process.stdout.write(out);");

    expect(generated.java).toContain('Map<String, String> map = new HashMap<>();');
    expect(generated.java).toContain('map.put("line1\\nline2", "result \\\"ok\\\"\\\\done");');
    expect(generated.java).toContain('System.out.print(out);');

    expect(generated.cpp).toContain('unordered_map<string, string> m = {');
    expect(generated.cpp).toContain('{"line1\\nline2", "result \\\"ok\\\"\\\\done"}');
    expect(generated.cpp).toContain('cout << it->second;');
  });

  it('normalizes c++ keys to cpp while preserving other language keys', () => {
    expect(
      service.normalizeLangKeys({
        'C++': 'cpp code',
        python: 'py code',
        JavaScript: 'js code',
      }),
    ).toEqual({
      cpp: 'cpp code',
      python: 'py code',
      JavaScript: 'js code',
    });
  });
});