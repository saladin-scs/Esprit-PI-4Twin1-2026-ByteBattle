import { Injectable } from '@nestjs/common';

@Injectable()
export class SiteRatingsService {
  private readonly byUser = new Map<string, number>();

  async getStats() {
    const values = [...this.byUser.values()];
    const count = values.length;
    const average = count ? values.reduce((a, b) => a + b, 0) / count : 0;
    return { average, count, maxStars: 5 };
  }

  async getMine(userId: string) {
    return { stars: this.byUser.get(userId) ?? null };
  }

  async setRating(userId: string, stars: number) {
    this.byUser.set(userId, stars);
    return { ok: true as const, stars };
  }
}
