import { ApiService } from '../services/api.service.js';
import { DatabaseService } from '../services/database.service.js';
import { logger } from '../utils/logger.js';
import { CONSTANTS } from '../config/constants.js';

export async function backfillRemates(customDays?: number) {
  const days = customDays || CONSTANTS.BACKFILL_DAYS;
  const apiService = new ApiService();
  const dbService = new DatabaseService();

  try {
    logger.info(`🚀 Starting backfill for last ${days} days`);

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    const dateFrom = formatDate(startDate);
    const dateTo = formatDate(endDate);

    logger.info(`📅 Date range: ${dateFrom} to ${dateTo}`);

    let page = 1;
    let totalUpserted = 0;
    let hasMore = true;

    while (hasMore && page <= CONSTANTS.MAX_PAGES) {
      logger.info(`📄 Fetching page ${page}...`);

      const response = await apiService.fetchPage(page, {
        date_from: dateFrom,
        date_to: dateTo
      });

      if (!response) {
        logger.error(`Failed to fetch page ${page}`);
        break;
      }

      if (response.rows.length === 0) {
        logger.info(`No more edictos found at page ${page}`);
        break;
      }

      // Prepare edictos for database
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
      totalUpserted += upserted;

      logger.info(`✅ Page ${page}: ${response.rows.length} fetched, ${upserted} upserted`);

      if (page >= response.total_pages) {
        hasMore = false;
      }

      page++;
    }

    const totalInDb = await dbService.countTotal();
    logger.info(`🎉 Backfill completed: ${totalUpserted} edictos upserted, ${totalInDb} total in database`);

    await dbService.close();
    return totalUpserted;
  } catch (err) {
    logger.error('Backfill failed', { error: String(err) });
    await dbService.close();
    throw err;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
