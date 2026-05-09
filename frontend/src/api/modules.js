import http from './http';

export const authApi = {
  login: (data) => http.post('/auth/login', data),
  register: (data) => http.post('/auth/register', data),
  me: () => http.get('/auth/me'),
  updateMe: (data) => http.put('/auth/me', data),
  updatePassword: (data) => http.put('/auth/me/password', data)
};

export function crudApi(base) {
  return {
    list: (params) => http.get(base, { params }),
    detail: (id) => http.get(`${base}/${id}`),
    create: (data) => http.post(base, data),
    update: (id, data) => http.put(`${base}/${id}`, data),
    remove: (id) => http.delete(`${base}/${id}`)
  };
}

export const productApi = crudApi('/products');
export const orderApi = crudApi('/orders');
export const applicationApi = {
  ...crudApi('/applications'),
  review: (id, data) => http.put(`/applications/${id}/review`, data)
};
export const paymentApi = crudApi('/payments');
export const reviewApi = crudApi('/reviews');
export const inventoryApi = {
  list: (params) => http.get('/inventory', { params }),
  update: (id, data) => http.put(`/inventory/${id}`, data)
};
export const notificationApi = {
  list: (params) => http.get('/notifications', { params }),
  read: (id) => http.put(`/notifications/${id}/read`),
  readAll: () => http.put('/notifications/read-all')
};
export const userApi = crudApi('/users');
export const statsApi = {
  dashboard: () => http.get('/stats/dashboard')
};
