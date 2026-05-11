import axios from 'axios';
import { HttpException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AI_SERVICE_URL = 'http://127.0.0.1:8000';
    process.env.AI_SERVICE_TIMEOUT_MS = '3000';
    delete process.env.AI_SERVICE_API_KEY;
    service = new FeedbackService();
  });

  it('maps successful upstream payload into normalized response', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        overall_score: 122,
        summary: 'Great direction.',
        points: [
          {
            title: 'Edge cases',
            description: 'Add null checks.',
            category: 'improvement',
            severity: 'medium',
          },
        ],
      },
    } as any);

    const out = await service.getFeedback({ code: 'print(1)', language: 'python' }, 'user-1');
    expect(out.overall_score).toBe(100);
    expect(out.summary).toContain('Great direction');
    expect(out.points).toHaveLength(1);
  });

  it('returns deterministic fallback on upstream timeout', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('timeout exceeded'));
    const out = await service.getFeedback(
      { code: 'print(1)', language: 'python', tests_passed: true, runtime_ms: 120 },
      'user-2',
    );
    expect(out.extra?.fallback).toBe(true);
    expect(out.overall_score).toBeGreaterThan(0);
    expect(out.summary.toLowerCase()).toContain('fallback');
  });

  it('throws too many requests when per-user limit is exceeded', async () => {
    const userId = 'rate-limit-user';
    mockedAxios.post.mockResolvedValue({
      status: 200,
      data: {
        overall_score: 50,
        summary: 'ok',
        points: [{ title: 'a', description: 'b', category: 'improvement', severity: 'low' }],
      },
    } as any);

    for (let i = 0; i < 40; i++) {
      await service.getFeedback({ code: `print(${i})`, language: 'python' }, userId);
    }

    await expect(service.getFeedback({ code: 'print(41)', language: 'python' }, userId)).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it('handles malformed upstream payload by injecting safe defaults', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        overall_score: 'nan',
        summary: '',
        points: [{ foo: 'bar' }],
      },
    } as any);

    const out = await service.getFeedback({ code: 'print(1)', language: 'python' }, 'user-3');
    expect(out.overall_score).toBe(0);
    expect(out.points.length).toBeGreaterThan(0);
    expect(out.summary.length).toBeGreaterThan(0);
  });
});

