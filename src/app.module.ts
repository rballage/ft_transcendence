import { Module } from '@nestjs/common'
// import { AppController } from './app.controller'
import { PrismaService } from './prisma.service'
import { AuthModule } from './auth/auth.module';
import { ChannelsModule } from './channels/channels.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule, ChannelsModule, UsersModule],
  controllers: [],
  providers: [PrismaService],
  exports: [PrismaService],

})
export class AppModule {}
