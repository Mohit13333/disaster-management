import mongoose, { Document, Schema } from 'mongoose';
import { ResourceType } from '../types';

export interface IResourceLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IResource extends Document {
  name: string;
  type: ResourceType;
  location: IResourceLocation;
  createdAt: Date;
  updatedAt: Date;
}

const resourceLocationSchema = new Schema<IResourceLocation>(
  {
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

const resourceSchema = new Schema<IResource>(
  {
    name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    type: {
      type: String,
      enum: ['SHELTER', 'HOSPITAL', 'FOOD', 'WATER', 'RESCUE'],
      required: [true, 'Resource type is required'],
    },
    location: {
      type: resourceLocationSchema,
      required: [true, 'Location is required'],
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for geospatial queries using $near / $geoNear
resourceSchema.index({ location: '2dsphere' });

export const Resource = mongoose.model<IResource>('Resource', resourceSchema);
