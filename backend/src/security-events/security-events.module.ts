import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityEvent, SecurityEventSchema } from './schemas/security-event.schema';
import { SecurityEventsService } from './security-events.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SecurityEvent.name, schema: SecurityEventSchema }]),
  ],
  providers: [SecurityEventsService],
  exports: [SecurityEventsService],
})
export class SecurityEventsModule {}

