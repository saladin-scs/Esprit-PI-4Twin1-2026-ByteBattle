<<<<<<< HEAD
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private readonly mailEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = Number(this.configService.get<string>('MAIL_PORT')) || 587;
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

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

    // Optional: test the transporter immediately
    this.transporter.verify((err, success) => {
      if (err) {
        this.logger.error('SMTP Transporter failed', err);
      } else {
        this.logger.log('SMTP Transporter is ready');
      }
    });
  }

  async sendEmailVerification(email: string, token: string) {
    if (!this.mailEnabled || !this.transporter) {
      this.logger.warn(`Skipping verification email to ${email}: SMTP disabled`);
      return;
    }

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
    } catch (error: any) {
      this.logger.warn(`Failed to send verification email to ${email}: ${error?.message ?? 'unknown error'}`);
    }
  }

  async sendPasswordReset(email: string, token: string) {
    if (!this.mailEnabled || !this.transporter) {
      this.logger.warn(`Skipping password reset email to ${email}: SMTP disabled`);
      return;
    }

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
    } catch (error: any) {
      this.logger.warn(`Failed to send password reset email to ${email}: ${error?.message ?? 'unknown error'}`);
    }
  }
}
=======
/* eslint-disable prettier/prettier */

/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private readonly mailEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = Number(this.configService.get<string>('MAIL_PORT')) || 587;
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    this.mailEnabled = Boolean(host && user && pass);

    if (!this.mailEnabled) {
      this.logger.warn('SMTP is disabled (missing MAIL_HOST/MAIL_USER/MAIL_PASS). Emails will be skipped.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false, // ⚠️ dev only, ignore SSL errors
      },
    });

    // Optional: test the transporter immediately
    this.transporter.verify((err, success) => {
      if (err) {
        this.logger.warn(`SMTP verification failed: ${err?.message ?? 'unknown error'}`);
      } else {
        this.logger.log('SMTP Transporter is ready');
      }
    });
  }

  async sendEmailVerification(email: string, token: string) {
    if (!this.mailEnabled || !this.transporter) {
      this.logger.warn(`Skipping verification email to ${email}: SMTP disabled`);
      return;
    }

    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('APP_BASE_URL') ||
      'http://localhost:5173';
    const url = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

    const mailOptions = {
      from: `"ByteBattle" <${this.configService.get<string>('MAIL_USER')}>`,
      to: email,
      subject: 'Verify Your Email',
      html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error: any) {
      this.logger.warn(`Failed to send verification email to ${email}: ${error?.message ?? 'unknown error'}`);
    }
  }

  async sendPasswordReset(email: string, token: string) {
    if (!this.mailEnabled || !this.transporter) {
      this.logger.warn(`Skipping password reset email to ${email}: SMTP disabled`);
      return;
    }

    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('APP_BASE_URL') ||
      'http://localhost:5173';
    const url = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const mailOptions = {
      from: `"ByteBattle" <${this.configService.get<string>('MAIL_USER')}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error: any) {
      this.logger.warn(`Failed to send password reset email to ${email}: ${error?.message ?? 'unknown error'}`);
    }
  }
}
>>>>>>> origin/saladin
