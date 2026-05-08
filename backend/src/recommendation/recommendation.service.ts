/* eslint-disable prettier/prettier */
import { Injectable, Logger, ServiceUnavailableException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RecommendationItem } from './dto/recommendation.dto';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly apiKey?: string;

  // In-memory cache for high-performance recommendations (<200ms)
  private cache = new Map<string, { data: RecommendationItem[]; expiry: number }>();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('ML_SERVICE_URL');
    if (!this.baseUrl) {
      throw new Error('ML_SERVICE_URL is required for RecommendationService');
    }

    this.timeoutMs = Number(this.configService.get<number>('ML_SERVICE_TIMEOUT_MS') ?? 8000);
    this.apiKey = this.configService.get<string>('ML_SERVICE_API_KEY');
  }

  async getRecommendations(userId: string, limit = 8): Promise<RecommendationItem[]> {
    const cacheKey = `${userId}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const url = `${this.baseUrl.replace(/\/+$/, '')}/recommend`;
    const headers = this.apiKey ? { 'x-api-key': this.apiKey } : undefined;

    try {
      const response = await lastValueFrom(
        this.httpService
          .post<{ challenges: RecommendationItem[] }>(url, { userId, limit }, { headers, timeout: this.timeoutMs })
          .pipe(
            map((res) => res.data),
            catchError((error) => {
              this.logger.error('ML recommendation request failed', error?.message || error);
              // Graceful degradation: return empty or fallback if service is down
              return [];
            }),
          ),
      );

      const items = Array.isArray(response?.challenges) ? response.challenges : [];
      
      // Update cache
      if (items.length > 0) {
        this.cache.set(cacheKey, {
          data: items,
          expiry: Date.now() + this.CACHE_TTL_MS,
        });
      }

      return items;
    } catch (error) {
      this.logger.error('Recommendation service call failed', error);
      return []; // Return empty list for graceful degradation
    }
  }

  clearCache(userId?: string) {
    if (userId) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
