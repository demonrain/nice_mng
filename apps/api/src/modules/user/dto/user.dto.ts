import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @Length(2, 32)
  username!: string;

  @ApiProperty()
  @IsString()
  @Length(4, 64)
  password!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(32)
  nickname?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: '0 未知 1 男 2 女' })
  @IsInt()
  @IsOptional()
  gender?: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  deptId?: number;

  @ApiPropertyOptional({ description: '角色 id 列表' })
  @IsArray()
  @IsOptional()
  roleIds?: number[];

  @ApiPropertyOptional({ description: '岗位 id 列表' })
  @IsArray()
  @IsOptional()
  postIds?: number[];

  @ApiPropertyOptional({ description: '1 启用 0 停用' })
  @IsInt()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remark?: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  deptId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  status?: number;
}

export class ResetPwdDto {
  @ApiProperty()
  @IsString()
  @Length(4, 64)
  password!: string;
}

export class ChangeStatusDto {
  @ApiProperty({ description: '1 启用 0 停用' })
  @IsInt()
  status!: number;
}
