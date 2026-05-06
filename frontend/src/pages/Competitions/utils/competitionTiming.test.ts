import { getCompetitionTimeHint } from './competitionTiming';

describe('getCompetitionTimeHint', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a start hint for upcoming competitions', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));

    expect(
      getCompetitionTimeHint(
        '2026-01-01T12:00:00Z',
        '2026-01-01T14:00:00Z',
        'scheduled',
      ),
    ).toBe('Starts in 2 h');
  });

  it('returns an end hint for active competitions', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));

    expect(
      getCompetitionTimeHint(
        '2026-01-01T09:00:00Z',
        '2026-01-01T10:30:00Z',
        'active',
      ),
    ).toBe('Ends in 30 min');
  });

  it('returns null for invalid dates', () => {
    expect(getCompetitionTimeHint('bad-date', '2026-01-01T10:30:00Z', 'active')).toBeNull();
  });

  it('returns null for closed competitions', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));

    expect(
      getCompetitionTimeHint(
        '2026-01-01T09:00:00Z',
        '2026-01-01T10:30:00Z',
        'closed',
      ),
    ).toBeNull();
  });
});
