import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersPublicController } from './users.public.controller';
import { User, UserSchema } from './schemas/user.schema';
import { SecurityEventsModule } from '../security-events/security-events.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    SecurityEventsModule,
  ],
  controllers: [UsersController, UsersPublicController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
})
export class UsersModule {}

