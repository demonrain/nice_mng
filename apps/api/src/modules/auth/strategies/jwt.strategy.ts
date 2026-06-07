import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUserPayload } from '@nice-admin/shared';
import { PermissionService } from '../permission.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly permissionService: PermissionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret')!,
    });
  }

  async validate(payload: JwtUserPayload): Promise<AuthUser> {
    if (!payload?.sub) throw new UnauthorizedException('无效令牌');
    const auth = await this.permissionService.loadUserAuth(payload.sub);
    return {
      sub: payload.sub,
      username: payload.username,
      isSuperAdmin: auth.isSuperAdmin,
      roles: auth.roles,
      permissions: auth.permissions,
      deptId: auth.deptId,
      dataScopes: auth.dataScopes,
    };
  }
}
