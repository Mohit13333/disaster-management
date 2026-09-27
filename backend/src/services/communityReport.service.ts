import { mockSocialMediaService } from './mockSocialMedia.service';
import { cacheService } from './cache.service';
import { disasterService } from './disaster.service';
import { NormalizedReport } from '../types';
import { ExternalServiceError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

const REPORTS_CACHE_TTL = 60; // 60 seconds

class CommunityReportService {
  /**
   * Get community reports for a disaster.
   *
   * Flow:
   * 1. Verify disaster exists
   * 2. Generate cache key: reports:disaster:<disasterId>
   * 3. Check Redis/in-memory cache (CACHE_HIT → return)
   * 4. CACHE_MISS → fetch from external service
   * 5. Normalize external response to internal format
   * 6. Store in cache with 60s TTL
   * 7. Return normalized reports
   *
   * Failure handling:
   * - External service failure is caught and re-thrown as ExternalServiceError
   * - This prevents crashes and returns a controlled 503 response
   */
  async getReportsForDisaster(disasterId: string): Promise<NormalizedReport[]> {
    // Verify disaster exists first
    const disaster = await disasterService.getDisasterById(disasterId);

    const cacheKey = `reports:disaster:${disasterId}`;

    // Check cache
    const cached = await cacheService.get<NormalizedReport[]>(cacheKey);
    if (cached !== null) {
      logger.info('CommunityReportService: CACHE_HIT', { cacheKey });
      return cached;
    }

    logger.info('CommunityReportService: CACHE_MISS, fetching from external service', { cacheKey });

    // Fetch from external service
    let normalizedReports: NormalizedReport[];
    try {
      logger.info('CommunityReportService: EXTERNAL_FETCH', { disaster: disaster.title, location: disaster.location.name });
      const rawReports = await mockSocialMediaService.fetchRawReports(disaster.title, disaster.location.name);
      normalizedReports = mockSocialMediaService.normalizeReports(rawReports);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown external service error';
      logger.error('CommunityReportService: external service failed', { error: message });
      throw new ExternalServiceError(
        `Could not fetch community reports: ${message}`
      );
    }

    // Store in cache
    await cacheService.set(cacheKey, normalizedReports, REPORTS_CACHE_TTL);
    logger.info('CommunityReportService: stored in cache', { cacheKey, ttl: REPORTS_CACHE_TTL });

    return normalizedReports;
  }

  /**
   * Invalidate cache for a specific disaster's reports
   */
  async invalidateCache(disasterId: string): Promise<void> {
    await cacheService.delete(`reports:disaster:${disasterId}`);
  }
}

export const communityReportService = new CommunityReportService();
