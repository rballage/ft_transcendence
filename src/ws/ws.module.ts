import { CacheModule, Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/prisma.service';
import { UsersService } from 'src/users/users.service';
import { GameService } from './game/game.service';
import { WsGateway } from './ws.gateway';

@Module({
	imports: [CacheModule.register({
		ttl: 0,
		max: 100000
	})],
  providers: [WsGateway, UsersService, PrismaService, JwtService, AuthService, GameService],
  exports: [WsGateway],
})
export class WsModule {}
