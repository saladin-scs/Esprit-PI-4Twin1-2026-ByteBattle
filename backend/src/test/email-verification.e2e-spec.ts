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

  beforeEach(async () => {
    await db.collection('users').deleteMany({});
    // Clear Mailhog messages
    await fetch(`${mailhogUrl}/api/v1/messages`, { method: 'DELETE' }).catch(() => {});
  });

  it('should send verification email on registration', async () => {
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

    // 3. Fetch email from Mailhog using fetch (native)
    let messages = [];
    try {
      const res = await fetch(`${mailhogUrl}/api/v2/messages`);
      const data = await res.json();
      messages = data.items || data;
    } catch (err) {
      // fallback to v1
      const res = await fetch(`${mailhogUrl}/api/v1/messages`);
      messages = await res.json();
    }

    if (!Array.isArray(messages)) {
      console.error('Mailhog response is not an array:', messages);
      throw new Error('Mailhog did not return an array of messages');
    }

    console.log(`Found ${messages.length} emails. Subjects:`, messages.map(m => m.Content?.Headers?.Subject?.[0]));

    const verificationEmail = messages.find(msg =>
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
    const user = await usersCollection.findOne({ email: uniqueEmail });
    if (!user) {
      throw new Error('User not found after email verification');
    }
    expect(user.emailVerifiedAt).toBeDefined();
  });
});