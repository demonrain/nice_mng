import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { getClientIp, parseUserAgent } from '../../common/utils/request.util';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';
import { LoginDto, RefreshDto } from './dto/login.dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly captchaService: CaptchaService,
  ) {}

  @Public()
  @Get('captcha')
  @ApiOperation({ summary: '获取图形验证码' })
  async captcha() {
    return this.captchaService.generate();
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: '登录' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ua = parseUserAgent(req.headers['user-agent'] as string);
    return this.authService.login(dto, { ip: getClientIp(req), browser: ua.browser, os: ua.os });
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '刷新令牌' })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: '登出' })
  async logout(@CurrentUser() user: AuthUser) {
    await this.authService.logout(user.sub);
    return null;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: '获取个人信息与权限' })
  async profile(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.sub);
  }
}
