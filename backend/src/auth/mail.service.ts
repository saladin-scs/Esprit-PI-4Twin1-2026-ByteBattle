import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
      tls: {
        rejectUnauthorized: false, // ⚠️ Bypass SSL verification (dev only)
      },
    });
  }

  async sendEmailVerification(email: string, token: string) {
    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('APP_BASE_URL') ||
      'http://localhost:5173';
    const url = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

    const mailOptions = {
      from: `"ByteBattle" <${this.configService.get<string>('SMTP_USER')}>`,
      to: email,
      subject: 'Verify Your Email',
      html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error.stack);
      throw error;
    }
  }

  async sendPasswordReset(email: string, token: string) {
    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('APP_BASE_URL') ||
      'http://localhost:5173';
    const url = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const mailOptions = {
      from: `"ByteBattle" <${this.configService.get<string>('SMTP_USER')}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error.stack);
      throw error;
    }
  }
}