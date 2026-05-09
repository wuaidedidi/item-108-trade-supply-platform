import axios from 'axios';
import { ElMessage } from 'element-plus';
import router from '../router';
import { useAuthStore } from '../stores/auth';

const recentMessages = new Set();

export function showError(message) {
  if (!message || recentMessages.has(message)) return;
  recentMessages.add(message);
  setTimeout(() => recentMessages.delete(message), 2000);
  ElMessage.error({ message, grouping: true });
}

const http = axios.create({
  baseURL: '/api',
  timeout: 15000
});

http.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`;
  return config;
});

http.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res?.code !== 200) {
      showError(res?.message || '操作失败');
      const error = new Error(res?.message || '操作失败');
      error._isBusinessError = true;
      return Promise.reject(error);
    }
    return res.data;
  },
  (error) => {
    if (error._isBusinessError) return Promise.reject(error);
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      (status === 401 ? '登录已过期，请重新登录' : status === 403 ? '当前账号无权执行该操作' : status >= 500 ? '服务器错误，请稍后重试' : '网络错误，请检查服务是否启动');
    showError(message);
    if (status === 401) {
      const auth = useAuthStore();
      auth.logout();
      router.push('/login');
    }
    return Promise.reject(error);
  }
);

export default http;
