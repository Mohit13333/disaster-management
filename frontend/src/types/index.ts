export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CONTRIBUTOR';
  createdAt: string;
  updatedAt: string;
}

export interface DisasterLocation {
  name: string;
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export type DisasterStatus = 'ACTIVE' | 'RESOLVED';

export interface Disaster {
  _id: string;
  title: string;
  description: string;
  location: DisasterLocation;
  tags: string[];
  status: DisasterStatus;
  createdBy: User | string;
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  _id: string;
  name: string;
  type: 'SHELTER' | 'HOSPITAL' | 'FOOD' | 'WATER' | 'RESCUE';
  location: { type: 'Point'; coordinates: [number, number] };
  distance_km?: number;
}

export interface Report {
  id: string;
  content: string;
  user: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginatedDisasters {
  disasters: Disaster[];
  total: number;
  page: number;
  limit: number;
}

export interface DisasterStats {
  total: number;
  active: number;
  resolved: number;
}

export interface SocketDisasterEvent {
  action: 'created' | 'updated' | 'deleted';
  disaster: {
    id: string;
    title?: string;
    status?: DisasterStatus;
  };
}
