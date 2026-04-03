import request from 'supertest';
import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { MongoClient, Db } from 'mongodb';

describe('Email Verification (e2e)', () => {
  let backendUrl: string;
  let mailhogUrl: string;
  let dbClient: MongoClient;
  let db: Db;

  beforeAll(async () => {
    backendUrl = process.env.BACKEND_URL || 'http://backend:3000';
    mailhogUrl = process.env.MAILHOG_API_URL || 'http://mailhog:8025';
    const mongoUri = process.env.MONGODB_URI || 'mongodb://test:test@mongodb:27017/bytebattle_test?authSource=admin';

    dbClient = new MongoClient(mongoUri);
    await dbClient.connect();
    db = dbClient.db();
  });

  afterAll(async () => {
    await dbClient.close();
  });

  it('should send verification email on registration', async () => {
    const registerDto = {
      email: 'test-e2e@example.com',
      username: 'testuser',
      password: 'Test123!',
    };

    // 1. Register user
    await request(backendUrl)
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    // 2. Wait for email
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Fetch email from Mailhog
    const mailhogRes = await request(mailhogUrl)
      .get('/api/v2/messages')
      .expect(200);

    const messages = mailhogRes.body.items;
    const verificationEmail = messages.find((msg: any) =>
      msg.Content?.Headers?.Subject?.[0] === 'Verify Your Email Address'
    );
    expect(verificationEmail).toBeDefined();

    // 4. Extract token
    const emailBody = verificationEmail.Content.Body;
    const tokenMatch = emailBody.match(/token=([^&"\s]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    expect(token).toBeDefined();

    // 5. Verify email
    await request(backendUrl)
      .get(`/auth/verify-email?token=${token}`)
      .expect(200);

    // 6. Check database
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: registerDto.email });
    expect(user.emailVerifiedAt).toBeDefined();
  });
});