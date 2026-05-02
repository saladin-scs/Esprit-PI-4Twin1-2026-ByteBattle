import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { ReclamationsController } from './reclamations.controller';
import { ReclamationsService } from './reclamations.service';
import { Reclamation, ReclamationSchema } from './schemas/reclamation.schema';
import { SensitiveRateLimitService } from '../common/sensitive-rate-limit.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reclamation.name, schema: ReclamationSchema }]),
    UsersModule,
  ],
  controllers: [ReclamationsController],
  providers: [ReclamationsService, SensitiveRateLimitService],
  exports: [ReclamationsService],
})
export class ReclamationsModule {}
