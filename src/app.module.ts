import { Module } from '@nestjs/common'
// import { AppController } from './app.controller'
import { PrismaService } from './prisma.service'
import { UsersService } from './users/users.service'
import { AuthService } from './auth/auth.service'
import { AuthModule } from './auth/auth.module';
import { ChannelsModule } from './channels/channels.module';
import { UsersModule } from './users/users.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { JwtModule, JwtService} from '@nestjs/jwt';
import * as dotenv from 'dotenv';
dotenv.config();
// import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [ChannelsModule, UsersModule, AuthModule, ChannelsModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..' , 'client'),
      exclude: ['/api*'],
    }),
	JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
],
  controllers: [],
  providers: [PrismaService, UsersService, AuthService, JwtService],
  exports: [PrismaService, UsersService, AuthService],

})
export class AppModule {}
