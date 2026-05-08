import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ChatModule } from '../chat/chat.module';
import { ReclamationsModule } from '../reclamations/reclamations.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ChatModule,
    ReclamationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

