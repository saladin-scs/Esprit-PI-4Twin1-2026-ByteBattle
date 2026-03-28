/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CommonRateLimitModule } from '../common/common.module';
import { UsersModule } from '../users/users.module';
import { Reclamation, ReclamationSchema } from './schemas/reclamation.schema';
import { ReclamationsController } from './reclamations.controller';
import { ReclamationsService } from './reclamations.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reclamation.name, schema: ReclamationSchema }]),
    AuthModule,
    UsersModule,
    CommonRateLimitModule,
  ],
  controllers: [ReclamationsController],
  providers: [ReclamationsService],
  exports: [ReclamationsService],
})
export class ReclamationsModule {}
