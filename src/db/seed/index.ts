import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import * as schema from '../skema';
import { articlesSeed } from './articlesSeed';
import { ids } from './ids';
import { mealDocumentationSeed } from './mealDocumentationSeed';
import { menusSeed } from './menusSeed';
import { notificationsSeed } from './notificationsSeed';
import { reportsSeed } from './reportsSeed';
import { schoolsSeed } from './schoolsSeed';
import { sppgSeed } from './sppgSeed';
import { usersSeed } from './usersSeed';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL is missing. Add it to your .env file before seeding.');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

const demoPassword = 'password123';

async function clearExistingData() {
  await db.delete(schema.notifications);
  await db.delete(schema.schoolReports);
  await db.delete(schema.mealDocumentation);
  await db.delete(schema.menuUploadHistory);
  await db.delete(schema.menus);
  await db.delete(schema.articles);
  await db.delete(schema.schools);
  await db.delete(schema.sppg);
  await db.delete(schema.users);
}

export async function seedAll() {
  console.log('Starting SIMBA database seed...');

  try {
    const hashedPassword = await bcrypt.hash(demoPassword, 10);

    await clearExistingData();
    console.log('Old seed data cleared.');

    await db.insert(schema.users).values(usersSeed(hashedPassword));
    await db.insert(schema.sppg).values(sppgSeed);
    await db.insert(schema.schools).values(schoolsSeed);
    await db.insert(schema.menus).values(menusSeed);
    await db.insert(schema.schoolReports).values(reportsSeed);
    await db.insert(schema.notifications).values(notificationsSeed);
    await db.insert(schema.mealDocumentation).values(mealDocumentationSeed);
    await db.insert(schema.articles).values(articlesSeed);

    console.log('Seed completed successfully.');
    console.log('');
    console.log('Data summary:');
    console.log(`- Users: ${usersSeed(hashedPassword).length} demo accounts`);
    console.log(`- SPPG: ${sppgSeed.length} Jakarta-area kitchens`);
    console.log(`- Schools: ${schoolsSeed.length} partner schools`);
    console.log(`- Menus: ${menusSeed.length} entries across 2026-04-27 to 2026-05-08`);
    console.log(`- Reports: ${reportsSeed.length} school reports`);
    console.log(`- Notifications: ${notificationsSeed.length} SPPG dashboard items`);
    console.log(`- Meal documentation: ${mealDocumentationSeed.length} upload records`);
    console.log(`- Articles: ${articlesSeed.length} public article records`);
    console.log('');
    console.log('Demo login:');
    console.log(`- SPPG: sppg.kebayoran@simba.id / ${demoPassword}`);
    console.log(`- School: sdn.kebayoran01@simba.id / ${demoPassword}`);
    console.log('');
    console.log('Stable profile IDs for manual testing:');
    console.log(`- SPPG Kebayoran Baru: ${ids.sppg.kebayoran}`);
    console.log(`- SDN Kebayoran Baru 01: ${ids.schools.kebayoran01}`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
