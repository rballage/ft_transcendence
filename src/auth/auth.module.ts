import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { PrismaService } from 'src/prisma.service';

@Module({
	imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, UsersService],
  exports: [AuthService],
  
})
export class AuthModule {}
