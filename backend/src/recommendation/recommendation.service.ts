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

  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('ML_SERVICE_URL');
    if (!this.baseUrl) {
      throw new Error('ML_SERVICE_URL is required for RecommendationService');
    }

    this.timeoutMs = Number(this.configService.get<number>('ML_SERVICE_TIMEOUT_MS') ?? 8000);
    this.apiKey = this.configService.get<string>('ML_SERVICE_API_KEY');
  }

  async getRecommendations(userId: string, limit = 8): Promise<RecommendationItem[]> {
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
              throw new ServiceUnavailableException('Recommendation service unavailable');
            }),
          ),
      );

      if (!response || !Array.isArray(response.challenges)) {
        throw new InternalServerErrorException('Invalid response from recommendation service');
      }

      return response.challenges;
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error('Recommendation service call failed', error);
      throw new ServiceUnavailableException('Recommendation service request failed');
    }
  }
}
