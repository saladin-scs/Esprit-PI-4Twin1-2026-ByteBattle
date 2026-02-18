/* eslint-disable prettier/prettier */
import { Controller, Post, Body, UseGuards, Get, Request, HttpCode, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshDto } from './dto/refresh.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private useCookieAuth(): boolean {
    return String(process.env.AUTH_USE_COOKIES || '').toLowerCase() === 'true';
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    if (!this.useCookieAuth()) return;
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      path: '/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response) {
    if (!this.useCookieAuth()) return;
    res.clearCookie('refresh_token', { path: '/auth' });
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async register(@Body() registerDto: RegisterDto, @Request() req, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(registerDto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    if (result.refresh_token) {
      this.setRefreshCookie(res, result.refresh_token);
      if (this.useCookieAuth()) delete (result as any).refresh_token;
    }
    return result;
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Request() req, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    if (result.refresh_token) {
      this.setRefreshCookie(res, result.refresh_token);
      if (this.useCookieAuth()) delete (result as any).refresh_token;
    }
    return result;
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshDto, @Request() req, @Res({ passthrough: true }) res: Response) {
    const cookieToken = (req as any).cookies?.refresh_token;
    const refreshToken = dto.refresh_token || cookieToken;
    const result = await this.authService.refresh(refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    this.setRefreshCookie(res, result.refresh_token);
    if (this.useCookieAuth()) delete (result as any).refresh_token;
    return result;
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout (revoke refresh token)' })
  async logout(@Body() dto: RefreshDto, @Request() req, @Res({ passthrough: true }) res: Response) {
    const cookieToken = (req as any).cookies?.refresh_token;
    const refreshToken = dto.refresh_token || cookieToken;
    await this.authService.logout(refreshToken);
    this.clearRefreshCookie(res);
    return { success: true };
  }

  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify email address' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resend email verification' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reset password using token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  getProfile(@Request() req) {
    return req.user;
  }
}
