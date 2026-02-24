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
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // Fixed path
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
}