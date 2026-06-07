import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { ProfileService } from './profile.service';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [UserService, ProfileService],
  exports: [UserService],
})
export class UserModule {}
