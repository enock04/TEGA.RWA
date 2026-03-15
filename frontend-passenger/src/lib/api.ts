import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach token on every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Typed helpers ───────────────────────────

export const authApi = {
  register: (data: { fullName: string; phoneNumber: string; email?: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { phoneNumber: string; password: string }) =>
    api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),
  forgotPassword: (phoneNumber: string) =>
    api.post('/auth/forgot-password', { phoneNumber }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

export const stationsApi = {
  getAll: (params?: { search?: string; province?: string }) =>
    api.get('/stations', { params }),
  getById: (id: string) => api.get(`/stations/${id}`),
  create: (data: object) => api.post('/stations', data),
  update: (id: string, data: object) => api.put(`/stations/${id}`, data),
  delete: (id: string) => api.delete(`/stations/${id}`),
};

export const routesApi = {
  search: (params: { departureStationId: string; destinationStationId: string; date: string }) =>
    api.get('/routes/search', { params }),
  getAll: () => api.get('/routes'),
  create: (data: object) => api.post('/routes', data),
  update: (id: string, data: object) => api.put(`/routes/${id}`, data),
  delete: (id: string) => api.delete(`/routes/${id}`),
};

export const busesApi = {
  getAll: (params?: object) => api.get('/buses', { params }),
  getById: (id: string) => api.get(`/buses/${id}`),
  getSeats: (busId: string, scheduleId: string) =>
    api.get(`/buses/${busId}/seats`, { params: { scheduleId } }),
  create: (data: object) => api.post('/buses', data),
  update: (id: string, data: object) => api.put(`/buses/${id}`, data),
  delete: (id: string) => api.delete(`/buses/${id}`),
};

export const schedulesApi = {
  getAll: (params?: object) => api.get('/schedules', { params }),
  getById: (id: string) => api.get(`/schedules/${id}`),
  create: (data: object) => api.post('/schedules', data),
  update: (id: string, data: object) => api.put(`/schedules/${id}`, data),
  cancel: (id: string) => api.delete(`/schedules/${id}`),
};

export const bookingsApi = {
  create: (data: {
    scheduleId: string;
    seatId: string;
    passengerName: string;
    passengerPhone: string;
    passengerEmail?: string;
  }) => api.post('/bookings', data),
  createBatch: (data: {
    scheduleId: string;
    passengers: { seatId: string; passengerName: string; passengerPhone: string; passengerEmail?: string }[];
  }) => api.post('/bookings/batch', data),
  getSummary: (id: string) => api.get(`/bookings/${id}/summary`),
  getMyBookings: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/bookings/my', { params }),
  getAll: (params?: object) => api.get('/bookings/admin', { params }),
  cancel: (id: string) => api.delete(`/bookings/${id}`),
};

export const paymentsApi = {
  initiate: (data: { bookingId: string; method: string; payerPhone: string }) =>
    api.post('/payments/initiate', data),
  confirm: (paymentId: string) => api.post(`/payments/${paymentId}/confirm`),
  getByBooking: (bookingId: string) => api.get(`/payments/booking/${bookingId}`),
  getAll: (params?: object) => api.get('/payments', { params }),
};

export const ticketsApi = {
  getByBooking: (bookingId: string) => api.get(`/tickets/${bookingId}`),
};

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getReports: (params?: object) => api.get('/admin/reports', { params }),
  getAgencies: () => api.get('/admin/agencies'),
  createAgency: (data: object) => api.post('/admin/agencies', data),
};

export const usersApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: { fullName?: string; email?: string }) =>
    api.put('/users/profile', data),
  getAll: (params?: object) => api.get('/users', { params }),
  toggleStatus: (id: string, isActive: boolean) =>
    api.patch(`/users/${id}/status`, { isActive }),
  createAgent: (data: { fullName: string; phoneNumber: string; password: string; email?: string }) =>
    api.post('/users/agents', data),
  updateUser: (id: string, data: { fullName?: string; email?: string; role?: string }) =>
    api.put(`/users/${id}`, data),
};
