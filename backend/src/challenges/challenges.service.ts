/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Challenge, ChallengeDocument } from './schemas/challenge.schema';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);

  constructor(
    @InjectModel(Challenge.name)
    private challengeModel: Model<ChallengeDocument>,
    private aiService: AiService,
  ) {}

  /**
   * Get all challenges
   */
  async findAll(): Promise<ChallengeDocument[]> {
    try {
      return await this.challengeModel.find().exec();
    } catch (error) {
      this.logger.error('Error fetching challenges', error);
      return [];
    }
  }

  /**
   * Get one challenge by ID
   */
  async findOne(id: string): Promise<ChallengeDocument | null> {
    try {
      return await this.challengeModel.findById(id).exec();
    } catch (error) {
      this.logger.error(`Error fetching challenge with id ${id}`, error);
      return null;
    }
  }

  /**
   * Create a new challenge manually
   */
  async create(dto: CreateChallengeDto): Promise<ChallengeDocument> {
    try {
      const challenge = new this.challengeModel({
        ...dto,
        solvedCount: 0,
        attemptCount: 0,
      });
      return await challenge.save();
    } catch (error) {
      this.logger.error('Error creating challenge', error);
      throw error;
    }
  }

  /**
   * Generate challenge using AI and save it
   */
  async generateWithAI(difficulty: string, topic: string): Promise<ChallengeDocument> {
    try {
      // Call AI service
      const aiChallenge = await this.aiService.generateChallenge(difficulty, topic);

      // Ensure fallback in case AI fails or returns invalid JSON
      const challengeData = {
        title: aiChallenge?.title || `AI-generated ${topic} challenge`,
        description: aiChallenge?.description || `Solve this ${difficulty} challenge about ${topic}`,
        difficulty: aiChallenge?.difficulty || difficulty,
        testCases: aiChallenge?.testCases || [],
        starterCode: aiChallenge?.starterCode || '',
        tags: aiChallenge?.tags || [topic, difficulty],
        solvedCount: 0,
        attemptCount: 0,
      };

      const challenge = new this.challengeModel(challengeData);
      return await challenge.save();
    } catch (error) {
      this.logger.error('Error generating challenge with AI', error);
      // Return a safe fallback challenge instead of crashing
      const fallbackChallenge = new this.challengeModel({
        title: 'AI generation failed',
        description: 'Unable to generate challenge from AI',
        difficulty,
        testCases: [],
        starterCode: '',
        tags: [topic, difficulty],
        solvedCount: 0,
        attemptCount: 0,
      });
      return fallbackChallenge.save();
    }
  }




  
}
