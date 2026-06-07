import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CaptchaService } from './captcha.service';
import { PermissionService } from './permission.service';
import { MfaService } from './mfa.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global()
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, CaptchaService, PermissionService, MfaService, JwtStrategy],
  exports: [PermissionService, AuthService, MfaService],
})
export class AuthModule {}
