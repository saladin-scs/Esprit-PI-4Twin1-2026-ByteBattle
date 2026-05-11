import { ChallengeController } from './challenges.controller';

describe('ChallengeController', () => {
  const challengeService = {
    findAll: jest.fn(),
    run: jest.fn(),
    submit: jest.fn(),
    getSolutions: jest.fn(),
    createSolution: jest.fn(),
    upvoteSolution: jest.fn(),
    getStats: jest.fn(),
  };

  const controller = new ChallengeController(challengeService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates list queries to the service', async () => {
    challengeService.findAll.mockResolvedValue({ items: ['challenge-1'] });

    await expect(controller.findAll({ page: 2, limit: 6 } as any)).resolves.toEqual({ items: ['challenge-1'] });
    expect(challengeService.findAll).toHaveBeenCalledWith({ page: 2, limit: 6 });
  });

  it('delegates run and submit actions with user context', async () => {
    challengeService.run.mockResolvedValue({ passed: 3 });
    challengeService.submit.mockResolvedValue({ submitted: true });

    await expect(controller.run('challenge-1', { code: 'print(1)' } as any)).resolves.toEqual({ passed: 3 });
    await expect(
      controller.submit('challenge-1', { code: 'print(1)' } as any, { user: { userId: 'user-1' } } as any),
    ).resolves.toEqual({ submitted: true });

    expect(challengeService.run).toHaveBeenCalledWith('challenge-1', { code: 'print(1)' });
    expect(challengeService.submit).toHaveBeenCalledWith('challenge-1', 'user-1', { code: 'print(1)' });
  });

  it('delegates community solution endpoints', async () => {
    challengeService.getSolutions.mockResolvedValue({ data: [] });
    challengeService.createSolution.mockResolvedValue({ created: true });
    challengeService.upvoteSolution.mockResolvedValue({ upvoted: true });

    await expect(controller.getSolutions('challenge-1', 1, 10)).resolves.toEqual({ data: [] });
    await expect(
      controller.createSolution('challenge-1', { code: 'print(1)' } as any, { user: { userId: 'user-1' } } as any),
    ).resolves.toEqual({ created: true });
    await expect(
      controller.upvoteSolution('solution-1', { user: { userId: 'user-1' } } as any),
    ).resolves.toEqual({ upvoted: true });

    expect(challengeService.getSolutions).toHaveBeenCalledWith('challenge-1', 1, 10);
    expect(challengeService.createSolution).toHaveBeenCalledWith('user-1', 'challenge-1', { code: 'print(1)' });
    expect(challengeService.upvoteSolution).toHaveBeenCalledWith('user-1', 'solution-1');
  });

  it('delegates stats endpoint to the service', async () => {
    challengeService.getStats.mockResolvedValue({ total: 12 });

    await expect(controller.getStats('challenge-1')).resolves.toEqual({ total: 12 });
    expect(challengeService.getStats).toHaveBeenCalledWith('challenge-1');
  });
});