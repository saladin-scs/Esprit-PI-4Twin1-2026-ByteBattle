/* eslint-disable prettier/prettier */
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from './mail.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { SecurityEventsService } from '../security-events/security-events.service';
import { GamificationService } from '../gamification/gamification.service';
import { GoogleProfilePayload } from './strategies/google.strategy';
import { GithubProfilePayload } from './strategies/github.strategy';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private securityEvents: SecurityEventsService,
    private gamificationService: GamificationService,
  ) {}

  private resolveRoles(user: any): string[] {
    if (Array.isArray(user.roles) && user.roles.length) return user.roles;
    if (user.isAdmin) return ['admin'];
    return ['user'];
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateRandomToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  private signAccessToken(user: any) {
    const roles = this.resolveRoles(user);
    const payload = {
      sub: user._id,
      email: user.email,
      username: user.username,
      roles,
    };
    return this.jwtService.sign(payload);
  }

  private signTwoFactorToken(user: any) {
    return this.jwtService.sign(
      { sub: user._id, type: '2fa' },
      { expiresIn: process.env.TWOFA_LOGIN_TOKEN_TTL || '5m' } as any,
    );
  }

  private signSetupToken(user: any) {
    return this.jwtService.sign(
      { sub: user._id, type: '2fa_setup' },
      { expiresIn: process.env.TWOFA_SETUP_TOKEN_TTL || '15m' } as any,
    );
  }

  private async upsertUserFromSocial(profile: GoogleProfilePayload | GithubProfilePayload) {
    const { provider, providerId, email, displayName, avatarUrl } = profile as any;
    const providerField = provider === 'google' ? 'googleId' : 'githubId';

    const byProvider = await this.usersService.findByProviderId(providerField, providerId);
    if (byProvider) return byProvider;

    if (email) {
      const existing = await this.usersService.findByEmail(email, { includeSensitive: true });
      if (existing) {
        (existing as any)[providerField] = providerId;
        (existing as any).authProvider = provider;
        if ('emailVerified' in profile && (profile as any).emailVerified && !existing.emailVerifiedAt) {
          existing.emailVerifiedAt = new Date();
        }
        if (displayName && !existing.displayName) existing.displayName = displayName;
        if (avatarUrl && !existing.avatarUrl) existing.avatarUrl = avatarUrl;
        await existing.save();
        return existing;
      }
    }

    const usernameBase =
      (profile as any).username || (email ? email.split('@')[0] : `user_${provider}_${providerId}`);

    return this.usersService.createFromSocial({
      email: email || `${provider}-${providerId}@example.invalid`,
      usernameBase,
      displayName,
      avatarUrl,
      provider: provider as any,
      providerId,
      emailVerified: 'emailVerified' in profile ? !!(profile as any).emailVerified : !!email,
    });
  }

  private async issueRefreshToken(
    user: any,
    meta?: { ip?: string; userAgent?: string; rememberMe?: boolean },
  ) {
    const random = this.generateRandomToken(32);
    const token = `${user._id}.${random}`;
    const tokenHash = this.hashToken(token);

    const baseTtl =
      Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
    const shortTtl =
      Number(process.env.REFRESH_TOKEN_TTL_DAYS_SHORT || 1);
    const ttlDays = meta?.rememberMe
      ? (Number.isFinite(baseTtl) ? baseTtl : 30)
      : (Number.isFinite(shortTtl) ? shortTtl : 1);

    const expiresAt = new Date(
      Date.now() + ttlDays * 24 * 60 * 60 * 1000,
    );

    const u = await this.usersService.findByIdWithSensitive(String(user._id));
    if (!u) throw new UnauthorizedException();

    u.refreshTokens = u.refreshTokens || [];
    u.refreshTokens.push({
      tokenHash,
      createdAt: new Date(),
      expiresAt,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    } as any);
    await u.save();

    return token;
  }

  // Convenience wrapper to keep controller API stable
  async refreshToken(
    refreshToken: string,
    meta?: { ip?: string; userAgent?: string },
  ) {
    return this.refresh(refreshToken, meta);
  }

  async register(registerDto: RegisterDto, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.usersService.create(registerDto);
    // Create email verification token
    const token = this.generateRandomToken(24);
    const tokenHash = this.hashToken(token);
    const u = await this.usersService.findByIdWithSensitive(String(user._id));
    if (u) {
      (u as any).emailVerificationTokenHash = tokenHash;
      (u as any).emailVerifiedAt = null;
      await u.save();
    }
    await this.mailService.sendEmailVerification(user.email, token);

    await this.securityEvents.record({
      type: 'auth.register',
      userId: String(user._id),
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    // 2FA mandatory at signup: do not issue tokens yet, only a setupToken.
    const setupToken = this.signSetupToken(user);
    return {
      twoFactorSetupRequired: true,
      setupToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        roles: this.resolveRoles(user),
        emailVerifiedAt: (user as any).emailVerifiedAt ?? null,
      },
      emailVerificationRequired: true,
    };
  }

  async issueTokensForUser(
    userId: string,
    meta?: { ip?: string; userAgent?: string; rememberMe?: boolean },
  ) {
    const user = await this.usersService.findByIdWithSensitive(userId);
    if (!user || (user as any).isActive === false) throw new UnauthorizedException();
    try {
      await this.gamificationService.recordDailyLogin(userId);
    } catch {
      // Do not fail login if gamification fails
    }
    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user, meta);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        roles: this.resolveRoles(user),
        emailVerifiedAt: (user as any).emailVerifiedAt ?? null,
      },
    };
  }

  async login(
    loginDto: LoginDto,
    meta?: { ip?: string; userAgent?: string; rememberMe?: boolean },
  ) {
    const user = await this.usersService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if ((user as any).twoFactorEnabled) {
      await this.securityEvents.record({
        type: 'auth.login_2fa_required',
        userId: String(user._id),
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      return {
        twoFactorRequired: true,
        twoFactorToken: this.signTwoFactorToken(user),
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          roles: this.resolveRoles(user),
          emailVerifiedAt: (user as any).emailVerifiedAt ?? null,
        },
      };
    }

    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user, meta);

    await this.securityEvents.record({
      type: 'auth.login',
      userId: String(user._id),
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        roles: this.resolveRoles(user),
        emailVerifiedAt: (user as any).emailVerifiedAt ?? null,
      },
    };
  }

  async validateUser(email: string, password: string) {
    return this.usersService.validateUser(email, password);
  }

  async faceLogin(
    email: string,
    embedding: number[],
    meta?: { ip?: string; userAgent?: string; rememberMe?: boolean },
  ) {
    const user = await this.usersService.verifyFaceByEmailAndGetUser(email, embedding);
    if (!user) {
      throw new UnauthorizedException('Face not recognized. Please try again or use password.');
    }
    if ((user as any).isActive === false) {
      throw new UnauthorizedException('Account is disabled');
    }

    await this.securityEvents.record({
      type: 'auth.face_login',
      userId: String(user._id),
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return this.issueTokensForUser(String(user._id), meta);
  }

  async socialLogin(
    profile: GoogleProfilePayload | GithubProfilePayload,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const user = await this.upsertUserFromSocial(profile);

    if ((user as any).twoFactorEnabled) {
      await this.securityEvents.record({
        type: `auth.social_login_2fa_required.${profile.provider}`,
        userId: String(user._id),
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      return {
        twoFactorRequired: true,
        twoFactorToken: this.signTwoFactorToken(user),
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          roles: this.resolveRoles(user),
          emailVerifiedAt: (user as any).emailVerifiedAt ?? null,
        },
      };
    }

    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user, meta);

    await this.securityEvents.record({
      type: `auth.social_login.${profile.provider}`,
      userId: String(user._id),
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: { providerId: profile.providerId },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        roles: this.resolveRoles(user),
        emailVerifiedAt: (user as any).emailVerifiedAt ?? null,
      },
    };
  }

  async validateOAuthLogin(
    profile: GoogleProfilePayload | GithubProfilePayload,
    meta?: { ip?: string; userAgent?: string },
  ) {
    return this.socialLogin(profile, meta);
  }

  async checkEmail(email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    const user = await this.usersService.findByEmail(email);
    return { available: !user };
  }

  async checkUsername(username: string) {
    if (!username) {
      throw new BadRequestException('Username is required');
    }
    const user = await this.usersService.findPublicByUsername(username);
    return { available: !user };
  }

  async verifyEmail(token: string) {
    if (!token) throw new BadRequestException('Token is required');
    const tokenHash = this.hashToken(token);
    const user = await this.usersService.findByEmailVerificationTokenHash(tokenHash);
    if (!user) throw new BadRequestException('Invalid token');

    user.emailVerificationTokenHash = null;
    user.emailVerifiedAt = new Date();
    await user.save();

    await this.securityEvents.record({
      type: 'auth.verify_email',
      userId: String(user._id),
    });

    return { success: true };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email, { includeSensitive: true });
    // Always return success to avoid account enumeration
    if (!user) return { success: true };
    if ((user as any).emailVerifiedAt) return { success: true };

    const token = this.generateRandomToken(24);
    (user as any).emailVerificationTokenHash = this.hashToken(token);
    await user.save();
    await this.mailService.sendEmailVerification(user.email, token);
    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email, { includeSensitive: true });
    // Always return success to avoid account enumeration
    if (!user) return { success: true };

    const token = this.generateRandomToken(24);
    const tokenHash = this.hashToken(token);
    (user as any).passwordResetTokenHash = tokenHash;
    (user as any).passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();
    await this.mailService.sendPasswordReset(user.email, token);
    await this.securityEvents.record({
      type: 'auth.forgot_password',
      userId: String(user._id),
    });
    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token) throw new BadRequestException('Token is required');
    if (!newPassword || newPassword.length < 8) throw new BadRequestException('Password too short');
    const tokenHash = this.hashToken(token);
    const user = await this.usersService.findByPasswordResetTokenHash(tokenHash);
    if (!user) throw new BadRequestException('Invalid or expired token');

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.refreshTokens = [];
    await user.save();

    await this.securityEvents.record({
      type: 'auth.reset_password',
      userId: String(user._id),
    });

    return { success: true };
  }

  async refresh(refreshToken: string, meta?: { ip?: string; userAgent?: string }) {
    if (!refreshToken) throw new UnauthorizedException();
    const [userId] = String(refreshToken).split('.', 2);
    if (!userId) throw new UnauthorizedException();

    const user = await this.usersService.findByIdWithSensitive(userId);
    if (!user || user.isActive === false) throw new UnauthorizedException();

    const tokenHash = this.hashToken(refreshToken);
    const tokens = (user as any).refreshTokens || [];
    const idx = tokens.findIndex((t: any) => t.tokenHash === tokenHash && !t.revokedAt);
    if (idx === -1) throw new UnauthorizedException();

    const tokenEntry = tokens[idx];
    if (tokenEntry.expiresAt && new Date(tokenEntry.expiresAt).getTime() <= Date.now()) {
      tokenEntry.revokedAt = new Date();
      await user.save();
      throw new UnauthorizedException();
    }

    // rotate
    tokenEntry.revokedAt = new Date();
    tokenEntry.lastUsedAt = new Date();
    await user.save();

    const access_token = this.signAccessToken(user);
    const new_refresh_token = await this.issueRefreshToken(user, meta);

    await this.securityEvents.record({
      type: 'auth.refresh',
      userId: String(user._id),
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return { access_token, refresh_token: new_refresh_token };
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return { success: true };
    const [userId] = String(refreshToken).split('.', 2);
    if (!userId) return { success: true };

    const user = await this.usersService.findByIdWithSensitive(userId);
    if (!user) return { success: true };

    const tokenHash = this.hashToken(refreshToken);
    const tokens = (user as any).refreshTokens || [];
    for (const t of tokens) {
      if (t.tokenHash === tokenHash && !t.revokedAt) {
        t.revokedAt = new Date();
      }
    }
    await user.save();
    await this.securityEvents.record({
      type: 'auth.logout',
      userId: String(user._id),
    });
    return { success: true };
  }

  private generateBackupCode(): string {
    const n = crypto.randomInt(0, 1_000_000_0000);
    return String(n).padStart(10, '0');
  }

  private async generateBackupCodes(count: number = 10) {
    const plain: string[] = [];
    const hashes: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const code = this.generateBackupCode();
      plain.push(code);
      hashes.push(this.hashToken(code));
    }
    return { plain, hashes };
  }

  async generateTwoFactorSetup(userId: string) {
    const user = await this.usersService.findByIdWithSensitive(userId);
    if (!user) throw new UnauthorizedException();

    const secret = authenticator.generateSecret();
    const appName = process.env.TWOFA_APP_NAME || 'ByteBattle';
    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);
    const qrDataUrl = await qrcode.toDataURL(otpauthUrl);

    const { plain, hashes } = await this.generateBackupCodes(10);
    const twoFactorBackupCodes = hashes.map((h) => ({ codeHash: h }));

    await this.usersService.setTwoFactorSetup(userId, {
      twoFactorSecret: secret,
      twoFactorBackupCodes,
    });

    await this.securityEvents.record({
      type: 'auth.2fa.setup_init',
      userId: String(user._id),
    });

    return { otpauthUrl, qrDataUrl, backupCodes: plain };
  }

  async enableTwoFactor(userId: string, code: string) {
    const user = await this.usersService.findByIdWithSensitive(userId);
    if (!user || !(user as any).twoFactorSecret) throw new UnauthorizedException();

    const ok = authenticator.verify({ token: code, secret: (user as any).twoFactorSecret });
    if (!ok) throw new UnauthorizedException('Invalid 2FA code');

    await this.usersService.setTwoFactorEnabled(userId, true);

    await this.securityEvents.record({
      type: 'auth.2fa.enabled',
      userId: String(user._id),
    });

    return { success: true };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.usersService.findByIdWithSensitive(userId);
    if (!user || !(user as any).twoFactorSecret) throw new UnauthorizedException();

    const okTotp = authenticator.verify({ token: code, secret: (user as any).twoFactorSecret });
    const codes = ((user as any).twoFactorBackupCodes || []) as any[];
    const codeHash = this.hashToken(code);
    const idx = codes.findIndex((c: any) => c.codeHash === codeHash && !c.usedAt);
    if (!okTotp && idx === -1) throw new UnauthorizedException('Invalid 2FA code');

    await this.usersService.clearTwoFactor(userId);

    await this.securityEvents.record({
      type: 'auth.2fa.disabled',
      userId: String(user._id),
    });

    return { success: true };
  }

  async verifyTwoFactorLogin(
    twoFactorToken: string,
    code: string,
    meta?: { ip?: string; userAgent?: string; rememberMe?: boolean },
  ) {
    let payload: any;
    try {
      payload = this.jwtService.verify(twoFactorToken);
    } catch {
      throw new UnauthorizedException('Invalid 2FA token');
    }
    if (!payload?.sub || payload.type !== '2fa') {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    const user = await this.usersService.findByIdWithSensitive(String(payload.sub));
    if (!user || (user as any).isActive === false) throw new UnauthorizedException();
    if (!(user as any).twoFactorEnabled || !(user as any).twoFactorSecret) {
      throw new UnauthorizedException('2FA not enabled');
    }

    const secret = (user as any).twoFactorSecret;
    const okTotp = authenticator.verify({ token: code, secret });

    const codes = ((user as any).twoFactorBackupCodes || []) as any[];
    const codeHash = this.hashToken(code);
    const idx = codes.findIndex((c: any) => c.codeHash === codeHash && !c.usedAt);

    if (!okTotp && idx === -1) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    if (idx !== -1) {
      const updatedCodes = ((user as any).twoFactorBackupCodes || []).map((c: any, i: number) => ({
        codeHash: c.codeHash,
        usedAt: i === idx ? new Date() : c.usedAt,
      }));
      await this.usersService.updateTwoFactorBackupCodes(String(user._id), updatedCodes);
    }

    const access_token = this.signAccessToken(user);
    const refresh_token = await this.issueRefreshToken(user, meta);

    await this.securityEvents.record({
      type: 'auth.2fa.login',
      userId: String(user._id),
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return {
      access_token,
      refresh_token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        roles: this.resolveRoles(user),
        emailVerifiedAt: (user as any).emailVerifiedAt ?? null,
      },
    };
  }
}

