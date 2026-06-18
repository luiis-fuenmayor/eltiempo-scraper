import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { backfillRemates } from './jobs/backfill.job.js';
import { startCronScheduler } from './jobs/cron.job.js';

// Load environment variables from .env file
dotenv.config();

const command = process.argv[2];
const args = process.argv.slice(3);

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║  🚀 El Tiempo Edictos Scraper                                 ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

async function main() {
  try {
    switch (command) {
      case 'backfill':
        logger.info('📥 Running backfill (60 days by default)');
        await backfillRemates();
        logger.info('✅ Backfill completed');
        process.exit(0);

      case 'backfill-custom':
        const days = parseInt(args[0], 10);
        if (isNaN(days) || days < 1) {
          logger.error('❌ Invalid days argument. Usage: npm run backfill-custom <days>');
          process.exit(1);
        }
        logger.info(`📥 Running backfill (${days} days)`);
        await backfillRemates(days);
        logger.info('✅ Backfill completed');
        process.exit(0);

      case 'cron':
        logger.info('⏰ Starting cron scheduler (runs daily at 06:00 AM UTC)');
        startCronScheduler();
        logger.info('✅ Cron scheduler started. Press Ctrl+C to stop.\n');
        // Keep process alive
        process.on('SIGINT', () => {
          logger.info('🛑 Stopping cron scheduler');
          process.exit(0);
        });
        break;

      case 'cron-once':
        logger.info('🔄 Running cron job once');
        // Import here to avoid defining startCronScheduler when not needed
        const { startCronScheduler: startScheduler } = await import('./jobs/cron.job.js');
        // The startCronScheduler function will run the task immediately
        startScheduler();
        // Wait a bit for it to complete
        await new Promise(resolve => setTimeout(resolve, 5000));
        process.exit(0);

      default:
        console.log(`Usage:
  npm run backfill          - Backfill last 60 days
  npm run backfill-custom   - Backfill custom days (e.g., npm run backfill-custom 30)
  npm run cron              - Start daily cron scheduler (06:00 AM UTC)
  npm run cron-once         - Run cron job once

Environment variables:
  DB_PATH                   - Path to SQLite database (default: ./edictos.db)
  LOG_LEVEL                 - Log level: debug, info, warn, error (default: info)
`);
        process.exit(0);
    }
  } catch (err) {
    logger.error('Fatal error', { error: String(err) });
    process.exit(1);
  }
}

main();
