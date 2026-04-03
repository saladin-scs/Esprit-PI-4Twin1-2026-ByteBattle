import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { INestApplication } from '@nestjs/common';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';

describe('Email Verification (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let userModel: Model<User>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('DATABASE_CONNECTION')
      .useValue(uri)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    userModel = moduleRef.get(getModelToken(User.name));
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('should send verification email on registration', async () => {
    const registerDto = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Test123!',
    };

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    // Wait a moment for the email to be sent
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Retrieve the email from Mailhog (via its API)
    const mailhogResponse = await request('http://localhost:8025')
      .get('/api/v2/messages')
      .expect(200);

    const messages = mailhogResponse.body.items;
    const verificationEmail = messages.find(msg => 
      msg.Content.Headers.Subject[0] === 'Verify Your Email Address'
    );

    expect(verificationEmail).toBeDefined();

    // Extract token from email body (e.g., using regex)
    const emailBody = verificationEmail.Content.Body;
    const tokenMatch = emailBody.match(/token=([^&"\s]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    expect(token).toBeDefined();

    // Now verify the email
    await request(app.getHttpServer())
      .get(`/auth/verify-email?token=${token}`)
      .expect(200);

    // Check user in database
    const user = await userModel.findOne({ email: registerDto.email });
    expect(user.emailVerifiedAt).toBeDefined();
  });
});