import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { cacheService } from '../services/cache.service';
import { successResponse } from '../utils/apiResponse';

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: API health check
 *     responses:
 *       200:
 *         description: Health status of all services
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     services:
 *                       type: object
 *                       properties:
 *                         mongodb:
 *                           type: string
 *                         redis:
 *                           type: string
 */
router.get('/', (req: Request, res: Response) => {
  const mongoState = mongoose.connection.readyState;
  const mongoStatus =
    mongoState === 1 ? 'connected' : mongoState === 2 ? 'connecting' : 'disconnected';

  const redisStatus = cacheService.isUsingFallback()
    ? 'unavailable (using in-memory fallback)'
    : cacheService.isConnected()
    ? 'connected'
    : 'disconnected';

  res.status(200).json(
    successResponse(
      {
        services: {
          mongodb: mongoStatus,
          redis: redisStatus,
        },
        uptime: Math.floor(process.uptime()),
      },
      'API is healthy'
    )
  );
});

export default router;
