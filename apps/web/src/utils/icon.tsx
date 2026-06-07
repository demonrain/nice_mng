import * as Icons from '@ant-design/icons';
import type { ComponentType } from 'react';

/** 根据图标名渲染 antd 图标，找不到则返回 null */
export function renderIcon(name?: string | null) {
  if (!name) return null;
  const Icon = (Icons as Record<string, ComponentType>)[name];
  return Icon ? <Icon /> : null;
}
