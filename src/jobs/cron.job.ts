import cron from 'node-cron';
import { ApiService } from '../services/api.service.js';
import { DatabaseService } from '../services/database.service.js';
import { logger } from '../utils/logger.js';
import { CONSTANTS } from '../config/constants.js';

export function startCronScheduler() {
  logger.info(`⏰ Scheduling cron job: ${CONSTANTS.CRON_SCHEDULE} (${CONSTANTS.CRON_LOOKBACK_DAYS} day lookback)`);

  cron.schedule(CONSTANTS.CRON_SCHEDULE, async () => {
    try {
      logger.info(`📌 Cron job triggered at ${new Date().toISOString()}`);
      await runCronTask();
    } catch (err) {
      logger.error('Cron job failed', { error: String(err) });
    }
  });

  // Also run once at startup
  logger.info('🔄 Running cron task immediately on startup...');
  runCronTask().catch(err => logger.error('Initial cron run failed', { error: String(err) }));
}

async function runCronTask() {
  const apiService = new ApiService();
  const dbService = new DatabaseService();

  try {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - CONSTANTS.CRON_LOOKBACK_DAYS);

    const dateFrom = formatDate(startDate);
    const dateTo = formatDate(endDate);

    logger.info(`🔍 Fetching edictos from ${dateFrom} to ${dateTo}`);

    const response = await apiService.fetchPage(1, {
      date_from: dateFrom,
      date_to: dateTo
    });

    if (!response || !response.rows) {
      logger.warn('No response from API');
      return;
    }

    // Prepare edictos
    const edictos = response.rows.map(row => ({
      id: row.id,
      title: row.title,
      body: row.body,
      customer: row.customer || '',
      category: row.category || '',
      url: row.url || '',
      date: row.date || '',
      content_hash: '',
      scraped_at: new Date().toISOString()
    }));

    // Upsert to database
    const upserted = await dbService.upsertBatch(edictos);

    logger.info(`✅ Cron task completed: ${response.rows.length} fetched, ${upserted} upserted`);

    await dbService.close();
  } catch (err) {
    logger.error('Cron task failed', { error: String(err) });
    await dbService.close();
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
