import { ResolvedLocation } from '../types';
import { logger } from '../utils/logger';

/**
 * LocationResolverService
 *
 * Currently uses a deterministic mock resolver with a curated list of known locations.
 * This is intentional — the assignment does not require a paid geocoding API.
 *
 * To integrate a real provider (e.g., Google Maps Geocoding, Mapbox, OpenStreetMap Nominatim):
 * 1. Implement a new class that extends LocationResolver interface
 * 2. Replace the mock lookup with an HTTP call to the provider
 * 3. Inject the new implementation via dependency injection or environment config
 *
 * The interface contract remains the same regardless of provider.
 */

interface LocationEntry {
  keywords: string[];
  name: string;
  latitude: number;
  longitude: number;
}

const LOCATION_DATABASE: LocationEntry[] = [
  // ── United States ──────────────────────────────────────────────────
  { keywords: ['manhattan', 'new york city', 'nyc'], name: 'Manhattan, New York City', latitude: 40.7128, longitude: -74.006 },
  { keywords: ['brooklyn', 'bronx', 'queens', 'staten island', 'new york'], name: 'New York City', latitude: 40.7128, longitude: -74.006 },
  { keywords: ['los angeles', 'southern california'], name: 'Los Angeles, California', latitude: 34.0522, longitude: -118.2437 },
  { keywords: ['san francisco', 'bay area'], name: 'San Francisco, California', latitude: 37.7749, longitude: -122.4194 },
  { keywords: ['chicago'], name: 'Chicago, Illinois', latitude: 41.8781, longitude: -87.6298 },
  { keywords: ['houston', 'texas'], name: 'Houston, Texas', latitude: 29.7604, longitude: -95.3698 },
  { keywords: ['miami', 'florida'], name: 'Miami, Florida', latitude: 25.7617, longitude: -80.1918 },
  { keywords: ['seattle', 'washington state'], name: 'Seattle, Washington', latitude: 47.6062, longitude: -122.3321 },
  { keywords: ['phoenix', 'arizona'], name: 'Phoenix, Arizona', latitude: 33.4484, longitude: -112.074 },
  { keywords: ['philadelphia', 'philly'], name: 'Philadelphia, Pennsylvania', latitude: 39.9526, longitude: -75.1652 },
  { keywords: ['san antonio'], name: 'San Antonio, Texas', latitude: 29.4241, longitude: -98.4936 },
  { keywords: ['san diego'], name: 'San Diego, California', latitude: 32.7157, longitude: -117.1611 },
  { keywords: ['dallas', 'fort worth', 'dfw'], name: 'Dallas, Texas', latitude: 32.7767, longitude: -96.797 },
  { keywords: ['san jose'], name: 'San Jose, California', latitude: 37.3382, longitude: -121.8863 },
  { keywords: ['austin'], name: 'Austin, Texas', latitude: 30.2672, longitude: -97.7431 },
  { keywords: ['jacksonville'], name: 'Jacksonville, Florida', latitude: 30.3322, longitude: -81.6557 },
  { keywords: ['columbus', 'ohio'], name: 'Columbus, Ohio', latitude: 39.9612, longitude: -82.9988 },
  { keywords: ['charlotte', 'north carolina'], name: 'Charlotte, North Carolina', latitude: 35.2271, longitude: -80.8431 },
  { keywords: ['indianapolis', 'indiana'], name: 'Indianapolis, Indiana', latitude: 39.7684, longitude: -86.1581 },
  { keywords: ['denver', 'colorado'], name: 'Denver, Colorado', latitude: 39.7392, longitude: -104.9903 },
  { keywords: ['nashville', 'tennessee'], name: 'Nashville, Tennessee', latitude: 36.1627, longitude: -86.7816 },
  { keywords: ['boston', 'massachusetts'], name: 'Boston, Massachusetts', latitude: 42.3601, longitude: -71.0589 },
  { keywords: ['portland', 'oregon'], name: 'Portland, Oregon', latitude: 45.5051, longitude: -122.675 },
  { keywords: ['las vegas', 'nevada'], name: 'Las Vegas, Nevada', latitude: 36.1699, longitude: -115.1398 },
  { keywords: ['new orleans', 'louisiana'], name: 'New Orleans, Louisiana', latitude: 29.9511, longitude: -90.0715 },
  { keywords: ['atlanta', 'georgia'], name: 'Atlanta, Georgia', latitude: 33.749, longitude: -84.388 },
  { keywords: ['detroit', 'michigan'], name: 'Detroit, Michigan', latitude: 42.3314, longitude: -83.0458 },
  { keywords: ['minneapolis', 'minnesota'], name: 'Minneapolis, Minnesota', latitude: 44.9778, longitude: -93.265 },
  { keywords: ['california'], name: 'California, USA', latitude: 36.7783, longitude: -119.4179 },
  { keywords: ['gulf coast'], name: 'Gulf Coast, USA', latitude: 29.0, longitude: -90.0 },
  { keywords: ['puerto rico'], name: 'Puerto Rico', latitude: 18.2208, longitude: -66.5901 },
  { keywords: ['hawaii', 'honolulu'], name: 'Hawaii, USA', latitude: 21.3069, longitude: -157.8583 },
  { keywords: ['alaska', 'anchorage'], name: 'Alaska, USA', latitude: 61.2181, longitude: -149.9003 },

  // ── India ──────────────────────────────────────────────────────────
  { keywords: ['mumbai', 'bombay'], name: 'Mumbai, India', latitude: 19.076, longitude: 72.8777 },
  { keywords: ['delhi', 'new delhi'], name: 'Delhi, India', latitude: 28.7041, longitude: 77.1025 },
  { keywords: ['bangalore', 'bengaluru'], name: 'Bangalore, India', latitude: 12.9716, longitude: 77.5946 },
  { keywords: ['chennai', 'madras'], name: 'Chennai, India', latitude: 13.0827, longitude: 80.2707 },
  { keywords: ['kolkata', 'calcutta'], name: 'Kolkata, India', latitude: 22.5726, longitude: 88.3639 },
  { keywords: ['hyderabad'], name: 'Hyderabad, India', latitude: 17.385, longitude: 78.4867 },
  { keywords: ['pune'], name: 'Pune, India', latitude: 18.5204, longitude: 73.8567 },
  { keywords: ['ahmedabad', 'gujarat'], name: 'Ahmedabad, India', latitude: 23.0225, longitude: 72.5714 },
  { keywords: ['jaipur', 'rajasthan'], name: 'Jaipur, India', latitude: 26.9124, longitude: 75.7873 },
  { keywords: ['surat'], name: 'Surat, India', latitude: 21.1702, longitude: 72.8311 },
  { keywords: ['lucknow', 'uttar pradesh'], name: 'Lucknow, India', latitude: 26.8467, longitude: 80.9462 },
  { keywords: ['patna', 'bihar'], name: 'Patna, India', latitude: 25.5941, longitude: 85.1376 },
  { keywords: ['bhopal'], name: 'Bhopal, India', latitude: 23.2599, longitude: 77.4126 },
  { keywords: ['kerala'], name: 'Kerala, India', latitude: 10.8505, longitude: 76.2711 },
  { keywords: ['assam', 'guwahati'], name: 'Assam, India', latitude: 26.1445, longitude: 91.7362 },
  { keywords: ['odisha', 'bhubaneswar'], name: 'Odisha, India', latitude: 20.2961, longitude: 85.8245 },

  // ── Europe ────────────────────────────────────────────────────────
  { keywords: ['london', 'uk', 'united kingdom', 'england'], name: 'London, UK', latitude: 51.5074, longitude: -0.1278 },
  { keywords: ['paris', 'france'], name: 'Paris, France', latitude: 48.8566, longitude: 2.3522 },
  { keywords: ['berlin', 'germany'], name: 'Berlin, Germany', latitude: 52.52, longitude: 13.405 },
  { keywords: ['madrid', 'spain'], name: 'Madrid, Spain', latitude: 40.4168, longitude: -3.7038 },
  { keywords: ['rome', 'italy'], name: 'Rome, Italy', latitude: 41.9028, longitude: 12.4964 },
  { keywords: ['amsterdam', 'netherlands'], name: 'Amsterdam, Netherlands', latitude: 52.3676, longitude: 4.9041 },
  { keywords: ['brussels', 'belgium'], name: 'Brussels, Belgium', latitude: 50.8503, longitude: 4.3517 },
  { keywords: ['vienna', 'austria'], name: 'Vienna, Austria', latitude: 48.2082, longitude: 16.3738 },
  { keywords: ['zurich', 'switzerland'], name: 'Zurich, Switzerland', latitude: 47.3769, longitude: 8.5417 },
  { keywords: ['stockholm', 'sweden'], name: 'Stockholm, Sweden', latitude: 59.3293, longitude: 18.0686 },
  { keywords: ['oslo', 'norway'], name: 'Oslo, Norway', latitude: 59.9139, longitude: 10.7522 },
  { keywords: ['athens', 'greece'], name: 'Athens, Greece', latitude: 37.9838, longitude: 23.7275 },
  { keywords: ['istanbul', 'turkey'], name: 'Istanbul, Turkey', latitude: 41.0082, longitude: 28.9784 },
  { keywords: ['warsaw', 'poland'], name: 'Warsaw, Poland', latitude: 52.2297, longitude: 21.0122 },
  { keywords: ['kyiv', 'ukraine'], name: 'Kyiv, Ukraine', latitude: 50.4501, longitude: 30.5234 },
  { keywords: ['lisbon', 'portugal'], name: 'Lisbon, Portugal', latitude: 38.7169, longitude: -9.1399 },

  // ── Asia-Pacific ──────────────────────────────────────────────────
  { keywords: ['tokyo', 'japan'], name: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503 },
  { keywords: ['osaka'], name: 'Osaka, Japan', latitude: 34.6937, longitude: 135.5022 },
  { keywords: ['beijing', 'china'], name: 'Beijing, China', latitude: 39.9042, longitude: 116.4074 },
  { keywords: ['shanghai'], name: 'Shanghai, China', latitude: 31.2304, longitude: 121.4737 },
  { keywords: ['hong kong'], name: 'Hong Kong', latitude: 22.3193, longitude: 114.1694 },
  { keywords: ['singapore'], name: 'Singapore', latitude: 1.3521, longitude: 103.8198 },
  { keywords: ['bangkok', 'thailand'], name: 'Bangkok, Thailand', latitude: 13.7563, longitude: 100.5018 },
  { keywords: ['jakarta', 'indonesia'], name: 'Jakarta, Indonesia', latitude: -6.2088, longitude: 106.8456 },
  { keywords: ['manila', 'philippines'], name: 'Manila, Philippines', latitude: 14.5995, longitude: 120.9842 },
  { keywords: ['kuala lumpur', 'malaysia'], name: 'Kuala Lumpur, Malaysia', latitude: 3.139, longitude: 101.6869 },
  { keywords: ['ho chi minh', 'vietnam', 'hanoi'], name: 'Ho Chi Minh City, Vietnam', latitude: 10.8231, longitude: 106.6297 },
  { keywords: ['taipei', 'taiwan'], name: 'Taipei, Taiwan', latitude: 25.0329, longitude: 121.5654 },
  { keywords: ['seoul', 'korea'], name: 'Seoul, South Korea', latitude: 37.5665, longitude: 126.978 },
  { keywords: ['sydney', 'australia'], name: 'Sydney, Australia', latitude: -33.8688, longitude: 151.2093 },
  { keywords: ['melbourne'], name: 'Melbourne, Australia', latitude: -37.8136, longitude: 144.9631 },
  { keywords: ['auckland', 'new zealand'], name: 'Auckland, New Zealand', latitude: -36.8509, longitude: 174.7645 },
  { keywords: ['karachi', 'pakistan'], name: 'Karachi, Pakistan', latitude: 24.8607, longitude: 67.0011 },
  { keywords: ['lahore'], name: 'Lahore, Pakistan', latitude: 31.5204, longitude: 74.3587 },
  { keywords: ['dhaka', 'bangladesh'], name: 'Dhaka, Bangladesh', latitude: 23.8103, longitude: 90.4125 },
  { keywords: ['colombo', 'sri lanka'], name: 'Colombo, Sri Lanka', latitude: 6.9271, longitude: 79.8612 },
  { keywords: ['kathmandu', 'nepal'], name: 'Kathmandu, Nepal', latitude: 27.7172, longitude: 85.324 },

  // ── Middle East & Africa ──────────────────────────────────────────
  { keywords: ['dubai', 'uae', 'abu dhabi'], name: 'Dubai, UAE', latitude: 25.2048, longitude: 55.2708 },
  { keywords: ['riyadh', 'saudi arabia'], name: 'Riyadh, Saudi Arabia', latitude: 24.7136, longitude: 46.6753 },
  { keywords: ['cairo', 'egypt'], name: 'Cairo, Egypt', latitude: 30.0444, longitude: 31.2357 },
  { keywords: ['nairobi', 'kenya'], name: 'Nairobi, Kenya', latitude: -1.2921, longitude: 36.8219 },
  { keywords: ['lagos', 'nigeria'], name: 'Lagos, Nigeria', latitude: 6.5244, longitude: 3.3792 },
  { keywords: ['johannesburg', 'south africa'], name: 'Johannesburg, South Africa', latitude: -26.2041, longitude: 28.0473 },
  { keywords: ['cape town'], name: 'Cape Town, South Africa', latitude: -33.9249, longitude: 18.4241 },
  { keywords: ['addis ababa', 'ethiopia'], name: 'Addis Ababa, Ethiopia', latitude: 9.145, longitude: 40.4897 },
  { keywords: ['accra', 'ghana'], name: 'Accra, Ghana', latitude: 5.6037, longitude: -0.187 },
  { keywords: ['dar es salaam', 'tanzania'], name: 'Dar es Salaam, Tanzania', latitude: -6.7924, longitude: 39.2083 },

  // ── Latin America ─────────────────────────────────────────────────
  { keywords: ['sao paulo', 'brazil'], name: 'São Paulo, Brazil', latitude: -23.5505, longitude: -46.6333 },
  { keywords: ['rio de janeiro', 'rio'], name: 'Rio de Janeiro, Brazil', latitude: -22.9068, longitude: -43.1729 },
  { keywords: ['buenos aires', 'argentina'], name: 'Buenos Aires, Argentina', latitude: -34.6037, longitude: -58.3816 },
  { keywords: ['bogota', 'colombia'], name: 'Bogotá, Colombia', latitude: 4.711, longitude: -74.0721 },
  { keywords: ['lima', 'peru'], name: 'Lima, Peru', latitude: -12.0464, longitude: -77.0428 },
  { keywords: ['santiago', 'chile'], name: 'Santiago, Chile', latitude: -33.4489, longitude: -70.6693 },
  { keywords: ['mexico city', 'mexico'], name: 'Mexico City, Mexico', latitude: 19.4326, longitude: -99.1332 },
  { keywords: ['caracas', 'venezuela'], name: 'Caracas, Venezuela', latitude: 10.4806, longitude: -66.9036 },
  { keywords: ['quito', 'ecuador'], name: 'Quito, Ecuador', latitude: -0.1807, longitude: -78.4678 },
  { keywords: ['havana', 'cuba'], name: 'Havana, Cuba', latitude: 23.1136, longitude: -82.3666 },

  // ── Canada ────────────────────────────────────────────────────────
  { keywords: ['toronto', 'canada'], name: 'Toronto, Canada', latitude: 43.6532, longitude: -79.3832 },
  { keywords: ['vancouver', 'british columbia'], name: 'Vancouver, Canada', latitude: 49.2827, longitude: -123.1207 },
  { keywords: ['montreal', 'quebec'], name: 'Montreal, Canada', latitude: 45.5017, longitude: -73.5673 },
  { keywords: ['calgary', 'alberta'], name: 'Calgary, Canada', latitude: 51.0447, longitude: -114.0719 },
  { keywords: ['ottawa'], name: 'Ottawa, Canada', latitude: 45.4215, longitude: -75.6972 },

  // ── Russia & Central Asia ─────────────────────────────────────────
  { keywords: ['moscow', 'russia'], name: 'Moscow, Russia', latitude: 55.7558, longitude: 37.6173 },
  { keywords: ['st. petersburg', 'saint petersburg'], name: 'Saint Petersburg, Russia', latitude: 59.9311, longitude: 30.3609 },

  // ── Generic regions ───────────────────────────────────────────────
  { keywords: ['pacific northwest'], name: 'Pacific Northwest, USA', latitude: 46.0, longitude: -122.0 },
  { keywords: ['midwest'], name: 'Midwest, USA', latitude: 41.0, longitude: -93.0 },
  { keywords: ['southeast asia'], name: 'Southeast Asia', latitude: 10.0, longitude: 106.0 },
  { keywords: ['caribbean'], name: 'Caribbean', latitude: 18.0, longitude: -70.0 },
  { keywords: ['sahel', 'west africa'], name: 'West Africa', latitude: 12.0, longitude: -2.0 },
];

class LocationResolverService {
  /**
   * Resolves a location from a text description.
   * Searches for known location keywords in the description (case-insensitive).
   *
   * @param description - The disaster description text
   * @returns ResolvedLocation with name, latitude, longitude
   * @throws Error when no recognizable location found
   */
  resolve(description: string): ResolvedLocation {
    let bestMatch: LocationEntry | null = null;
    let maxKeywordLength = 0;

    for (const entry of LOCATION_DATABASE) {
      for (const keyword of entry.keywords) {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (regex.test(description)) {
          if (keyword.length > maxKeywordLength) {
            maxKeywordLength = keyword.length;
            bestMatch = entry;
          }
        }
      }
    }

    if (bestMatch) {
      logger.debug('LocationResolverService: location matched', {
        name: bestMatch.name,
        description: description.substring(0, 80),
      });
      return {
        name: bestMatch.name,
        latitude: bestMatch.latitude,
        longitude: bestMatch.longitude,
      };
    }

    logger.warn('LocationResolverService: no location found in description', {
      description: description.substring(0, 80),
    });

    throw new Error(
      `Unable to resolve location from description. ` +
        `Please include a recognizable location name (city, region) in the description.`
    );
  }

  /**
   * Check if a description contains a resolvable location
   */
  canResolve(description: string): boolean {
    return LOCATION_DATABASE.some((entry) =>
      entry.keywords.some((keyword) => {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        return regex.test(description);
      })
    );
  }
}

export const locationResolverService = new LocationResolverService();
