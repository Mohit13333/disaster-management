import { Request, Response, NextFunction } from 'express';
import { Server as SocketServer } from 'socket.io';
import { disasterService } from '../services/disaster.service';
import { resourceService } from '../services/resource.service';
import { communityReportService } from '../services/communityReport.service';
import { successResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

let io: SocketServer | null = null;

export function setSocketServer(socketServer: SocketServer): void {
  io = socketServer;
}

function emitDisasterEvent(action: 'created' | 'updated' | 'deleted', disaster: Record<string, unknown>): void {
  if (!io) return;
  io.emit('disaster_updated', {
    action,
    disaster: {
      id: disaster._id,
      title: disaster.title,
      status: disaster.status,
      location: disaster.location,
    },
  });
  logger.debug('Socket.IO: emitted disaster_updated', { action });
}

class DisasterController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthenticatedRequest).user!.userId;
      const disaster = await disasterService.createDisaster(req.body, userId);

      emitDisasterEvent('created', disaster.toObject());

      res.status(201).json(successResponse(disaster, 'Disaster created successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tag, status, page, limit } = req.query as Record<string, string | undefined>;
      const result = await disasterService.getDisasters({ tag, status: status as 'ACTIVE' | 'RESOLVED' | undefined, page, limit });

      res.status(200).json(
        successResponse(result, 'Disasters fetched successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const disaster = await disasterService.getDisasterById(req.params.id);
      res.status(200).json(successResponse(disaster, 'Disaster fetched successfully'));
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const disaster = await disasterService.updateDisaster(req.params.id, req.body);

      emitDisasterEvent('updated', disaster.toObject());

      res.status(200).json(successResponse(disaster, 'Disaster updated successfully'));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await disasterService.deleteDisaster(req.params.id);

      if (io) {
        io.emit('disaster_updated', {
          action: 'deleted',
          disaster: { id: req.params.id },
        });
      }

      res.status(200).json(successResponse(null, 'Disaster deleted successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getNearbyResources(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lat, lng, radius } = req.query as Record<string, string>;

      // Verify disaster exists
      await disasterService.getDisasterById(req.params.id);

      const resources = await resourceService.findNearby(
        parseFloat(lat),
        parseFloat(lng),
        parseFloat(radius ?? '10')
      );

      res.status(200).json(successResponse(resources, 'Nearby resources fetched successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getCommunityReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reports = await communityReportService.getReportsForDisaster(req.params.id);
      res.status(200).json(successResponse(reports, 'Community reports fetched successfully'));
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await disasterService.getStats();
      res.status(200).json(successResponse(stats, 'Stats fetched successfully'));
    } catch (error) {
      next(error);
    }
  }
}

export const disasterController = new DisasterController();
