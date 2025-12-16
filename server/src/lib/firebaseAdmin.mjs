import fs from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import './loadEnv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SERVICE_ACCOUNT_PATH = resolve(__dirname, '../../../.secrets/serviceAccountKey.json');

const initializeFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return;
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || DEFAULT_SERVICE_ACCOUNT_PATH;
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Firebase service account JSON not found at ${serviceAccountPath}. Set FIREBASE_SERVICE_ACCOUNT_PATH env.`);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  initializeApp({
    credential: cert(serviceAccount),
  });
};

export const getDb = () => {
  initializeFirebaseAdmin();
  return getFirestore();
};
