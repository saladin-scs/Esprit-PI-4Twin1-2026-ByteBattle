import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Achievement } from './schemas/achievement.schema';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectModel(Achievement.name)
    private achievementModel: Model<Achievement>,
  ) {}

  async findAll(): Promise<Achievement[]> {
    return this.achievementModel.find().exec();
  }

  async checkAndAward(userId: string, achievementType: string) {
    // TODO: Implement achievement checking and awarding logic
    return null;
  }
}

