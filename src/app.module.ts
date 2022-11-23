import { Module } from '@nestjs/common'
// import { AppController } from './app.controller'
import { PrismaService } from './prisma.service'
import { AuthModule } from './auth/auth.module';
import { ChannelsModule } from './channels/channels.module';
import { UsersModule } from './users/users.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [AuthModule, ChannelsModule, UsersModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..' , 'client'),
      exclude: ['/api*'],
    }),],
  controllers: [],
  providers: [PrismaService],
  exports: [PrismaService],

})
export class AppModule {}
