import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import type { Response } from 'express';
import { Res } from '@nestjs/common';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOperation({ summary: 'Liveness — HTTP API up' })
  live() {
    return {
      status: 'ok',
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      socketIo: 'Same host as API; connect with Socket.IO client (JWT in auth).',
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness — MongoDB connected' })
  ready(@Res() res: Response) {
    const mongoOk = this.connection.readyState === 1;
    return res.status(mongoOk ? 200 : 503).json({
      status: mongoOk ? 'ready' : 'degraded',
      mongodb: mongoOk ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
}
