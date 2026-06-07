import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Length } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

const DATA_SCOPES = ['ALL', 'CUSTOM', 'DEPT', 'DEPT_AND_CHILD', 'SELF'];

export class CreateRoleDto {
  @ApiProperty()
  @IsString()
  @Length(2, 32)
  name!: string;

  @ApiProperty({ description: '角色标识' })
  @IsString()
  @Length(2, 64)
  code!: string;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sort?: number;

  @ApiPropertyOptional({ enum: DATA_SCOPES })
  @IsIn(DATA_SCOPES)
  @IsOptional()
  dataScope?: string;

  @ApiPropertyOptional({ description: '菜单 id 列表' })
  @IsArray()
  @IsOptional()
  menuIds?: number[];

  @ApiPropertyOptional({ description: 'dataScope=CUSTOM 时的部门 id 列表' })
  @IsArray()
  @IsOptional()
  deptIds?: number[];

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  status?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  remark?: string;
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}

export class QueryRoleDto extends PaginationDto {}
