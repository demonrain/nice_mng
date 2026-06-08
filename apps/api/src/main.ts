import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JsonLogger } from './common/logger/json.logger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
    logger: new JsonLogger(),
  });
  const config = app.get(ConfigService);
  const prefix = config.get<string>('prefix') || '/api';
  const port = config.get<number>('port') || 3000;

  app.setGlobalPrefix(prefix);
  app.enableCors({
    origin: config.get<string[]>('corsOrigins'),
    credentials: true,
  });

  // 静态托管上传目录
  app.useStaticAssets(join(process.cwd(), config.get('upload.dir') || 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('nice-admin API')
    .setDescription('nice-admin 后台管理系统接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${prefix}/docs`, app, document);
  // 导出 OpenAPI 文档（供 SDK 生成；生产环境不落盘）
  if (config.get('env') !== 'production') {
    try {
      writeFileSync(join(process.cwd(), 'openapi.json'), JSON.stringify(document, null, 2));
    } catch {
      /* 忽略只读文件系统 */
    }
  }

  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 nice-admin API 已启动: http://localhost:${port}${prefix}`, 'Bootstrap');
  Logger.log(`📖 接口文档: http://localhost:${port}${prefix}/docs`, 'Bootstrap');
}
bootstrap();
