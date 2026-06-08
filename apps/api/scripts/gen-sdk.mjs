#!/usr/bin/env node
/**
 * 从 openapi.json 生成一个轻量 TypeScript SDK（基于 fetch）。
 * 先启动一次 API（会写出 openapi.json），再运行：node scripts/gen-sdk.mjs
 * 产物：../../packages/shared/src/sdk.generated.ts（可被前端 import）
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(__dirname, '../openapi.json');
const outPath = resolve(__dirname, '../../../packages/shared/src/sdk.generated.ts');

if (!existsSync(specPath)) {
  console.error('[gen-sdk] 未找到 openapi.json，请先以非生产模式启动一次 API。');
  process.exit(1);
}

const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const lines = [
  '/* 自动生成，请勿手改。来源：openapi.json (scripts/gen-sdk.mjs) */',
  'export interface SdkOptions { baseUrl?: string; token?: string; }',
  'async function call(method: string, path: string, opts: SdkOptions = {}, body?: unknown, query?: Record<string, unknown>) {',
  '  const base = opts.baseUrl ?? "/api";',
  '  const qs = query ? "?" + new URLSearchParams(Object.entries(query).filter(([,v]) => v != null).map(([k,v]) => [k, String(v)])).toString() : "";',
  '  const res = await fetch(base + path + qs, {',
  '    method,',
  '    headers: { "Content-Type": "application/json", ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },',
  '    body: body ? JSON.stringify(body) : undefined,',
  '  });',
  '  return res.json();',
  '}',
  '',
  'export const sdk = {',
];

let count = 0;
for (const [path, methods] of Object.entries(spec.paths || {})) {
  for (const [method, op] of Object.entries(methods)) {
    if (!['get', 'post', 'put', 'delete', 'patch'].includes(method)) continue;
    const opId = (op.operationId || `${method}_${path}`)
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const tsPath = path.replace(/\{(\w+)\}/g, '${$1}');
    const pathParams = [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const args = [...pathParams.map((p) => `${p}: string | number`), 'body?: unknown', 'query?: Record<string, unknown>', 'opts?: SdkOptions'];
    lines.push(
      `  ${opId}: (${args.join(', ')}) => call(${JSON.stringify(method.toUpperCase())}, \`${tsPath}\`, opts, body, query),`,
    );
    count++;
  }
}
lines.push('};', '');

writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`[gen-sdk] 已生成 ${count} 个接口方法 -> ${outPath}`);
