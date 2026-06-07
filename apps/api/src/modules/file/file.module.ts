import {
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post as HttpPost,
  Query,
  Delete,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { buildPageResult } from '../../common/utils/pagination.util';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

@Injectable()
export class FileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async save(file: Express.Multer.File, uploaderId: number) {
    if (!file) throw new BadRequestException('未接收到文件');
    const url = `/uploads/${file.filename}`;
    const record = await this.prisma.fileRecord.create({
      data: {
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        url,
        mimetype: file.mimetype,
        size: file.size,
        uploaderId,
      },
    });
    return record;
  }

  async list(query: PaginationDto) {
    const where = query.keyword
      ? { originalName: { contains: query.keyword, mode: 'insensitive' as const } }
      : {};
    const [list, total] = await this.prisma.$transaction([
      this.prisma.fileRecord.findMany({ where, skip: query.skip, take: query.take, orderBy: { id: 'desc' } }),
      this.prisma.fileRecord.count({ where }),
    ]);
    return buildPageResult(list, total, query.page, query.pageSize);
  }

  async remove(ids: number[]) {
    await this.prisma.fileRecord.deleteMany({ where: { id: { in: ids } } });
    return { count: ids.length };
  }
}

@ApiTags('文件管理')
@ApiBearerAuth()
@Controller('system/file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @HttpPost('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: '上传文件（登录可用）' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), UPLOAD_DIR);
          ensureDir(dir);
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: (parseInt(process.env.UPLOAD_MAX_SIZE_MB || '20', 10)) * 1024 * 1024 },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: AuthUser) {
    return this.fileService.save(file, user.sub);
  }

  @Get()
  @ApiOperation({ summary: '文件列表' })
  list(@Query() query: PaginationDto) {
    return this.fileService.list(query);
  }

  @Delete(':ids')
  remove(@Param('ids') ids: string) {
    return this.fileService.remove(ids.split(',').map((s) => parseInt(s, 10)));
  }
}

@Module({
  controllers: [FileController],
  providers: [FileService],
})
export class FileModule {}
