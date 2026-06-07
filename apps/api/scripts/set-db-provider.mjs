#!/usr/bin/env node
/**
 * 根据环境变量 DB_PROVIDER 切换 prisma/schema.prisma 的 datasource provider。
 * 支持：postgresql（默认）、mysql。
 *
 * Prisma 不允许用 env() 动态设置 provider，因此在 generate/migrate 前
 * 由本脚本重写 datasource 块中的 provider 行（带 `DB_PROVIDER_LINE` 标记的那一行）。
 *
 * 用法：node scripts/set-db-provider.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, '../prisma/schema.prisma');

const SUPPORTED = ['postgresql', 'mysql'];
const provider = (process.env.DB_PROVIDER || 'postgresql').toLowerCase();

if (!SUPPORTED.includes(provider)) {
  console.error(`[set-db-provider] 不支持的 DB_PROVIDER: ${provider}，可选值: ${SUPPORTED.join(', ')}`);
  process.exit(1);
}

let schema = readFileSync(schemaPath, 'utf8');
const lineRegex = /provider\s*=\s*"(postgresql|mysql)".*DB_PROVIDER_LINE.*/;

if (!lineRegex.test(schema)) {
  console.error('[set-db-provider] 未在 schema.prisma 找到带 DB_PROVIDER_LINE 标记的 provider 行');
  process.exit(1);
}

schema = schema.replace(
  lineRegex,
  `provider = "${provider}" // DB_PROVIDER_LINE 由脚本自动维护，请勿手改`,
);
writeFileSync(schemaPath, schema, 'utf8');
console.log(`[set-db-provider] datasource provider 已设置为: ${provider}`);
