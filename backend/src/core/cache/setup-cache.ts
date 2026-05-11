import { Injectable } from '@nestjs/common';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

/**
 * Simple in-memory cache service
 * Can be replaced with Redis implementation later
 */
@Injectable()
export class SetupCache {
  private cache = new Map<string, CacheEntry>();

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(
    key: string,
    value: string,
    ttlSeconds: number = 900,
  ): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Clean up expired entries (run periodically)
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
