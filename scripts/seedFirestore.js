/**
 * Populates the KoboAds reference/config collections in Firestore:
 *   categories, locations, ageRanges, appConfig/settings
 *
 * These are read live by the app (src/services/configService.ts) for the
 * Create Ad targeting/budget steps. Safe to re-run — it upserts by a
 * deterministic doc id (a slug of the name), so running it again just
 * updates existing docs instead of duplicating them.
 *
 * SETUP:
 * 1. Firebase Console → Project settings → Service accounts → Generate new
 *    private key. Save the downloaded file as `scripts/serviceAccountKey.json`
 *    (this path is already in .gitignore — never commit it).
 * 2. npm install
 * 3. npm run seed:firestore
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const keyPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(keyPath)) {
  console.error(
    '\nMissing scripts/serviceAccountKey.json.\n' +
      'Get one from Firebase Console → Project settings → Service accounts → Generate new private key,\n' +
      'save it as scripts/serviceAccountKey.json, then re-run `npm run seed:firestore`.\n'
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(keyPath)),
});

const db = admin.firestore();

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const CATEGORIES = ['Fashion', 'Food & Restaurant', 'Retail', 'Beauty', 'Electronics', 'Services', 'Real Estate', 'Other'];
const LOCATIONS = ['Ibadan', 'Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Enugu', 'All Nigeria'];
const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+', 'All ages'];

const APP_CONFIG = {
  reachLevels: [500, 1000, 2500, 5000, 10000],
  exchangeReachLevels: [200, 500, 1000],
  boostReachSteps: [200, 500, 1000, 2000, 5000],
  freeCampaignMaxReach: 1000,
  dailyFreeCampaignLimit: 2,
  costPerReachNaira: 0.8,
  rewardPerAdNaira: 40,
  dailyAdLimit: 2,
  dailyEarnLimit: 10,
};

async function seedNamedCollection(collectionName, values) {
  const batch = db.batch();
  values.forEach((name, i) => {
    const ref = db.collection(collectionName).doc(slugify(name));
    batch.set(ref, { name, order: i, active: true }, { merge: true });
  });
  await batch.commit();
  console.log(`✓ ${collectionName}: seeded ${values.length} docs`);
}

async function seedAgeRanges() {
  const batch = db.batch();
  AGE_RANGES.forEach((label, i) => {
    const ref = db.collection('ageRanges').doc(slugify(label));
    batch.set(ref, { label, order: i, active: true }, { merge: true });
  });
  await batch.commit();
  console.log(`✓ ageRanges: seeded ${AGE_RANGES.length} docs`);
}

async function seedAppConfig() {
  await db.collection('appConfig').doc('settings').set(APP_CONFIG, { merge: true });
  console.log('✓ appConfig/settings: seeded');
}

async function main() {
  console.log(`Seeding Firestore project: ${admin.instanceId ? '' : ''}${JSON.parse(fs.readFileSync(keyPath, 'utf8')).project_id}\n`);

  await seedNamedCollection('categories', CATEGORIES);
  await seedNamedCollection('locations', LOCATIONS);
  await seedAgeRanges();
  await seedAppConfig();

  console.log('\nDone. These collections now drive the Create Ad targeting/budget steps in the app.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\nSeeding failed:', err);
  process.exit(1);
});
