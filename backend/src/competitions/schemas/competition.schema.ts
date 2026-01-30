import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompetitionDocument = Competition & Document;

@Schema({ timestamps: true })
export class Competition {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  type: string; // 'solo', '1v1', 'team'

  @Prop({ type: [String], default: [] })
  participants: string[];

  @Prop({ type: String })
  challengeId: string;

  @Prop({ default: Date.now })
  startTime: Date;

  @Prop()
  endTime?: Date;

  @Prop({ default: 'pending' })
  status: string; // 'pending', 'active', 'completed'
}

export const CompetitionSchema = SchemaFactory.createForClass(Competition);

