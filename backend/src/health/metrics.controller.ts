import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { prometheusRegistry } from './prometheus';

@ApiExcludeController()
@Controller()
export class MetricsController {
  @Get('metrics')
  async metrics(@Res() res: Response) {
    res.setHeader('Content-Type', prometheusRegistry.contentType);
    res.send(await prometheusRegistry.metrics());
  }
}
