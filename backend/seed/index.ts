import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User';
import { Disaster } from '../src/models/Disaster';
import { Resource } from '../src/models/Resource';
import { config } from '../src/config/env';

async function seed(): Promise<void> {
  console.log('🌱 Starting seed...');

  await mongoose.connect(config.mongodbUri);
  console.log('✅ Connected to MongoDB');

  // Clear existing data
  await Promise.all([User.deleteMany({}), Disaster.deleteMany({}), Resource.deleteMany({})]);
  console.log('🧹 Cleared existing data');

  // === USERS ===
  const adminHash = await bcrypt.hash('admin123', 12);
  const contributorHash = await bcrypt.hash('contributor123', 12);

  const [admin, contributor] = await User.insertMany([
    {
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
    {
      name: 'Contributor User',
      email: 'contributor@example.com',
      passwordHash: contributorHash,
      role: 'CONTRIBUTOR',
    },
  ]);
  console.log('✅ Created users: admin@example.com, contributor@example.com');

  // === DISASTERS ===
  const disasters = await Disaster.insertMany([
    {
      title: 'Manhattan Flooding',
      description:
        'Severe flooding has overwhelmed Manhattan, NYC following unprecedented rainfall. Subway systems are shut down and residents in low-lying areas are urged to evacuate immediately.',
      location: {
        name: 'Manhattan, New York City',
        type: 'Point',
        coordinates: [-74.006, 40.7128],
      },
      tags: ['flood', 'emergency', 'evacuation'],
      status: 'ACTIVE',
      createdBy: admin._id,
    },
    {
      title: 'Mumbai Coastal Flooding',
      description:
        'Monsoon rains have caused extensive flooding across Mumbai, particularly in low-lying coastal areas and Dharavi. Rescue operations are underway.',
      location: {
        name: 'Mumbai, India',
        type: 'Point',
        coordinates: [72.8777, 19.076],
      },
      tags: ['flood', 'monsoon', 'rescue'],
      status: 'ACTIVE',
      createdBy: admin._id,
    },
    {
      title: 'Delhi Heatwave Crisis',
      description:
        'An extreme heatwave has struck Delhi with temperatures exceeding 48°C. Multiple heat stroke casualties reported. Water supply is critically low.',
      location: {
        name: 'Delhi, India',
        type: 'Point',
        coordinates: [77.1025, 28.7041],
      },
      tags: ['heatwave', 'emergency', 'medical'],
      status: 'ACTIVE',
      createdBy: contributor._id,
    },
    {
      title: 'California Wildfire',
      description:
        'Rapidly spreading wildfire in Southern California near Riverside County has forced mass evacuations. Air quality is at hazardous levels across Los Angeles.',
      location: {
        name: 'California, USA',
        type: 'Point',
        coordinates: [-119.4179, 36.7783],
      },
      tags: ['wildfire', 'evacuation', 'air-quality'],
      status: 'ACTIVE',
      createdBy: admin._id,
    },
    {
      title: 'Chicago Winter Storm',
      description:
        'A severe winter storm has paralyzed Chicago with record snowfall and dangerous wind chill temperatures. Multiple highways are closed and power outages are widespread.',
      location: {
        name: 'Chicago, Illinois',
        type: 'Point',
        coordinates: [-87.6298, 41.8781],
      },
      tags: ['winter-storm', 'blizzard', 'power-outage'],
      status: 'RESOLVED',
      createdBy: contributor._id,
    },
  ]);
  console.log(`✅ Created ${disasters.length} disasters`);

  // === RESOURCES ===
  // Placed near disaster locations for realistic geospatial queries

  await Resource.insertMany([
    // Manhattan resources
    {
      name: 'Manhattan Emergency Shelter - City Hall',
      type: 'SHELTER',
      location: { type: 'Point', coordinates: [-74.0059, 40.7127] }, // Very close to disaster
    },
    {
      name: 'Bellevue Hospital Center',
      type: 'HOSPITAL',
      location: { type: 'Point', coordinates: [-73.9753, 40.7394] }, // ~3km away
    },
    {
      name: 'NYC Food Distribution - FDR Drive',
      type: 'FOOD',
      location: { type: 'Point', coordinates: [-73.9722, 40.7282] }, // ~2.5km away
    },
    {
      name: 'Emergency Water Station - Battery Park',
      type: 'WATER',
      location: { type: 'Point', coordinates: [-74.0153, 40.7033] }, // ~1.5km away
    },
    {
      name: 'FDNY Rescue Operations Center',
      type: 'RESCUE',
      location: { type: 'Point', coordinates: [-74.013, 40.7209] }, // ~0.5km away
    },

    // Mumbai resources
    {
      name: 'BMC Relief Shelter - Worli',
      type: 'SHELTER',
      location: { type: 'Point', coordinates: [72.8193, 19.0176] }, // ~7km away
    },
    {
      name: 'KEM Hospital Mumbai',
      type: 'HOSPITAL',
      location: { type: 'Point', coordinates: [72.8397, 19.002] }, // ~8km away
    },
    {
      name: 'Dharavi Water Distribution Center',
      type: 'WATER',
      location: { type: 'Point', coordinates: [72.8554, 19.0433] }, // ~2km away
    },

    // Delhi resources
    {
      name: 'AIIMS Hospital Delhi',
      type: 'HOSPITAL',
      location: { type: 'Point', coordinates: [77.21, 28.5671] }, // ~15km away
    },
    {
      name: 'Delhi Cooling Center - ITO',
      type: 'SHELTER',
      location: { type: 'Point', coordinates: [77.2494, 28.6272] }, // ~8km
    },
    {
      name: 'DJB Water Tanker Station - Connaught Place',
      type: 'WATER',
      location: { type: 'Point', coordinates: [77.2197, 28.6328] }, // ~7km
    },

    // Chicago resources
    {
      name: 'Chicago Emergency Warming Center',
      type: 'SHELTER',
      location: { type: 'Point', coordinates: [-87.6331, 41.8837] }, // ~0.7km
    },
    {
      name: 'Northwestern Memorial Hospital',
      type: 'HOSPITAL',
      location: { type: 'Point', coordinates: [-87.6213, 41.8958] }, // ~2km
    },
  ]);
  console.log('✅ Created 13 resources across multiple cities');

  await mongoose.disconnect();
  console.log('\n🎉 Seed complete!');
  console.log('\nDev Credentials:');
  console.log('  Admin:       admin@example.com       / admin123');
  console.log('  Contributor: contributor@example.com  / contributor123');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
