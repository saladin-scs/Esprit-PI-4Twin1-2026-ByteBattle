/**
 * Create or promote a fixed admin user (uses Nest + UsersService).
 *
 * From backend/: npm run seed:admin
 *
 * Optional .env overrides:
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@bytebattle.com').toLowerCase().trim();
  const username = (process.env.SEED_ADMIN_USERNAME || 'admin').trim();
  const password = process.env.SEED_ADMIN_PASSWORD || 'password123';

  try {
    const existing = await usersService.findByEmail(email);
    if (!existing) {
      const created = await usersService.create({
        email,
        username,
        password,
        roles: ['admin'],
      });
      await usersService.update(created._id.toString(), { roles: ['admin'], isAdmin: true } as any);
      console.log(`✅ Admin created: ${email} / ${password} (username: ${username})`);
    } else {
      await usersService.update(existing._id.toString(), {
        roles: ['admin'],
        isAdmin: true,
      } as any);
      console.log(`✅ Existing user promoted to admin: ${email} (password unchanged unless you reset it)`);
    }
  } catch (err) {
    console.error('Error creating admin:', err);
    await app.close();
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

bootstrap();
