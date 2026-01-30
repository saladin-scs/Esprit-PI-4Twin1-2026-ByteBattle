// src/ai/ai.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly apiKey: string;
  private readonly logger = new Logger(AiService.name);

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY')!;
  }

  private async callOpenRouter(prompt: string): Promise<string> {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    try {
      const response = await axios.post(
        url,
        {
          model: 'openai/gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are an AI coding challenge generator.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const text = response.data.choices?.[0]?.message?.content;
      return text ?? 'Error: No text generated';
    } catch (err: any) {
      this.logger.error('OpenRouter API error:', err.response?.data ?? err.message);
      return 'Error: Unable to generate response from AI model';
    }
  }

async generateChallenge(difficulty: string, topic: string) {
  const prompt = `Generate a ${difficulty} coding challenge about ${topic} in valid JSON with keys:
- title
- description
- difficulty
- testCases (array with {input, expectedOutput, isHidden})
- tags
- starterCode
Return ONLY valid JSON.`;

  let resultText = await this.callOpenRouter(prompt);

  // Remove extra quotes if AI wraps JSON in a string
  if (resultText.startsWith('"') && resultText.endsWith('"')) {
    resultText = resultText.slice(1, -1).replace(/\\"/g, '"');
  }

  try {
    return JSON.parse(resultText);
  } catch (err) {
    return {
      title: 'Error parsing AI output',
      description: resultText,
      difficulty,
      testCases: [],
      starterCode: '',
      tags: [topic, difficulty],
      solvedCount: 0,
      attemptCount: 0,
    };
  }
}

}
