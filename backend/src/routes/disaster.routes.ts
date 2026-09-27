import { Router } from 'express';
import { disasterController } from '../controllers/disaster.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createDisasterSchema,
  updateDisasterSchema,
  disasterIdSchema,
  getDisastersSchema,
  nearbyResourcesSchema,
} from '../validators/disaster.validator';

const router = Router();

/**
 * @openapi
 * /api/disasters/stats:
 *   get:
 *     tags: [Disasters]
 *     summary: Get disaster statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics
 */
router.get('/stats', authenticate, disasterController.getStats.bind(disasterController));

/**
 * @openapi
 * /api/disasters:
 *   get:
 *     tags: [Disasters]
 *     summary: Get all disasters with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by tag (e.g. flood)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, RESOLVED]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of disasters
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         disasters:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Disaster'
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 */
router.get(
  '/',
  authenticate,
  validate(getDisastersSchema),
  disasterController.getAll.bind(disasterController)
);

/**
 * @openapi
 * /api/disasters:
 *   post:
 *     tags: [Disasters]
 *     summary: Create a new disaster (ADMIN or CONTRIBUTOR)
 *     description: The backend automatically resolves location from the description. Do not provide lat/lng manually.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Heavy Flooding in Manhattan
 *               description:
 *                 type: string
 *                 example: Heavy flooding has affected Manhattan, NYC. Residents in low-lying areas are urged to evacuate.
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [flood, emergency]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, RESOLVED]
 *                 default: ACTIVE
 *     responses:
 *       201:
 *         description: Disaster created
 *       400:
 *         description: Validation error or unresolvable location
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'CONTRIBUTOR'),
  validate(createDisasterSchema),
  disasterController.create.bind(disasterController)
);

/**
 * @openapi
 * /api/disasters/{id}:
 *   get:
 *     tags: [Disasters]
 *     summary: Get a specific disaster by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId
 *     responses:
 *       200:
 *         description: Disaster details
 *       404:
 *         description: Not found
 */
router.get(
  '/:id',
  authenticate,
  validate(disasterIdSchema),
  disasterController.getOne.bind(disasterController)
);

/**
 * @openapi
 * /api/disasters/{id}:
 *   patch:
 *     tags: [Disasters]
 *     summary: Update a disaster (ADMIN or CONTRIBUTOR)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, RESOLVED]
 *     responses:
 *       200:
 *         description: Updated disaster
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.patch(
  '/:id',
  authenticate,
  authorize('ADMIN', 'CONTRIBUTOR'),
  validate(updateDisasterSchema),
  disasterController.update.bind(disasterController)
);

/**
 * @openapi
 * /api/disasters/{id}:
 *   delete:
 *     tags: [Disasters]
 *     summary: Delete a disaster (ADMIN only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 *       403:
 *         description: Forbidden - only ADMIN can delete
 *       404:
 *         description: Not found
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(disasterIdSchema),
  disasterController.delete.bind(disasterController)
);

/**
 * @openapi
 * /api/disasters/{id}/resources:
 *   get:
 *     tags: [Disasters]
 *     summary: Get nearby resources for a disaster using MongoDB geospatial query
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         example: 40.7128
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         example: -74.0060
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 10
 *         description: Radius in kilometers
 *     responses:
 *       200:
 *         description: Nearby resources with distance in km
 *       400:
 *         description: Missing or invalid query params
 *       404:
 *         description: Disaster not found
 */
router.get(
  '/:id/resources',
  authenticate,
  validate(nearbyResourcesSchema),
  disasterController.getNearbyResources.bind(disasterController)
);

/**
 * @openapi
 * /api/disasters/{id}/reports:
 *   get:
 *     tags: [Disasters]
 *     summary: Get community reports for a disaster (cached 60s)
 *     description: |
 *       Fetches community reports from the mock social media service.
 *       Results are cached in Redis (or in-memory fallback) for 60 seconds.
 *       Cache key: reports:disaster:<disasterId>
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Community reports
 *       404:
 *         description: Disaster not found
 *       503:
 *         description: External service unavailable
 */
router.get(
  '/:id/reports',
  authenticate,
  validate(disasterIdSchema),
  disasterController.getCommunityReports.bind(disasterController)
);

export default router;
