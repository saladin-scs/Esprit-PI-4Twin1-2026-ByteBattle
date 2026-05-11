import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import type { Response } from 'express';
import { RecommendationService } from '../recommendation/recommendation.service';
import { FeedbackService } from '../feedback/feedback.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly recommendationService: RecommendationService,
    private readonly feedbackService: FeedbackService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness — HTTP API up' })
  live() {
    return {
      status: 'ok',
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      socketIo:
        'Same host as API; connect with Socket.IO client (JWT in auth).',
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness — MongoDB + ML Services' })
  async ready(@Res() res: Response) {
    const mongoOk = this.connection.readyState === 1;

    const [recoHealth, aiHealth] = await Promise.all([
      this.recommendationService.checkHealth(),
      this.feedbackService.checkHealth(),
    ]);

    // System is ready if core (Mongo) is UP.
    // ML services being DOWN causes DEGRADED status but 200 OK (soft failure)
    // or 503 if you want strict readiness.
    // Given the requirement for "graceful degradation", we'll return 200 but status: degraded.
    const isMongoOk = mongoOk;
    const isFullyUp =
      isMongoOk && recoHealth.status !== 'down' && aiHealth.status !== 'down';

    return res.status(isMongoOk ? 200 : 503).json({
      status: isFullyUp ? 'ready' : isMongoOk ? 'degraded' : 'down',
      timestamp: new Date().toISOString(),
      components: {
        mongodb: mongoOk ? 'up' : 'down',
        recommendationService: recoHealth,
        aiCoachService: aiHealth,
      },
    });
  }
}
