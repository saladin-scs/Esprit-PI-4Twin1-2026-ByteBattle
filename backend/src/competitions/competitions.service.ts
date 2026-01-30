import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Competition } from './schemas/competition.schema';

@Injectable()
export class CompetitionsService {
  constructor(
    @InjectModel(Competition.name)
    private competitionModel: Model<Competition>,
  ) {}

  async create(competitionData: any): Promise<Competition> {
    const competition = new this.competitionModel(competitionData);
    return competition.save();
  }

  async findAll(): Promise<Competition[]> {
    return this.competitionModel.find().exec();
  }

  async findOne(id: string): Promise<Competition> {
    return this.competitionModel.findById(id).exec();
  }

  async joinCompetition(competitionId: string, userId: string) {
    return this.competitionModel.findByIdAndUpdate(
      competitionId,
      { $addToSet: { participants: userId } },
      { new: true },
    );
  }
}

