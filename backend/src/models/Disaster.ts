import mongoose, { Document, Schema, Types } from 'mongoose';
import { DisasterStatus } from '../types';

export interface IDisasterLocation {
  name: string;
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IDisaster extends Document {
  title: string;
  description: string;
  location: IDisasterLocation;
  tags: string[];
  status: DisasterStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const disasterLocationSchema = new Schema<IDisasterLocation>(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) => v.length === 2,
        message: 'Coordinates must be [longitude, latitude]',
      },
    },
  },
  { _id: false }
);

const disasterSchema = new Schema<IDisaster>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    location: {
      type: disasterLocationSchema,
      required: [true, 'Location is required'],
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED'],
      default: 'ACTIVE',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for geospatial queries
disasterSchema.index({ 'location': '2dsphere' });
disasterSchema.index({ status: 1 });
disasterSchema.index({ tags: 1 });

export const Disaster = mongoose.model<IDisaster>('Disaster', disasterSchema);
