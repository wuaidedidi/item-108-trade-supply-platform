import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || 'null')
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token && state.user),
    role: (state) => state.user?.role || '',
    displayName: (state) => state.user?.name || state.user?.username || ''
  },
  actions: {
    setSession(token, user) {
      this.token = token;
      this.user = user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    async login(payload) {
      const { authApi } = await import('../api/modules');
      const data = await authApi.login(payload);
      this.setSession(data.token, data.user);
    },
    async refreshMe() {
      const { authApi } = await import('../api/modules');
      const user = await authApi.me();
      this.user = user;
      localStorage.setItem('user', JSON.stringify(user));
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
});
