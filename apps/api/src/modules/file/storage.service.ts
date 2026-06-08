import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PersistResult {
  url: string;
  storedPath: string;
  storage: string;
}

export interface StorageAdapter {
  readonly name: string;
  persist(file: Express.Multer.File): Promise<PersistResult>;
}

/** 本地磁盘：multer 已写入磁盘，这里只计算访问 URL */
class LocalAdapter implements StorageAdapter {
  readonly name = 'local';
  constructor(private readonly baseUrl: string) {}
  async persist(file: Express.Multer.File): Promise<PersistResult> {
    const url = `${this.baseUrl}/uploads/${file.filename}`;
    return { url, storedPath: file.path, storage: this.name };
  }
}

/**
 * 对象存储适配器占位（OSS/S3/MinIO）。
 * 接入时：安装对应 SDK，在 persist 中读取 file.path 上传，返回对象 URL。
 * 未实现的驱动会明确报错，避免静默失败。
 */
class ObjectStorageAdapter implements StorageAdapter {
  constructor(public readonly name: string) {}
  async persist(): Promise<PersistResult> {
    throw new BadRequestException(
      `存储驱动 ${this.name} 尚未接入 SDK，请在 storage.service.ts 中实现，或将 STORAGE_DRIVER 设为 local`,
    );
  }
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly adapter: StorageAdapter;

  constructor(private readonly config: ConfigService) {
    const driver = this.config.get<string>('storage.driver') || 'local';
    const baseUrl = this.config.get<string>('storage.publicBaseUrl') || '';
    switch (driver) {
      case 'local':
        this.adapter = new LocalAdapter(baseUrl);
        break;
      case 'oss':
      case 's3':
      case 'minio':
        this.adapter = new ObjectStorageAdapter(driver);
        break;
      default:
        this.logger.warn(`未知存储驱动 ${driver}，回退 local`);
        this.adapter = new LocalAdapter(baseUrl);
    }
    this.logger.log(`文件存储驱动: ${this.adapter.name}`);
  }

  persist(file: Express.Multer.File): Promise<PersistResult> {
    return this.adapter.persist(file);
  }
}
