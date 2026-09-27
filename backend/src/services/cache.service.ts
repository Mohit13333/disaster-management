import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from '../utils/logger';

/**
 * CacheService
 *
 * Provides a unified caching interface backed by Redis (via ioredis).
 * Falls back to an in-memory Map when Redis is unavailable.
 *
 * TTL default: 60 seconds
 *
 * Logs:
 * - CACHE_HIT: data served from cache
 * - CACHE_MISS: data not in cache, must fetch
 * - EXTERNAL_FETCH: fetching from external service (logged by caller)
 */

interface InMemoryEntry {
  value: string;
  expiresAt: number;
}

class CacheService {
  private redisClient: Redis | null = null;
  private inMemoryStore = new Map<string, InMemoryEntry>();
  private _usingFallback = false;

  async connect(): Promise<void> {
    if (!config.redisUrl) {
      logger.warn('CacheService: REDIS_URL not set, using in-memory fallback');
      this._usingFallback = true;
      return;
    }

    try {
      this.redisClient = new Redis(config.redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
      });

      this.redisClient.on('error', (err: Error) => {
        if (!this._usingFallback) {
          logger.warn('CacheService: Redis error, switching to in-memory fallback', {
            error: err.message,
          });
          this._usingFallback = true;
          this.redisClient = null;
        }
      });

      await this.redisClient.connect();
      logger.info('CacheService: Redis connected');
    } catch (error) {
      logger.warn('CacheService: Redis unavailable, using in-memory fallback', {
        error: error instanceof Error ? error.message : error,
      });
      this._usingFallback = true;
      this.redisClient = null;
    }
  }

  isUsingFallback(): boolean {
    return this._usingFallback;
  }

  isConnected(): boolean {
    return this.redisClient !== null && !this._usingFallback;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this._usingFallback || !this.redisClient) {
        return this.inMemoryGet<T>(key);
      }

      const value = await this.redisClient.get(key);
      if (value === null) {
        logger.debug('CacheService: CACHE_MISS', { key });
        return null;
      }

      logger.debug('CacheService: CACHE_HIT', { key });
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('CacheService: get error', {
        key,
        error: error instanceof Error ? error.message : error,
      });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    try {
      const serialized = JSON.stringify(value);

      if (this._usingFallback || !this.redisClient) {
        this.inMemorySet(key, serialized, ttlSeconds);
        return;
      }

      await this.redisClient.setex(key, ttlSeconds, serialized);
      logger.debug('CacheService: stored', { key, ttlSeconds });
    } catch (error) {
      logger.error('CacheService: set error', {
        key,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (this._usingFallback || !this.redisClient) {
        this.inMemoryStore.delete(key);
        return;
      }

      await this.redisClient.del(key);
      logger.debug('CacheService: deleted', { key });
    } catch (error) {
      logger.error('CacheService: delete error', {
        key,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      if (this._usingFallback || !this.redisClient) {
        const prefix = pattern.replace('*', '');
        for (const key of this.inMemoryStore.keys()) {
          if (key.startsWith(prefix)) {
            this.inMemoryStore.delete(key);
          }
        }
        return;
      }

      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        logger.debug('CacheService: deleted pattern', { pattern, count: keys.length });
      }
    } catch (error) {
      logger.error('CacheService: deletePattern error', {
        pattern,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  async disconnect(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  private inMemoryGet<T>(key: string): T | null {
    const entry = this.inMemoryStore.get(key);
    if (!entry) {
      logger.debug('CacheService: CACHE_MISS (in-memory)', { key });
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.inMemoryStore.delete(key);
      logger.debug('CacheService: CACHE_MISS (in-memory expired)', { key });
      return null;
    }

    logger.debug('CacheService: CACHE_HIT (in-memory)', { key });
    return JSON.parse(entry.value) as T;
  }

  private inMemorySet(key: string, value: string, ttlSeconds: number): void {
    this.inMemoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}

export const cacheService = new CacheService();
