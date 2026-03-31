import { Injectable } from '@nestjs/common';

@Injectable()
export class ExploreService {
  async search(query: string, limit = 8) {
    const q = String(query || '').trim();
    const lim = Math.max(1, Math.min(50, Number(limit) || 8));

    return {
      query: q,
      limit: lim,
      challenges: [] as unknown[],
      competitions: [] as unknown[],
      users: [] as unknown[],
    };
  }
}
