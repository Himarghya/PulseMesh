import { createServer } from './server.js';
import { config } from './config.js';
import { runMigrations, initDbPool } from '@pulsemesh/database';

async function bootstrap() {
  console.log('⚡ [PulseMesh API] Initializing database and services...');
  initDbPool(config.databaseUrl);
  try {
    await runMigrations();
  } catch (err) {
    console.warn('⚠️ [PulseMesh API] Migration check bypassed (using memory fallback if offline)');
  }

  const server = createServer();
  server.listen(config.port, config.host, () => {
    console.log(`🚀 [PulseMesh API] Cyber-Telemetry REST API listening at http://${config.host}:${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal API startup error:', err);
  process.exit(1);
});
