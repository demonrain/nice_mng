import { http } from './http';
import type { PageResult, RouteItem } from '@nice-admin/shared';

type AnyParams = Record<string, unknown>;

export const authApi = {
  captcha: () => http.get<{ id: string; svg: string }>('/auth/captcha'),
  routes: () => http.get<RouteItem[]>('/system/menu/routes'),
};

export const mfaApi = {
  status: () => http.get<{ enabled: boolean }>('/auth/mfa/status'),
  setup: () => http.post<{ secret: string; otpauthUrl: string; qrcode: string }>('/auth/mfa/setup'),
  enable: (code: string) => http.post<{ backupCodes: string[] }>('/auth/mfa/enable', { code }),
  disable: (code: string) => http.post('/auth/mfa/disable', { code }),
};

export const userApi = {
  list: (params: AnyParams) => http.get<PageResult<any>>('/system/user', { params }),
  detail: (id: number) => http.get<any>(`/system/user/${id}`),
  create: (data: AnyParams) => http.post('/system/user', data),
  update: (id: number, data: AnyParams) => http.put(`/system/user/${id}`, data),
  remove: (ids: number[]) => http.delete(`/system/user/${ids.join(',')}`),
  resetPwd: (id: number, password: string) => http.put(`/system/user/${id}/password`, { password }),
  changeStatus: (id: number, status: number) => http.put(`/system/user/${id}/status`, { status }),
  updateProfile: (data: AnyParams) => http.put('/system/user/profile', data),
  changePassword: (oldPassword: string, newPassword: string) =>
    http.put('/system/user/profile/password', { oldPassword, newPassword }),
};

export const roleApi = {
  list: (params: AnyParams) => http.get<PageResult<any>>('/system/role', { params }),
  detail: (id: number) => http.get<any>(`/system/role/${id}`),
  create: (data: AnyParams) => http.post('/system/role', data),
  update: (id: number, data: AnyParams) => http.put(`/system/role/${id}`, data),
  remove: (ids: number[]) => http.delete(`/system/role/${ids.join(',')}`),
};

export const menuApi = {
  tree: () => http.get<any[]>('/system/menu/tree'),
  detail: (id: number) => http.get<any>(`/system/menu/${id}`),
  create: (data: AnyParams) => http.post('/system/menu', data),
  update: (id: number, data: AnyParams) => http.put(`/system/menu/${id}`, data),
  remove: (id: number) => http.delete(`/system/menu/${id}`),
};

export const deptApi = {
  tree: () => http.get<any[]>('/system/dept/tree'),
  create: (data: AnyParams) => http.post('/system/dept', data),
  update: (id: number, data: AnyParams) => http.put(`/system/dept/${id}`, data),
  remove: (id: number) => http.delete(`/system/dept/${id}`),
};

export const postApi = {
  list: (params: AnyParams) => http.get<PageResult<any>>('/system/post', { params }),
  create: (data: AnyParams) => http.post('/system/post', data),
  update: (id: number, data: AnyParams) => http.put(`/system/post/${id}`, data),
  remove: (ids: number[]) => http.delete(`/system/post/${ids.join(',')}`),
};

export const dictApi = {
  listType: (params: AnyParams) => http.get<PageResult<any>>('/system/dict/type', { params }),
  createType: (data: AnyParams) => http.post('/system/dict/type', data),
  updateType: (id: number, data: AnyParams) => http.put(`/system/dict/type/${id}`, data),
  removeType: (ids: number[]) => http.delete(`/system/dict/type/${ids.join(',')}`),
  listData: (dictTypeId: number) => http.get<any[]>('/system/dict/data', { params: { dictTypeId } }),
  byType: (type: string) => http.get<any[]>(`/system/dict/data/type/${type}`),
  createData: (data: AnyParams) => http.post('/system/dict/data', data),
  updateData: (id: number, data: AnyParams) => http.put(`/system/dict/data/${id}`, data),
  removeData: (ids: number[]) => http.delete(`/system/dict/data/${ids.join(',')}`),
};

export const configApi = {
  list: (params: AnyParams) => http.get<PageResult<any>>('/system/config', { params }),
  create: (data: AnyParams) => http.post('/system/config', data),
  update: (id: number, data: AnyParams) => http.put(`/system/config/${id}`, data),
  remove: (ids: number[]) => http.delete(`/system/config/${ids.join(',')}`),
};

export const noticeApi = {
  list: (params: AnyParams) => http.get<PageResult<any>>('/system/notice', { params }),
  recent: () => http.get<any[]>('/system/notice/recent'),
  create: (data: AnyParams) => http.post('/system/notice', data),
  update: (id: number, data: AnyParams) => http.put(`/system/notice/${id}`, data),
  remove: (ids: number[]) => http.delete(`/system/notice/${ids.join(',')}`),
  broadcast: (data: AnyParams) => http.post('/notification/broadcast', data),
};

export const logApi = {
  operList: (params: AnyParams) => http.get<PageResult<any>>('/system/log/oper', { params }),
  removeOper: (ids: number[]) => http.delete(`/system/log/oper/${ids.join(',')}`),
  loginList: (params: AnyParams) => http.get<PageResult<any>>('/system/log/login', { params }),
  removeLogin: (ids: number[]) => http.delete(`/system/log/login/${ids.join(',')}`),
};

export const fileApi = {
  list: (params: AnyParams) => http.get<PageResult<any>>('/system/file', { params }),
  remove: (ids: number[]) => http.delete(`/system/file/${ids.join(',')}`),
  uploadUrl: '/api/system/file/upload',
};

export const monitorApi = {
  server: () => http.get<any>('/monitor/server'),
  cache: () => http.get<any>('/monitor/cache'),
  online: () => http.get<any[]>('/monitor/online'),
  forceLogout: (socketId: string) => http.delete(`/monitor/online/${socketId}`),
};

export const jobApi = {
  list: (params: AnyParams) => http.get<PageResult<any>>('/monitor/job', { params }),
  handlers: () => http.get<string[]>('/monitor/job/handlers'),
  logs: (params: AnyParams) => http.get<PageResult<any>>('/monitor/job/logs', { params }),
  create: (data: AnyParams) => http.post('/monitor/job', data),
  update: (id: number, data: AnyParams) => http.put(`/monitor/job/${id}`, data),
  changeStatus: (id: number, status: number) => http.put(`/monitor/job/${id}/status/${status}`),
  run: (id: number) => http.post(`/monitor/job/${id}/run`),
  remove: (ids: number[]) => http.delete(`/monitor/job/${ids.join(',')}`),
};

export const genApi = {
  list: (params: AnyParams) => http.get<PageResult<any>>('/tool/gen', { params }),
  detail: (id: number) => http.get<any>(`/tool/gen/${id}`),
  preview: (id: number) => http.get<any[]>(`/tool/gen/${id}/preview`),
  create: (data: AnyParams) => http.post('/tool/gen', data),
  update: (id: number, data: AnyParams) => http.put(`/tool/gen/${id}`, data),
  remove: (ids: number[]) => http.delete(`/tool/gen/${ids.join(',')}`),
};

export const formApi = {
  list: (params: AnyParams) => http.get<PageResult<any>>('/tool/form', { params }),
  detail: (id: number) => http.get<any>(`/tool/form/${id}`),
  byCode: (code: string) => http.get<any>(`/tool/form/code/${code}`),
  create: (data: AnyParams) => http.post('/tool/form', data),
  update: (id: number, data: AnyParams) => http.put(`/tool/form/${id}`, data),
  remove: (ids: number[]) => http.delete(`/tool/form/${ids.join(',')}`),
};
