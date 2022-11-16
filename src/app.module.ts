import { Module } from '@nestjs/common';
// import { PrismaService } from './prisma/prisma.service';
// import { UserService } from './user/user.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule],
	providers: [],
})
export class AppModule {}
