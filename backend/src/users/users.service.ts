import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(dto: any): Promise<UserDocument> {
    try {
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = new this.userModel({
        ...dto,
        password: hashedPassword,
      });
      return await user.save();
    } catch (err: any) {
      // Catch duplicate key error (email/username)
      if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        throw new ConflictException(`User with this ${field} already exists`);
      }
      throw err; // rethrow other errors
    }
  }

  async validateUser(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({ email });
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
  }

  // Find one user by ID
  async findOne(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).exec();
  }

  // Update user by ID
  async update(userId: string, updateData: Partial<User>): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, updateData, { new: true }).exec();
  }
}
