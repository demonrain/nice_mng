/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * 菜单种子定义。children 可递归。
 * type: DIR 目录 / MENU 菜单 / BUTTON 按钮
 */
interface MenuSeed {
  name: string;
  title: string;
  type: 'DIR' | 'MENU' | 'BUTTON';
  path?: string;
  component?: string;
  redirect?: string;
  icon?: string;
  perm?: string;
  sort?: number;
  keepAlive?: boolean;
  children?: MenuSeed[];
}

// 通用 CRUD 按钮工厂
function crudButtons(prefix: string, extra: MenuSeed[] = []): MenuSeed[] {
  return [
    { name: `${prefix}:query`, title: '查询', type: 'BUTTON', perm: `${prefix}:query` },
    { name: `${prefix}:add`, title: '新增', type: 'BUTTON', perm: `${prefix}:add` },
    { name: `${prefix}:edit`, title: '修改', type: 'BUTTON', perm: `${prefix}:edit` },
    { name: `${prefix}:delete`, title: '删除', type: 'BUTTON', perm: `${prefix}:delete` },
    ...extra,
  ];
}

const MENUS: MenuSeed[] = [
  {
    name: 'Dashboard',
    title: '仪表盘',
    type: 'MENU',
    path: '/dashboard',
    component: 'dashboard/index',
    icon: 'DashboardOutlined',
    sort: 0,
    perm: 'dashboard:view',
  },
  {
    name: 'System',
    title: '系统管理',
    type: 'DIR',
    path: '/system',
    icon: 'SettingOutlined',
    sort: 10,
    children: [
      {
        name: 'User',
        title: '用户管理',
        type: 'MENU',
        path: '/system/user',
        component: 'system/user/index',
        icon: 'UserOutlined',
        perm: 'system:user:list',
        children: crudButtons('system:user', [
          { name: 'system:user:resetPwd', title: '重置密码', type: 'BUTTON', perm: 'system:user:resetPwd' },
        ]),
      },
      {
        name: 'Role',
        title: '角色管理',
        type: 'MENU',
        path: '/system/role',
        component: 'system/role/index',
        icon: 'TeamOutlined',
        perm: 'system:role:list',
        children: crudButtons('system:role'),
      },
      {
        name: 'Menu',
        title: '菜单管理',
        type: 'MENU',
        path: '/system/menu',
        component: 'system/menu/index',
        icon: 'MenuOutlined',
        perm: 'system:menu:list',
        children: crudButtons('system:menu'),
      },
      {
        name: 'Dept',
        title: '部门管理',
        type: 'MENU',
        path: '/system/dept',
        component: 'system/dept/index',
        icon: 'ApartmentOutlined',
        perm: 'system:dept:list',
        children: crudButtons('system:dept'),
      },
      {
        name: 'Post',
        title: '岗位管理',
        type: 'MENU',
        path: '/system/post',
        component: 'system/post/index',
        icon: 'IdcardOutlined',
        perm: 'system:post:list',
        children: crudButtons('system:post'),
      },
      {
        name: 'Dict',
        title: '字典管理',
        type: 'MENU',
        path: '/system/dict',
        component: 'system/dict/index',
        icon: 'BookOutlined',
        perm: 'system:dict:list',
        children: crudButtons('system:dict'),
      },
      {
        name: 'Config',
        title: '参数配置',
        type: 'MENU',
        path: '/system/config',
        component: 'system/config/index',
        icon: 'ControlOutlined',
        perm: 'system:config:list',
        children: crudButtons('system:config'),
      },
      {
        name: 'Notice',
        title: '通知公告',
        type: 'MENU',
        path: '/system/notice',
        component: 'system/notice/index',
        icon: 'NotificationOutlined',
        perm: 'system:notice:list',
        children: crudButtons('system:notice'),
      },
      {
        name: 'File',
        title: '文件管理',
        type: 'MENU',
        path: '/system/file',
        component: 'system/file/index',
        icon: 'CloudUploadOutlined',
        perm: 'system:file:list',
      },
    ],
  },
  {
    name: 'Log',
    title: '日志管理',
    type: 'DIR',
    path: '/log',
    icon: 'FileTextOutlined',
    sort: 20,
    children: [
      {
        name: 'OperLog',
        title: '操作日志',
        type: 'MENU',
        path: '/log/oper',
        component: 'system/log/oper',
        perm: 'system:operlog:list',
        children: [
          { name: 'system:operlog:query', title: '查询', type: 'BUTTON', perm: 'system:operlog:query' },
          { name: 'system:operlog:delete', title: '删除', type: 'BUTTON', perm: 'system:operlog:delete' },
        ],
      },
      {
        name: 'LoginLog',
        title: '登录日志',
        type: 'MENU',
        path: '/log/login',
        component: 'system/log/login',
        perm: 'system:loginlog:list',
        children: [
          { name: 'system:loginlog:query', title: '查询', type: 'BUTTON', perm: 'system:loginlog:query' },
          { name: 'system:loginlog:delete', title: '删除', type: 'BUTTON', perm: 'system:loginlog:delete' },
        ],
      },
    ],
  },
  {
    name: 'Monitor',
    title: '系统监控',
    type: 'DIR',
    path: '/monitor',
    icon: 'FundOutlined',
    sort: 30,
    children: [
      {
        name: 'Server',
        title: '服务监控',
        type: 'MENU',
        path: '/monitor/server',
        component: 'monitor/server/index',
        icon: 'DesktopOutlined',
        perm: 'monitor:server:view',
      },
      {
        name: 'Online',
        title: '在线用户',
        type: 'MENU',
        path: '/monitor/online',
        component: 'monitor/online/index',
        icon: 'WifiOutlined',
        perm: 'monitor:online:list',
        children: [
          { name: 'monitor:online:forceLogout', title: '强退', type: 'BUTTON', perm: 'monitor:online:forceLogout' },
        ],
      },
      {
        name: 'Job',
        title: '定时任务',
        type: 'MENU',
        path: '/monitor/job',
        component: 'monitor/job/index',
        icon: 'ClockCircleOutlined',
        perm: 'monitor:job:list',
        children: crudButtons('monitor:job', [
          { name: 'monitor:job:run', title: '执行一次', type: 'BUTTON', perm: 'monitor:job:run' },
          { name: 'monitor:job:changeStatus', title: '状态变更', type: 'BUTTON', perm: 'monitor:job:changeStatus' },
        ]),
      },
    ],
  },
  {
    name: 'Tool',
    title: '系统工具',
    type: 'DIR',
    path: '/tool',
    icon: 'ToolOutlined',
    sort: 40,
    children: [
      {
        name: 'Gen',
        title: '代码生成',
        type: 'MENU',
        path: '/tool/gen',
        component: 'tool/gen/index',
        icon: 'CodeOutlined',
        perm: 'tool:gen:list',
        children: crudButtons('tool:gen', [
          { name: 'tool:gen:preview', title: '预览', type: 'BUTTON', perm: 'tool:gen:preview' },
          { name: 'tool:gen:code', title: '生成代码', type: 'BUTTON', perm: 'tool:gen:code' },
        ]),
      },
      {
        name: 'FormDesigner',
        title: '表单设计器',
        type: 'MENU',
        path: '/tool/form',
        component: 'tool/form/index',
        icon: 'FormOutlined',
        perm: 'tool:form:list',
        children: crudButtons('tool:form'),
      },
    ],
  },
];

async function seedMenus(items: MenuSeed[], parentId: number | null, baseSort = 0): Promise<string[]> {
  const perms: string[] = [];
  let order = baseSort;
  for (const item of items) {
    const created = await prisma.menu.create({
      data: {
        parentId: parentId ?? undefined,
        name: item.name,
        title: item.title,
        type: item.type,
        path: item.path,
        component: item.component,
        redirect: item.redirect,
        icon: item.icon,
        perm: item.perm,
        sort: item.sort ?? order,
        keepAlive: item.keepAlive ?? false,
        visible: item.type !== 'BUTTON',
      },
    });
    if (item.perm) perms.push(item.perm);
    order += 1;
    if (item.children?.length) {
      const childPerms = await seedMenus(item.children, created.id);
      perms.push(...childPerms);
    }
  }
  return perms;
}

async function main() {
  console.log('🌱 开始初始化种子数据...');

  const menuCount = await prisma.menu.count();
  if (menuCount > 0) {
    console.log('⏭️  检测到已有数据，跳过种子初始化。');
    return;
  }

  // 1) 部门
  const rootDept = await prisma.dept.create({
    data: { name: 'nice-admin 总公司', sort: 0, leader: 'admin' },
  });
  await prisma.dept.create({ data: { parentId: rootDept.id, name: '研发部', sort: 1 } });
  await prisma.dept.create({ data: { parentId: rootDept.id, name: '运营部', sort: 2 } });

  // 2) 岗位
  await prisma.post.createMany({
    data: [
      { name: '董事长', code: 'ceo', sort: 1 },
      { name: '项目经理', code: 'pm', sort: 2 },
      { name: '普通员工', code: 'staff', sort: 3 },
    ],
  });

  // 3) 菜单（全量）
  await seedMenus(MENUS, null);
  const allMenus = await prisma.menu.findMany();

  // 4) 角色：超级管理员 + 普通角色
  const superRole = await prisma.role.create({
    data: { name: '超级管理员', code: 'super_admin', sort: 1, dataScope: 'ALL', remark: '系统内置，拥有全部权限' },
  });
  // 超管关联全部菜单
  await prisma.roleMenu.createMany({
    data: allMenus.map((m) => ({ roleId: superRole.id, menuId: m.id })),
  });

  const commonRole = await prisma.role.create({
    data: { name: '普通角色', code: 'common', sort: 2, dataScope: 'DEPT_AND_CHILD', remark: '示例角色' },
  });
  // 普通角色：仅 Dashboard + 用户查看
  const commonMenus = allMenus.filter(
    (m) => m.name === 'Dashboard' || m.name === 'System' || m.name === 'User' || m.name === 'system:user:query',
  );
  await prisma.roleMenu.createMany({
    data: commonMenus.map((m) => ({ roleId: commonRole.id, menuId: m.id })),
  });

  // 5) 超级管理员账号
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await prisma.user.create({
    data: {
      username: ADMIN_USERNAME,
      password: hashed,
      nickname: '超级管理员',
      isSuperAdmin: true,
      deptId: rootDept.id,
      email: 'admin@nice-admin.dev',
      status: 1,
    },
  });
  await prisma.userRole.create({ data: { userId: admin.id, roleId: superRole.id } });

  // 6) 字典
  const statusDict = await prisma.dictType.create({
    data: { name: '通用状态', type: 'common_status', remark: '启用/停用' },
  });
  await prisma.dictData.createMany({
    data: [
      { dictTypeId: statusDict.id, label: '启用', value: '1', tagType: 'success', sort: 1, isDefault: true },
      { dictTypeId: statusDict.id, label: '停用', value: '0', tagType: 'error', sort: 2 },
    ],
  });
  const genderDict = await prisma.dictType.create({
    data: { name: '用户性别', type: 'sys_user_gender' },
  });
  await prisma.dictData.createMany({
    data: [
      { dictTypeId: genderDict.id, label: '未知', value: '0', sort: 1, isDefault: true },
      { dictTypeId: genderDict.id, label: '男', value: '1', tagType: 'blue', sort: 2 },
      { dictTypeId: genderDict.id, label: '女', value: '2', tagType: 'magenta', sort: 3 },
    ],
  });

  // 7) 参数配置
  await prisma.config.createMany({
    data: [
      { name: '系统名称', key: 'sys.app.name', value: 'nice-admin', builtin: true, remark: '后台名称' },
      { name: '是否开启验证码', key: 'sys.account.captchaEnabled', value: 'true', builtin: true },
      { name: '初始密码', key: 'sys.user.initPassword', value: '123456', builtin: true },
    ],
  });

  // 8) 通知公告
  await prisma.notice.create({
    data: { title: '欢迎使用 nice-admin', type: 'ANNOUNCE', content: '这是一个开箱即用的企业级后台管理系统。' },
  });

  console.log('✅ 种子数据初始化完成');
  console.log(`   超级管理员: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ 种子初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
