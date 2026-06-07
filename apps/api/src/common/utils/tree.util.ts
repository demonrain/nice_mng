interface HasIdParent {
  id: number;
  parentId: number | null;
  children?: unknown[];
  [key: string]: unknown;
}

/** 将扁平列表构建为树结构 */
export function listToTree<T extends HasIdParent>(list: T[], rootParentId: number | null = null): T[] {
  const map = new Map<number, T & { children: T[] }>();
  list.forEach((item) => map.set(item.id, { ...item, children: [] }));
  const roots: (T & { children: T[] })[] = [];
  map.forEach((node) => {
    if (node.parentId != null && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else if (node.parentId === rootParentId || node.parentId == null) {
      roots.push(node);
    }
  });
  return roots;
}
