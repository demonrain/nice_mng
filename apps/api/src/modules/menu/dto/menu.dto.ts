import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

const MENU_TYPES = ['DIR', 'MENU', 'BUTTON'];

export class CreateMenuDto {
  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  parentId?: number;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ enum: MENU_TYPES })
  @IsIn(MENU_TYPES)
  type!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  path?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  component?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  redirect?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: '权限标识' })
  @IsString()
  @IsOptional()
  perm?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sort?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  visible?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  keepAlive?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  status?: number;
}

export class UpdateMenuDto extends PartialType(CreateMenuDto) {}
