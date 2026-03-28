/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly mailFrom: string;
  private readonly devMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.devMode =
      (this.configService.get<string>('NODE_ENV') || 'development') !==
      'production';

    const host =
      this.configService.get<string>('MAIL_HOST') ||
      this.configService.get<string>('SMTP_HOST');
    const port = Number(
      this.configService.get<string>('MAIL_PORT') ||
        this.configService.get<string>('SMTP_PORT'),
    ) || 587;
    const user =
      this.configService.get<string>('MAIL_USER') ||
      this.configService.get<string>('SMTP_USER');
    const pass =
      this.configService.get<string>('MAIL_PASS') ||
      this.configService.get<string>('SMTP_PASS');

    this.mailFrom = user || 'noreply@bytebattle.local';

    if (!host) {
      this.logger.log(
        'Email disabled (set MAIL_HOST or SMTP_HOST). In development, verification/reset links are logged to the console.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.transporter.verify((err) => {
      if (err) {
        this.logger.error('SMTP connection failed', err.message);
        if (this.devMode) {
          this.logger.warn(
            'Continuing without working SMTP in development; links will be logged instead of emailed.',
          );
          this.transporter = null;
        }
      } else {
        this.logger.log('SMTP ready');
      }
    });
  }

  private buildVerifyUrl(token: string): string {
    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('APP_BASE_URL') ||
      'http://localhost:5173';
    return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
  }

  private buildResetUrl(token: string): string {
    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('APP_BASE_URL') ||
      'http://localhost:5173';
    return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  }

  async sendEmailVerification(email: string, token: string) {
    const url = this.buildVerifyUrl(token);

    if (!this.transporter) {
      if (this.devMode) {
        this.logger.warn(
          `[DEV] Email not sent. Verify ${email} with:\n  ${url}`,
        );
        return;
      }
      throw new Error('Email is not configured (MAIL_HOST / SMTP_HOST).');
    }

    try {
      await this.transporter.sendMail({
        from: `"ByteBattle" <${this.mailFrom}>`,
        to: email,
        subject: 'Verify Your Email',
        html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send verification email to ${email}`,
        error?.stack,
      );
      throw error;
    }
  }

  async sendPasswordReset(email: string, token: string) {
    const url = this.buildResetUrl(token);

    if (!this.transporter) {
      if (this.devMode) {
        this.logger.warn(
          `[DEV] Email not sent. Reset password for ${email}:\n  ${url}`,
        );
        return;
      }
      throw new Error('Email is not configured (MAIL_HOST / SMTP_HOST).');
    }

    try {
      await this.transporter.sendMail({
        from: `"ByteBattle" <${this.mailFrom}>`,
        to: email,
        subject: 'Password Reset Request',
        html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error?.stack,
      );
      throw error;
    }
  }
}
