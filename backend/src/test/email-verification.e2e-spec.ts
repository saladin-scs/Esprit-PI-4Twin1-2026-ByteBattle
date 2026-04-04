import request from 'supertest';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
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

  // Clear users collection before each test to avoid duplicate email conflicts
  beforeEach(async () => {
    await db.collection('users').deleteMany({});
  });

  it('should send verification email on registration', async () => {
    // Use a unique email to avoid conflicts if previous cleanup failed
    const uniqueEmail = `test-e2e-${Date.now()}@example.com`;
    const registerDto = {
      email: uniqueEmail,
      username: `testuser-${Date.now()}`,
      password: 'Test123!',
    };

    // 1. Register user
    await request(backendUrl)
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    // 2. Wait for email to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Fetch email from Mailhog (try v2, fallback to v1)
    let mailhogRes;
    try {
      mailhogRes = await request(mailhogUrl).get('/api/v2/messages').expect(200);
    } catch (err) {
      // Fallback to v1 API
      mailhogRes = await request(mailhogUrl).get('/api/v1/messages').expect(200);
    }

    // Extract messages array (v2 uses .items, v1 returns array directly)
    let messages = mailhogRes.body.items || mailhogRes.body;
    if (!Array.isArray(messages)) {
      throw new Error(`Mailhog API returned unexpected structure: ${JSON.stringify(messages)}`);
    }

    console.log(`Found ${messages.length} emails. Subjects:`, messages.map(m => m.Content?.Headers?.Subject?.[0]));

    const verificationEmail = messages.find((msg: any) =>
      msg.Content?.Headers?.Subject?.[0] === 'Verify Your Email Address'
    );
    expect(verificationEmail).toBeDefined();

    // 4. Extract token from email body
    const emailBody = verificationEmail.Content.Body;
    const tokenMatch = emailBody.match(/token=([^&"\s]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    expect(token).toBeDefined();

    // 5. Verify email using the token
    await request(backendUrl)
      .get(`/auth/verify-email?token=${token}`)
      .expect(200);

    // 6. Check database for emailVerifiedAt
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: uniqueEmail });
    expect(user).toBeDefined();
    if (!user) {
      throw new Error('User not found after email verification');
    }
    expect(user.emailVerifiedAt).toBeDefined();
  });
});