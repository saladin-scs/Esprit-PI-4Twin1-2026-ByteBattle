import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendEmailVerification(email: string, token: string) {
    const baseUrl = this.configService.get<string>('APP_BASE_URL') || 'http://localhost:5173';
    const url = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

    // No SMTP configured in this project yet: log the link for dev.
    this.logger.log(`Email verification link for ${email}: ${url}`);
  }

  async sendPasswordReset(email: string, token: string) {
    const baseUrl = this.configService.get<string>('APP_BASE_URL') || 'http://localhost:5173';
    const url = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    this.logger.log(`Password reset link for ${email}: ${url}`);
  }
}

