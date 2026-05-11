import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { message: string; status: string } {
    return {
      message: 'ByteBattle API is running!',
      status: 'ok',
    };
  }
}
