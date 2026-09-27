import api from './api';
import type {
  ApiResponse,
  Disaster,
  PaginatedDisasters,
  DisasterStats,
  Resource,
  Report,
} from '../types';

export const disasterService = {
  getAll: (params?: { tag?: string; status?: string; page?: number; limit?: number }) =>
    api.get<ApiResponse<PaginatedDisasters>>('/disasters', { params }),

  getOne: (id: string) => api.get<ApiResponse<Disaster>>(`/disasters/${id}`),

  create: (data: {
    title: string;
    description: string;
    tags: string[];
    status: string;
    location?: { name: string; latitude: number; longitude: number };
  }) =>
    api.post<ApiResponse<Disaster>>('/disasters', data),

  update: (id: string, data: Partial<{ title: string; description: string; tags: string[]; status: string }>) =>
    api.patch<ApiResponse<Disaster>>(`/disasters/${id}`, data),

  delete: (id: string) => api.delete<ApiResponse<null>>(`/disasters/${id}`),

  getStats: () => api.get<ApiResponse<DisasterStats>>('/disasters/stats'),

  getNearbyResources: (id: string, lat: number, lng: number, radius = 10) =>
    api.get<ApiResponse<Resource[]>>(`/disasters/${id}/resources`, {
      params: { lat, lng, radius },
    }),

  getReports: (id: string) => api.get<ApiResponse<Report[]>>(`/disasters/${id}/reports`),
};

export const authService = {
  login: (email: string, password: string) =>
    api.post<ApiResponse<{ token: string; user: import('../types').User }>>('/auth/login', {
      email,
      password,
    }),

  getMe: () => api.get<ApiResponse<import('../types').User>>('/auth/me'),
};
