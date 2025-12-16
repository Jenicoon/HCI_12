import fs from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const possiblePaths = [
  resolve(__dirname, '../../.env'),
  resolve(__dirname, '../../../.env'),
];

for (const envPath of possiblePaths) {
  if (fs.existsSync(envPath)) {
    config({ path: envPath });
    break;
  }
}
