import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const email = 'admin@bytebattle.com';
  
  try {
    const existing = await usersService.findByEmail(email);
    if (!existing) {
      await usersService.create({
        email,
        username: 'admin',
        password: 'password123',
        roles: ['admin'],
        isAdmin: true,
      });
      console.log('✅ Admin account created: admin@bytebattle.com / password123');
    } else {
      await usersService.update(existing._id.toString(), {
        roles: ['admin'],
        isAdmin: true
      } as any);
      console.log('✅ Existing account updated to admin: admin@bytebattle.com / password123');
    }
  } catch (err) {
    console.error('Error creating admin:', err);
  }

  await app.close();
  process.exit(0);
}

bootstrap();
