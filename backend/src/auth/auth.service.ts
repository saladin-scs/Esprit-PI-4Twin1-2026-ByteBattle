import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from './mail.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { SecurityEventsService } from '../security-events/security-events.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private securityEvents: SecurityEventsService,
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

  private async issueRefreshToken(user: any, meta?: { ip?: string; userAgent?: string }) {
    const random = this.generateRandomToken(32);
    const token = `${user._id}.${random}`;
    const tokenHash = this.hashToken(token);
    const ttlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
    const expiresAt = new Date(Date.now() + (Number.isFinite(ttlDays) ? ttlDays : 30) * 24 * 60 * 60 * 1000);

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

    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.issueRefreshToken(user, meta);

    await this.securityEvents.record({
      type: 'auth.register',
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
      emailVerificationRequired: true,
    };
  }

  async login(loginDto: LoginDto, meta?: { ip?: string; userAgent?: string }) {
    const user = await this.usersService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
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
}

