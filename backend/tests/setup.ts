import { vi } from 'vitest';
import dotenv from 'dotenv';

// Load test environment before anything else
dotenv.config({ path: '.env.test' });

// Ensure we're in test mode
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/disaster_response_test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-length-for-test';
process.env.CLIENT_URL = 'http://localhost:5173';
