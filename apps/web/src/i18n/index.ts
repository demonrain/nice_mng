import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { useAppStore } from '@/store/app';

const resources = {
  zh: {
    translation: {
      login: { title: '欢迎登录', username: '用户名', password: '密码', captcha: '验证码', submit: '登 录' },
      common: {
        search: '搜索',
        reset: '重置',
        add: '新增',
        edit: '编辑',
        delete: '删除',
        confirm: '确定',
        cancel: '取消',
        operation: '操作',
        status: '状态',
        enabled: '启用',
        disabled: '停用',
        createdAt: '创建时间',
        success: '操作成功',
      },
      menu: { dashboard: '仪表盘', system: '系统管理', profile: '个人中心', logout: '退出登录' },
    },
  },
  en: {
    translation: {
      login: { title: 'Welcome', username: 'Username', password: 'Password', captcha: 'Captcha', submit: 'Login' },
      common: {
        search: 'Search',
        reset: 'Reset',
        add: 'Add',
        edit: 'Edit',
        delete: 'Delete',
        confirm: 'OK',
        cancel: 'Cancel',
        operation: 'Action',
        status: 'Status',
        enabled: 'Enabled',
        disabled: 'Disabled',
        createdAt: 'Created At',
        success: 'Success',
      },
      menu: { dashboard: 'Dashboard', system: 'System', profile: 'Profile', logout: 'Logout' },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: useAppStore.getState().lang,
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
});

export default i18n;
