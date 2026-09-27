import { Resource, IResource } from '../models/Resource';
import { logger } from '../utils/logger';

interface NearbyResourceResult {
  _id: unknown;
  name: string;
  type: string;
  location: IResource['location'];
  distance_km: number;
  createdAt: Date;
  updatedAt: Date;
}

class ResourceService {
  /**
   * Find resources within a given radius using MongoDB geospatial aggregation.
   *
   * Uses $geoNear aggregation stage which:
   * 1. Leverages the 2dsphere index on location field
   * 2. Performs server-side distance calculations (not in JS)
   * 3. Sorts results by distance automatically
   * 4. Returns distance in meters (converted to km for API response)
   *
   * This is more efficient than fetching all resources and filtering in application code.
   *
   * @param lat - Latitude of the query point
   * @param lng - Longitude of the query point
   * @param radiusKm - Search radius in kilometers
   */
  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number
  ): Promise<NearbyResourceResult[]> {
    const radiusMeters = radiusKm * 1000; // Convert km to meters for MongoDB

    logger.debug('ResourceService: finding nearby resources', {
      lat, lng, radiusKm, radiusMeters,
    });

    const results = await Resource.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng, lat], // MongoDB uses [longitude, latitude]
          },
          distanceField: 'distance_meters',
          maxDistance: radiusMeters,
          spherical: true, // Required for 2dsphere index
          query: {}, // Can add type filter here if needed
        },
      },
      {
        $project: {
          name: 1,
          type: 1,
          location: 1,
          createdAt: 1,
          updatedAt: 1,
          distance_km: { $round: [{ $divide: ['$distance_meters', 1000] }, 2] },
        },
      },
    ]);

    logger.debug('ResourceService: found resources', { count: results.length });
    return results as NearbyResourceResult[];
  }
}

export const resourceService = new ResourceService();
