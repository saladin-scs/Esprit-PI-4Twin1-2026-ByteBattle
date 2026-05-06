import { HealthController } from './health.controller';
import type { Connection } from 'mongoose';

describe('HealthController', () => {
  const makeResponse = () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    return response;
  };

  it('returns liveness information', () => {
    const controller = new HealthController({ readyState: 1 } as Connection);

    expect(controller.live()).toEqual(
      expect.objectContaining({
        status: 'ok',
        socketIo: expect.any(String),
      }),
    );
  });

  it('returns 200 when mongodb is connected', () => {
    const controller = new HealthController({ readyState: 1 } as Connection);
    const response = makeResponse();

    controller.ready(response as any);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ready',
        mongodb: 'connected',
      }),
    );
  });

  it('returns 503 when mongodb is disconnected', () => {
    const controller = new HealthController({ readyState: 0 } as Connection);
    const response = makeResponse();

    controller.ready(response as any);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'degraded',
        mongodb: 'disconnected',
      }),
    );
  });
});
