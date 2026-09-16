import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query, initDbPool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runMigrations() {
  console.log('[PulseMesh Database] Running schema migrations...');
  initDbPool();

  const schemaPath = join(__dirname, 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf8');

  try {
    await query(sql);
    console.log('[PulseMesh Database] Schema migrations applied successfully.');
  } catch (err) {
    console.error('[PulseMesh Database] Schema migration failed:', err.message);
    throw err;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations().then(() => process.exit(0)).catch(() => process.exit(1));
}
