import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({
  path: path.join(__dirname, '..', '.env'),
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);

  // Permanent admin credentials
  const email = 'superadmin@bytebattle.com';
  const username = 'superadmin';
  const password = 'Admin123!';

  try {
    const existing = await usersService.findByEmail(email);

    if (!existing) {
      const created = await usersService.create({
        email,
        username,
        password,
        roles: ['admin'],
      });

      await usersService.update(
        created._id.toString(),
        {
          roles: ['admin'],
          isAdmin: true,
        } as any,
      );

      console.log('✅ Admin created successfully');
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Password: ${password}`);
    } else {
      await usersService.update(
        existing._id.toString(),
        {
          roles: ['admin'],
          isAdmin: true,
        } as any,
      );

      console.log('✅ Existing admin updated');
    }
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  }

  await app.close();
  process.exit(0);
}

bootstrap();