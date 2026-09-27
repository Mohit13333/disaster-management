import { Types } from 'mongoose';
import { Disaster, IDisaster } from '../models/Disaster';
import { locationResolverService } from './locationResolver.service';
import { cacheService } from './cache.service';
import { CreateDisasterInput, UpdateDisasterInput } from '../validators/disaster.validator';
import { NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { DisasterStatus } from '../types';

interface GetDisastersFilter {
  tag?: string;
  status?: DisasterStatus;
  page?: string;
  limit?: string;
}

class DisasterService {
  async createDisaster(
    input: CreateDisasterInput,
    userId: string
  ): Promise<IDisaster> {
    let resolvedLocation: { name: string; latitude: number; longitude: number };

    if (input.location) {
      // Explicit location from map picker — skip the text resolver
      resolvedLocation = input.location;
      logger.debug('DisasterService: using explicit location from request', { name: resolvedLocation.name });
    } else {
      // Auto-resolve from description text
      try {
        resolvedLocation = locationResolverService.resolve(input.description);
      } catch (error) {
        throw new ValidationError(
          error instanceof Error ? error.message : 'Could not resolve location from description'
        );
      }
    }

    const disaster = new Disaster({
      title: input.title,
      description: input.description,
      location: {
        name: resolvedLocation.name,
        type: 'Point',
        coordinates: [resolvedLocation.longitude, resolvedLocation.latitude],
      },
      tags: input.tags ?? [],
      status: input.status ?? 'ACTIVE',
      createdBy: new Types.ObjectId(userId),
    });

    await disaster.save();
    logger.info('DisasterService: created disaster', { id: disaster._id, title: disaster.title });

    return disaster;
  }

  async getDisasters(filter: GetDisastersFilter): Promise<{
    disasters: IDisaster[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query: Record<string, unknown> = {};

    if (filter.tag) {
      query['tags'] = { $in: [filter.tag] };
    }
    if (filter.status) {
      query['status'] = filter.status;
    }

    const page = Math.max(1, parseInt(filter.page ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(filter.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const [disasters, total] = await Promise.all([
      Disaster.find(query)
        .populate('createdBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Disaster.countDocuments(query),
    ]);

    return { disasters, total, page, limit };
  }

  async getDisasterById(id: string): Promise<IDisaster> {
    const disaster = await Disaster.findById(id).populate('createdBy', 'name email role');
    if (!disaster) {
      throw new NotFoundError(`Disaster with id ${id} not found`);
    }
    return disaster;
  }

  async updateDisaster(id: string, input: UpdateDisasterInput): Promise<IDisaster> {
    const disaster = await Disaster.findById(id);
    if (!disaster) {
      throw new NotFoundError(`Disaster with id ${id} not found`);
    }

    // If description changed, re-resolve location
    if (input.description && input.description !== disaster.description) {
      try {
        const resolvedLocation = locationResolverService.resolve(input.description);
        disaster.location = {
          name: resolvedLocation.name,
          type: 'Point',
          coordinates: [resolvedLocation.longitude, resolvedLocation.latitude],
        };
      } catch {
        // Keep existing location if new description can't be resolved
        logger.warn('DisasterService: could not re-resolve location from updated description');
      }
    }

    if (input.title !== undefined) disaster.title = input.title;
    if (input.description !== undefined) disaster.description = input.description;
    if (input.tags !== undefined) disaster.tags = input.tags;
    if (input.status !== undefined) disaster.status = input.status;

    await disaster.save();

    // Invalidate reports cache for this disaster
    await cacheService.delete(`reports:disaster:${id}`);
    logger.info('DisasterService: updated disaster', { id });

    return disaster;
  }

  async deleteDisaster(id: string): Promise<void> {
    const disaster = await Disaster.findById(id);
    if (!disaster) {
      throw new NotFoundError(`Disaster with id ${id} not found`);
    }

    await Disaster.findByIdAndDelete(id);
    await cacheService.delete(`reports:disaster:${id}`);
    logger.info('DisasterService: deleted disaster', { id });
  }

  async getStats(): Promise<{ total: number; active: number; resolved: number }> {
    const [total, active] = await Promise.all([
      Disaster.countDocuments(),
      Disaster.countDocuments({ status: 'ACTIVE' }),
    ]);

    return { total, active, resolved: total - active };
  }
}

export const disasterService = new DisasterService();
