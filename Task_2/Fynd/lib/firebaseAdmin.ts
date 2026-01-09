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

    const parseServiceAccount = (raw: string) => {
      const value = raw.trim();

      // 1) Try direct JSON
      try {
        return JSON.parse(value);
      } catch {
        // continue
      }

      // 2) Try base64 JSON (optionally prefixed with "base64:")
      try {
        const b64 = value.startsWith('base64:') ? value.slice('base64:'.length).trim() : value;
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        return JSON.parse(decoded);
      } catch {
        // continue
      }

      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY is invalid. Provide JSON string or base64-encoded JSON (optionally prefixed with "base64:").'
      );
    };
    
    // Try to load from file first (easier for development)
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Fallback to environment variable
      serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } else {
      throw new Error('Firebase service account not found. Create serviceAccountKey.json or set FIREBASE_SERVICE_ACCOUNT_KEY');
    }

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
