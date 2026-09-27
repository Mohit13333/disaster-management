import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z.string().refine(
  (val) => Types.ObjectId.isValid(val),
  { message: 'Invalid MongoDB ObjectId' }
);

export const createDisasterSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
    description: z.string().min(1, 'Description is required').max(2000, 'Description too long').trim(),
    tags: z.array(z.string().trim()).optional().default([]),
    status: z.enum(['ACTIVE', 'RESOLVED']).optional().default('ACTIVE'),
    // Optional explicit location — when provided, skips the text resolver
    location: z.object({
      name: z.string().min(1).max(300),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }).optional(),
  }),
});

export const updateDisasterSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z
    .object({
      title: z.string().min(1).max(200).trim().optional(),
      description: z.string().min(1).max(2000).trim().optional(),
      tags: z.array(z.string().trim()).optional(),
      status: z.enum(['ACTIVE', 'RESOLVED']).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Update payload cannot be empty',
    }),
});

export const disasterIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const getDisastersSchema = z.object({
  query: z.object({
    tag: z.string().optional(),
    status: z.enum(['ACTIVE', 'RESOLVED']).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const nearbyResourcesSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  query: z.object({
    lat: z.string().refine((v) => !isNaN(parseFloat(v)), { message: 'lat must be a number' }),
    lng: z.string().refine((v) => !isNaN(parseFloat(v)), { message: 'lng must be a number' }),
    radius: z
      .string()
      .optional()
      .default('10')
      .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, {
        message: 'radius must be a positive number',
      }),
  }),
});

export type CreateDisasterInput = z.infer<typeof createDisasterSchema>['body'];
export type UpdateDisasterInput = z.infer<typeof updateDisasterSchema>['body'];
export type ExplicitLocation = NonNullable<CreateDisasterInput['location']>;
