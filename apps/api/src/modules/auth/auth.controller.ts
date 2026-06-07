import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { getClientIp, parseUserAgent } from '../../common/utils/request.util';
import { AuthService } from './auth.service';
import { CaptchaService } from './captcha.service';
import { MfaService } from './mfa.service';
import { LoginDto, RefreshDto, MfaLoginDto, MfaCodeDto } from './dto/login.dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly captchaService: CaptchaService,
    private readonly mfaService: MfaService,
  ) {}

  @Public()
  @Get('captcha')
  @RateLimit({ limit: 30, windowSec: 60, keyBy: 'ip' })
  @ApiOperation({ summary: '获取图形验证码' })
  async captcha() {
    return this.captchaService.generate();
  }

  @Public()
  @Post('login')
  @RateLimit({ limit: 10, windowSec: 60, keyBy: 'ip-user' })
  @ApiOperation({ summary: '登录' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ua = parseUserAgent(req.headers['user-agent'] as string);
    return this.authService.login(dto, { ip: getClientIp(req), browser: ua.browser, os: ua.os });
  }

  @Public()
  @Post('login/mfa')
  @RateLimit({ limit: 10, windowSec: 60, keyBy: 'ip' })
  @ApiOperation({ summary: 'MFA 二次验证登录' })
  async loginMfa(@Body() dto: MfaLoginDto, @Req() req: Request) {
    const ua = parseUserAgent(req.headers['user-agent'] as string);
    return this.authService.loginMfa(dto.mfaToken, dto.code, {
      ip: getClientIp(req),
      browser: ua.browser,
      os: ua.os,
    });
  }

  @Public()
  @Post('refresh')
  @RateLimit({ limit: 30, windowSec: 60, keyBy: 'ip' })
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

  // ============ MFA 管理 ============

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('mfa/status')
  @ApiOperation({ summary: 'MFA 状态' })
  async mfaStatus(@CurrentUser() user: AuthUser) {
    const profile = await this.authService.getProfile(user.sub);
    return { enabled: profile.mfaEnabled };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('mfa/setup')
  @RateLimit({ limit: 10, windowSec: 60, keyBy: 'user' })
  @ApiOperation({ summary: 'MFA 绑定：生成密钥与二维码' })
  async mfaSetup(@CurrentUser() user: AuthUser) {
    return this.mfaService.setup(user.sub, user.username);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('mfa/enable')
  @RateLimit({ limit: 10, windowSec: 60, keyBy: 'user' })
  @ApiOperation({ summary: 'MFA 启用：校验验证码并返回备用码' })
  async mfaEnable(@CurrentUser() user: AuthUser, @Body() dto: MfaCodeDto) {
    const backupCodes = await this.mfaService.enable(user.sub, dto.code);
    return { backupCodes };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('mfa/disable')
  @RateLimit({ limit: 10, windowSec: 60, keyBy: 'user' })
  @ApiOperation({ summary: 'MFA 关闭' })
  async mfaDisable(@CurrentUser() user: AuthUser, @Body() dto: MfaCodeDto) {
    await this.mfaService.disable(user.sub, dto.code);
    return null;
  }
}
