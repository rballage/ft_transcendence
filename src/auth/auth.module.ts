import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { PrismaService } from 'src/prisma.service';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './local.strategy';

import { JwtModule, JwtService} from '@nestjs/jwt';
// import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

@Module({
	imports: [UsersModule, PassportModule,
    JwtModule.registerAsync({
      useFactory: async () => ({
        secret: 'SUPER_SECRET',
        signOptions: {expiresIn: `600s`,},
      })
    })],
	controllers: [AuthController],
	providers: [AuthService, PrismaService, UsersService, LocalStrategy, JwtStrategy],
	exports: [AuthService],
})
export class AuthModule {}
