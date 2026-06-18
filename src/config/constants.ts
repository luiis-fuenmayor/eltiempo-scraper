export const CONSTANTS = {
  // API Configuration
  API_BASE_URL: 'https://edictos.eltiempo.com/api/v1',
  API_ENDPOINT: '/edicts',

  // Pagination
  ITEMS_PER_PAGE: 10,
  MAX_PAGES: 1000,

  // Backfill configuration
  BACKFILL_DAYS: 60,

  // Cron configuration
  CRON_LOOKBACK_DAYS: 2,
  CRON_SCHEDULE: '0 6 * * *', // 06:00 AM UTC daily

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  RETRY_BACKOFF: 2,

  // Request configuration
  REQUEST_TIMEOUT_MS: 30000,

  // Database
  DB_PATH: process.env.DB_PATH || './edictos.db',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
} as const;
