import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationController, NotificationService } from './notification.controller';
import { NotificationGateway } from './notification.gateway';

@Module({
  imports: [JwtModule.register({})],
  controllers: [NotificationController],
  providers: [NotificationGateway, NotificationService],
  exports: [NotificationGateway, NotificationService],
})
export class NotificationModule {}
