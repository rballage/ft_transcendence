import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { UsersService } from 'src/users/users.service';
import { WsGateway } from './ws.gateway';

@Module({
  providers: [WsGateway, UsersService, PrismaService],
  exports: [WsGateway],
})
export class WsModule {}
