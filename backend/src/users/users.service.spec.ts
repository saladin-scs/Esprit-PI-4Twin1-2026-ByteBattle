import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { SecurityEventsService } from '../security-events/security-events.service';

describe('UsersService', () => {
  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const securityEvents = {
    record: jest.fn(),
  };

  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken('Submission'), useValue: {} },
        { provide: getModelToken('Solution'), useValue: {} },
        { provide: getModelToken('CompetitionSubmission'), useValue: {} },
        { provide: getModelToken('Reclamation'), useValue: {} },
        { provide: getModelToken('SiteRating'), useValue: {} },
        { provide: getModelToken('Notification'), useValue: {} },
        { provide: getModelToken('ApiKey'), useValue: {} },
        { provide: SecurityEventsService, useValue: securityEvents },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('returns the correct rank tier for XP thresholds', () => {
    expect(service.getRankTierFromXp(0)).toBe('F');
    expect(service.getRankTierFromXp(150)).toBe('E');
    expect(service.getRankTierFromXp(700)).toBe('C');
    expect(service.getRankTierFromXp(2500)).toBe('A');
    expect(service.getRankTierFromXp(5000)).toBe('S');
  });

  it('computes rank progress correctly inside a tier and at max tier', () => {
    const progress = service.getRankProgress(350);
    expect(progress.currentTier).toBe('D');
    expect(progress.nextTier).toBe('C');
    expect(progress.xpInTier).toBe(50);
    expect(progress.xpNeededForNext).toBe(300);
    expect(progress.progressPercent).toBeCloseTo((50 / 300) * 100);

    const maxProgress = service.getRankProgress(5000);
    expect(maxProgress.currentTier).toBe('S');
    expect(maxProgress.nextTier).toBeNull();
    expect(maxProgress.progressPercent).toBe(100);
  });

  it('returns an empty array when findByIds is called with no ids', async () => {
    const result = await service.findByIds([]);
    expect(result).toEqual([]);
    expect(mockUserModel.find).not.toHaveBeenCalled();
  });

  it('adds XP for challenge and updates rank tier', async () => {
    const userId = new Types.ObjectId().toHexString();
    mockUserModel.findById.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue({ xp: 120 }) });
    mockUserModel.findByIdAndUpdate.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue({}) });

    await service.addXpForChallenge(userId, 200);

    expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
    expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(userId, {
      $inc: { xp: 200, totalChallengesSolved: 1 },
      $set: { rankTier: 'C' },
    });
  });

  it('does not update XP when userId is missing or xpEarned is invalid', async () => {
    await service.addXpForChallenge('', 100);
    await service.addXpForChallenge(new Types.ObjectId().toHexString(), 0);
    expect(mockUserModel.findById).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when updateMe contains forbidden fields', async () => {
    await expect(service.updateMe('user-id', { roles: ['admin'] } as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(mockUserModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('changes password when current password is valid', async () => {
    const userId = new Types.ObjectId().toHexString();
    const user = {
      _id: userId,
      password: 'hashed-password',
      isActive: true,
      refreshTokens: ['token'],
      save: jest.fn().mockResolvedValue(true),
    } as any;

    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hashed-password');
    mockUserModel.findById.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(user) });

    const result = await service.changePassword(userId, 'current-password', 'new-password');

    expect(result).toEqual({ success: true });
    expect(user.save).toHaveBeenCalled();
    expect(securityEvents.record).toHaveBeenCalledWith({ type: 'user.change_password', userId });
  });

  it('throws UnauthorizedException when changePassword current password is invalid', async () => {
    const userId = new Types.ObjectId().toHexString();
    const user = { password: 'hashed-password', isActive: true, save: jest.fn() } as any;

    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
    mockUserModel.findById.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(user) });

    await expect(service.changePassword(userId, 'invalid-password', 'new-password')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(user.save).not.toHaveBeenCalled();
    expect(securityEvents.record).not.toHaveBeenCalled();
  });
});
