import { logger } from '../utils/logger';
import { ExternalReport, NormalizedReport } from '../types';

/**
 * MockSocialMediaService
 *
 * Simulates an external social media / community reporting API.
 *
 * In production this would be replaced with real API calls to:
 * - Twitter/X API v2
 * - Facebook Graph API
 * - Nextdoor API
 * - Government emergency alert systems
 *
 * The service supports simulated failure mode for testing:
 * Set MOCK_SOCIAL_FAIL=true in environment to trigger failure.
 *
 * The important engineering concern demonstrated here:
 * 1. External API abstraction (normalized interface)
 * 2. Error isolation (failures don't crash the app)
 * 3. Data normalization (external schema → internal schema)
 * 4. Caching (handled at the caller level via CacheService)
 */

// Mock data pool keyed by location keywords
const MOCK_REPORTS: Record<string, ExternalReport[]> = {
  manhattan: [
    {
      id: 'social-001',
      text: 'Water level is increasing rapidly near Manhattan Bridge. Residents urged to evacuate.',
      author: { username: 'citizen_nyc_01' },
      created_at: '2026-01-01T10:00:00Z',
    },
    {
      id: 'social-002',
      text: 'Flooding in Lower Manhattan. Streets are impassable. Please avoid the area.',
      author: { username: 'nycwatcher' },
      created_at: '2026-01-01T10:30:00Z',
    },
    {
      id: 'social-003',
      text: 'Need drinking water near Manhattan. Emergency shelters are at capacity.',
      author: { username: 'citizen123' },
      created_at: '2026-01-01T11:00:00Z',
    },
  ],
  mumbai: [
    {
      id: 'social-004',
      text: 'Heavy rainfall in Mumbai causing severe waterlogging in Dadar area.',
      author: { username: 'mumbaikar99' },
      created_at: '2026-02-01T08:00:00Z',
    },
    {
      id: 'social-005',
      text: 'Trains delayed due to flooding at Kurla station. Avoid western railway line.',
      author: { username: 'mumbai_local' },
      created_at: '2026-02-01T09:00:00Z',
    },
  ],
  delhi: [
    {
      id: 'social-006',
      text: 'Extreme heat warning in Delhi. Temperatures crossing 48°C. Stay indoors.',
      author: { username: 'delhi_weather' },
      created_at: '2026-05-01T12:00:00Z',
    },
    {
      id: 'social-007',
      text: 'Water scarcity in South Delhi. Municipal supply disrupted for 3 days.',
      author: { username: 'delhicizen' },
      created_at: '2026-05-01T14:00:00Z',
    },
  ],
  california: [
    {
      id: 'social-008',
      text: 'Wildfire spreading rapidly near Riverside County. Evacuation orders issued.',
      author: { username: 'ca_fires_update' },
      created_at: '2026-08-15T16:00:00Z',
    },
    {
      id: 'social-009',
      text: 'Air quality index dangerously high in Southern California due to wildfires.',
      author: { username: 'socal_air' },
      created_at: '2026-08-15T17:30:00Z',
    },
  ],
  chicago: [
    {
      id: 'social-010',
      text: 'Blizzard conditions in Chicago. Avoid all non-essential travel.',
      author: { username: 'chicago_weather' },
      created_at: '2026-01-20T07:00:00Z',
    },
    {
      id: 'social-011',
      text: 'Roads completely iced over on Lake Shore Drive. Multiple accidents reported.',
      author: { username: 'chicagotraffic' },
      created_at: '2026-01-20T08:00:00Z',
    },
  ],
  default: [
    {
      id: 'social-default-001',
      text: 'Emergency services responding to the disaster. Please follow official guidance.',
      author: { username: 'emergency_alerts' },
      created_at: new Date().toISOString(),
    },
    {
      id: 'social-default-002',
      text: 'Community volunteers needed. Check local emergency management website for updates.',
      author: { username: 'community_help' },
      created_at: new Date().toISOString(),
    },
  ],
};

// Failure mode toggle — set via test/dev mechanism
let _shouldFail = false;

class MockSocialMediaService {
  /**
   * Enable failure simulation for testing
   */
  enableFailureMode(): void {
    _shouldFail = true;
  }

  /**
   * Disable failure simulation
   */
  disableFailureMode(): void {
    _shouldFail = false;
  }

  /**
   * Fetch raw reports from the mock external service
   * @param disasterTitle - Used to select contextually relevant mock data
   * @param locationName - Used to generate dynamic mock data for any global location
   * @throws Error when service is in failure mode
   */
  async fetchRawReports(disasterTitle: string, locationName?: string): Promise<ExternalReport[]> {
    logger.info('MockSocialMediaService: fetching external reports', { disasterTitle, locationName });

    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (_shouldFail) {
      logger.error('MockSocialMediaService: simulated external service failure');
      throw new Error('External social media service unavailable (simulated failure)');
    }

    const lowerTitle = disasterTitle.toLowerCase();

    // Find contextually relevant reports from hardcoded pool
    for (const [key, reports] of Object.entries(MOCK_REPORTS)) {
      if (key !== 'default' && lowerTitle.includes(key)) {
        logger.debug('MockSocialMediaService: returning contextual reports', { key });
        return reports;
      }
    }

    // Dynamic generation fallback: Create contextual reports for ANY location
    if (locationName) {
      logger.debug('MockSocialMediaService: generating dynamic location-based reports', { locationName });
      
      // Extract just the city name (before the comma, if any)
      const shortName = locationName.split(',')[0].trim();
      
      return [
        {
          id: `social-dyn-${Date.now()}-1`,
          text: `Emergency services are responding to the situation in ${shortName}. Please avoid the affected areas.`,
          author: { username: `${shortName.toLowerCase().replace(/\s+/g, '_')}_alerts` },
          created_at: new Date().toISOString(),
        },
        {
          id: `social-dyn-${Date.now()}-2`,
          text: `Community volunteers needed near ${locationName}. Check local emergency management channels for updates.`,
          author: { username: `citizen_${shortName.toLowerCase().replace(/\s+/g, '')}` },
          created_at: new Date().toISOString(),
        }
      ];
    }

    logger.debug('MockSocialMediaService: returning default generic reports');
    return MOCK_REPORTS.default;
  }

  /**
   * Normalize external API response to internal format
   * This is the normalization layer — external schema → internal schema
   */
  normalizeReports(rawReports: ExternalReport[]): NormalizedReport[] {
    return rawReports.map((report) => ({
      id: report.id,
      content: report.text,
      user: report.author.username,
      created_at: report.created_at,
    }));
  }
}

export const mockSocialMediaService = new MockSocialMediaService();
