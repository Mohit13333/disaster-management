import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'ADMIN' | 'CONTRIBUTOR';
export type DisasterStatus = 'ACTIVE' | 'RESOLVED';
export type ResourceType = 'SHELTER' | 'HOSPITAL' | 'FOOD' | 'WATER' | 'RESCUE';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface GeoJsonPoint {
  name: string;
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface ResolvedLocation {
  name: string;
  latitude: number;
  longitude: number;
}

export interface NormalizedReport {
  id: string;
  content: string;
  user: string;
  created_at: string;
}

export interface ExternalReport {
  id: string;
  text: string;
  author: {
    username: string;
  };
  created_at: string;
}

export interface ResourceWithDistance {
  _id: Types.ObjectId;
  name: string;
  type: ResourceType;
  location: GeoJsonPoint;
  distance_km: number;
  createdAt: Date;
  updatedAt: Date;
}
