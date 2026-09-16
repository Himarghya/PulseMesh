export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-pulsemesh-cyber-jwt-key-2026',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pulsemesh',
  rateLimit: {
    maxPerMinute: Number(process.env.RATE_LIMIT_MAX_PER_MINUTE || 100),
    bulkMaxPerMinute: Number(process.env.BULK_RATE_LIMIT_MAX_PER_MINUTE || 10),
  },
};
