import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  username!: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  password!: string;

  @ApiPropertyOptional({ description: '验证码 id' })
  @IsString()
  @IsOptional()
  captchaId?: string;

  @ApiPropertyOptional({ description: '验证码' })
  @IsString()
  @IsOptional()
  captcha?: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class MfaLoginDto {
  @ApiProperty({ description: 'login 返回的 mfaToken' })
  @IsString()
  mfaToken!: string;

  @ApiProperty({ description: 'TOTP 6 位验证码或备用码' })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  code!: string;
}

export class MfaCodeDto {
  @ApiProperty({ description: 'TOTP 验证码或备用码' })
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  code!: string;
}
