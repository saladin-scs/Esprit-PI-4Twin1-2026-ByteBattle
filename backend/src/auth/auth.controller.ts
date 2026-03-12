/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Enable2FADto } from './dto/enable-2fa.dto';
import { Disable2FADto } from './dto/disable-2fa.dto';
import { Verify2FALoginDto } from './dto/verify-2fa-login.dto';
import { FaceLoginDto } from './dto/face-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleProfilePayload, GithubProfilePayload } from './strategies';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('face-login')
  async faceLogin(
    @Body() dto: FaceLoginDto,
    @Req() req: Request,
  ) {
    const meta = {
      ip: (req as any).ip || (req as any).connection?.remoteAddress,
      userAgent: (req as any).headers?.['user-agent'],
      rememberMe: dto.rememberMe,
    };
    return this.authService.faceLogin(dto.email, dto.embedding, meta);
  }

  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refresh_token);
  }

  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    return this.authService.checkEmail(email);
  }

  @Get('check-username')
  async checkUsername(@Query('username') username: string) {
    return this.authService.checkUsername(username);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates Google OAuth
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const result = await this.authService.validateOAuthLogin(
      req.user as GoogleProfilePayload,
    );

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:5173';

    if ((result as any)?.twoFactorRequired && (result as any)?.twoFactorToken) {
      const params = new URLSearchParams({
        two_factor_required: 'true',
        two_factor_token: String((result as any).twoFactorToken),
      });
      return res.redirect(
        `${frontendUrl}/auth/social/callback?${params.toString()}`,
      );
    }

    const params = new URLSearchParams();
    if ((result as any)?.access_token) {
      params.set('access_token', String((result as any).access_token));
    }
    if ((result as any)?.refresh_token) {
      params.set('refresh_token', String((result as any).refresh_token));
    }

    return res.redirect(
      `${frontendUrl}/auth/social/callback?${params.toString()}`,
    );
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Initiates GitHub OAuth
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthRedirect(@Req() req, @Res() res: Response) {
    const result = await this.authService.validateOAuthLogin(
      req.user as GithubProfilePayload,
    );

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:5173';

    if ((result as any)?.twoFactorRequired && (result as any)?.twoFactorToken) {
      const params = new URLSearchParams({
        two_factor_required: 'true',
        two_factor_token: String((result as any).twoFactorToken),
      });
      return res.redirect(
        `${frontendUrl}/auth/social/callback?${params.toString()}`,
      );
    }

    const params = new URLSearchParams();
    if ((result as any)?.access_token) {
      params.set('access_token', String((result as any).access_token));
    }
    if ((result as any)?.refresh_token) {
      params.set('refresh_token', String((result as any).refresh_token));
    }

    return res.redirect(
      `${frontendUrl}/auth/social/callback?${params.toString()}`,
    );
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  async twoFactorSetup(@Req() req: any) {
    return this.authService.generateTwoFactorSetup(req.user.userId);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  async twoFactorEnable(
    @Req() req: Request & { user: { userId: string; type?: string } },
    @Body() dto: Enable2FADto,
  ) {
    await this.authService.enableTwoFactor(req.user.userId, dto.code);
    if (req.user.type === '2fa_setup') {
      const meta = {
        ip: (req as any).ip || (req as any).connection?.remoteAddress,
        userAgent: (req as any).headers?.['user-agent'],
      };
      return this.authService.issueTokensForUser(req.user.userId, meta);
    }
    return { success: true };
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  async twoFactorDisable(@Req() req: any, @Body() dto: Disable2FADto) {
    await this.authService.disableTwoFactor(req.user.userId, dto.code);
    return { success: true };
  }

  @Post('2fa/verify-login')
  async verifyTwoFactorLogin(
    @Body() dto: Verify2FALoginDto,
    @Req() req: Request,
  ) {
    const meta = {
      ip: (req as any).ip || (req as any).connection?.remoteAddress,
      userAgent: (req as any).headers?.['user-agent'],
      rememberMe: (req as any).body?.rememberMe,
    };
    return this.authService.verifyTwoFactorLogin(
      dto.twoFactorToken,
      dto.code,
      meta,
    );
  }

  @Post('logout')
  async logout(@Body() body: { refresh_token?: string }) {
    return this.authService.logout(body?.refresh_token);
  }
}