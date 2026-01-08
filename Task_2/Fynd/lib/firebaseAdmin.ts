import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getDatabase, Database } from 'firebase-admin/database';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Initialize Firebase Admin SDK with singleton pattern
 * This prevents "App already exists" errors during Next.js hot reloads
 */
export function getFirebaseAdmin(): { app: App; database: Database } {
  // Always check if an app already exists in Firebase's internal registry
  const existingApps = getApps();
  
  let app: App;
  let database: Database;
  
  if (existingApps.length > 0) {
    // Reuse existing app
    app = existingApps[0];
    database = getDatabase(app);
  } else {
    // Initialize new app
    if (!process.env.FIREBASE_DATABASE_URL) {
      throw new Error('FIREBASE_DATABASE_URL is not set in environment variables');
    }

    let serviceAccount;
    
    // Try to load from file first (easier for development)
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      console.log('Loading service account from serviceAccountKey.json');
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Fallback to environment variable
      console.log('Loading service account from environment variable');
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } else {
      throw new Error('Firebase service account not found. Create serviceAccountKey.json or set FIREBASE_SERVICE_ACCOUNT_KEY');
    }

    console.log('Initializing Firebase Admin with database URL:', process.env.FIREBASE_DATABASE_URL);

    app = initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    database = getDatabase(app);
  }

  return { app, database };
}

/**
 * Get Firebase Realtime Database reference
 */
export function getAdminDatabase(): Database {
  const { database } = getFirebaseAdmin();
  return database;
}
