import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { Disaster } from '../src/models/Disaster';
import { cacheService } from '../src/services/cache.service';
import { mockSocialMediaService } from '../src/services/mockSocialMedia.service';

const app = createApp();

let adminToken: string;
let contributorToken: string;
let testDisasterId: string;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  await cacheService.connect();

  // Create test users
  const adminHash = await bcrypt.hash('admin123', 12);
  const contributorHash = await bcrypt.hash('contributor123', 12);

  await User.deleteMany({});
  await Disaster.deleteMany({});

  await User.insertMany([
    { name: 'Admin', email: 'admin@example.com', passwordHash: adminHash, role: 'ADMIN' },
    {
      name: 'Contributor',
      email: 'contributor@example.com',
      passwordHash: contributorHash,
      role: 'CONTRIBUTOR',
    },
  ]);

  // Login admin
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'admin123' });
  adminToken = adminLogin.body.data.token;

  // Login contributor
  const contributorLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'contributor@example.com', password: 'contributor123' });
  contributorToken = contributorLogin.body.data.token;

  // Create a test disaster
  const disaster = await request(app)
    .post('/api/disasters')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Manhattan Flood Test',
      description: 'Flooding in Manhattan, NYC causing widespread damage.',
      tags: ['flood', 'test'],
      status: 'ACTIVE',
    });
  testDisasterId = disaster.body.data._id;
});

afterAll(async () => {
  await User.deleteMany({});
  await Disaster.deleteMany({});
  await mongoose.disconnect();
  await cacheService.disconnect();
});

// ============================================================
// TEST 1: GET /api/disasters returns 200
// ============================================================
describe('Test 1: GET /api/disasters - API success', () => {
  it('should return 200 with disasters array', async () => {
    const res = await request(app)
      .get('/api/disasters')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Disasters fetched successfully');
    expect(res.body.data).toHaveProperty('disasters');
    expect(Array.isArray(res.body.data.disasters)).toBe(true);
  });

  it('should filter by status', async () => {
    const res = await request(app)
      .get('/api/disasters?status=ACTIVE')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.disasters.every((d: { status: string }) => d.status === 'ACTIVE')).toBe(
      true
    );
  });

  it('should filter by tag', async () => {
    const res = await request(app)
      .get('/api/disasters?tag=flood')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(
      res.body.data.disasters.every((d: { tags: string[] }) => d.tags.includes('flood'))
    ).toBe(true);
  });
});

// ============================================================
// TEST 2: Validation — missing title returns 400
// ============================================================
describe('Test 2: Validation — create disaster without title', () => {
  it('should return 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/disasters')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Flooding in Manhattan, NYC.',
        tags: ['flood'],
        status: 'ACTIVE',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('should return 400 when description is missing', async () => {
    const res = await request(app)
      .post('/api/disasters')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Some disaster',
        tags: ['flood'],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for invalid ObjectId', async () => {
    const res = await request(app)
      .get('/api/disasters/not-a-valid-id')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 for empty update payload', async () => {
    const res = await request(app)
      .patch(`/api/disasters/${testDisasterId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================
// TEST 3: Authorization — Contributor cannot DELETE
// ============================================================
describe('Test 3: Authorization — contributor cannot delete', () => {
  it('should return 403 when contributor attempts to delete', async () => {
    const res = await request(app)
      .delete(`/api/disasters/${testDisasterId}`)
      .set('Authorization', `Bearer ${contributorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 when no token provided', async () => {
    const res = await request(app).get('/api/disasters');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ============================================================
// TEST 4: Admin can delete disaster
// ============================================================
describe('Test 4: Admin authorization — admin can delete', () => {
  it('should allow admin to delete a disaster', async () => {
    // Create a disposable disaster
    const create = await request(app)
      .post('/api/disasters')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Disposable Disaster',
        description: 'This disaster is in Chicago and will be deleted.',
        tags: ['test'],
        status: 'ACTIVE',
      });

    expect(create.status).toBe(201);
    const disposableId = create.body.data._id;

    const del = await request(app)
      .delete(`/api/disasters/${disposableId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);

    // Verify it's gone
    const verify = await request(app)
      .get(`/api/disasters/${disposableId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(verify.status).toBe(404);
  });
});

// ============================================================
// TEST 5: External integration — mock social media returns normalized reports
// ============================================================
describe('Test 5: External integration — mock social media service', () => {
  it('should return normalized reports for a disaster', async () => {
    mockSocialMediaService.disableFailureMode();

    const res = await request(app)
      .get(`/api/disasters/${testDisasterId}/reports`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    if (res.body.data.length > 0) {
      const report = res.body.data[0];
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('content');
      expect(report).toHaveProperty('user');
      expect(report).toHaveProperty('created_at');

      // Ensure normalization: external 'text' → internal 'content'
      expect(report).not.toHaveProperty('text');
      // Ensure normalization: external 'author.username' → internal 'user'
      expect(report).not.toHaveProperty('author');
    }
  });
});

// ============================================================
// TEST 6: External service failure handling
// ============================================================
describe('Test 6: External service failure', () => {
  it('should return controlled 503 error when external service fails', async () => {
    mockSocialMediaService.enableFailureMode();

    // Invalidate cache so we hit external service
    const cacheKey = `reports:disaster:${testDisasterId}`;
    await cacheService.delete(cacheKey);

    const res = await request(app)
      .get(`/api/disasters/${testDisasterId}/reports`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Could not fetch community reports');

    // Restore
    mockSocialMediaService.disableFailureMode();
  });

  it('should not expose stack traces in error response', async () => {
    mockSocialMediaService.enableFailureMode();
    await cacheService.delete(`reports:disaster:${testDisasterId}`);

    const res = await request(app)
      .get(`/api/disasters/${testDisasterId}/reports`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.body).not.toHaveProperty('stack');
    expect(JSON.stringify(res.body)).not.toContain('at Object.');

    mockSocialMediaService.disableFailureMode();
  });
});

// ============================================================
// TEST 7: Cache behavior — CACHE_MISS then CACHE_HIT
// ============================================================
describe('Test 7: Cache behavior', () => {
  it('should demonstrate cache miss then cache hit', async () => {
    mockSocialMediaService.disableFailureMode();

    // Clear cache for this disaster
    await cacheService.delete(`reports:disaster:${testDisasterId}`);

    // First request — should be CACHE_MISS and fetch from external
    const first = await request(app)
      .get(`/api/disasters/${testDisasterId}/reports`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(first.status).toBe(200);
    const firstData = first.body.data;

    // Second request — should be CACHE_HIT and return same data
    const second = await request(app)
      .get(`/api/disasters/${testDisasterId}/reports`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(second.status).toBe(200);
    expect(second.body.data).toEqual(firstData);
  });

  it('should verify cache stores data correctly', async () => {
    const testKey = 'test:cache:key';
    const testValue = { foo: 'bar', count: 42 };

    await cacheService.set(testKey, testValue, 30);
    const retrieved = await cacheService.get<typeof testValue>(testKey);

    expect(retrieved).toEqual(testValue);
    await cacheService.delete(testKey);

    const afterDelete = await cacheService.get(testKey);
    expect(afterDelete).toBeNull();
  });
});

// ============================================================
// ADDITIONAL: Auth tests
// ============================================================
describe('Auth: login and profile', () => {
  it('should return token on valid login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('should return 401 on invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('should return user profile on GET /me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@example.com');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });
});

// ============================================================
// ADDITIONAL: Location resolution
// ============================================================
describe('Location Resolution', () => {
  it('should resolve location from description on disaster creation', async () => {
    const res = await request(app)
      .post('/api/disasters')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'SF Bay Area Earthquake',
        description: 'A 6.5 magnitude earthquake has struck San Francisco, causing building collapses.',
        tags: ['earthquake'],
        status: 'ACTIVE',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.location).toBeDefined();
    expect(res.body.data.location.name).toContain('San Francisco');
    expect(res.body.data.location.coordinates).toHaveLength(2);
    expect(res.body.data.location.type).toBe('Point');
  });

  it('should return 400 when location cannot be resolved', async () => {
    const res = await request(app)
      .post('/api/disasters')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Unknown Location Disaster',
        description: 'Something happened somewhere but we do not know where.',
        tags: ['unknown'],
        status: 'ACTIVE',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
