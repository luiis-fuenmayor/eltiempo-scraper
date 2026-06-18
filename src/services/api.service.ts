import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';
import { CONSTANTS } from '../config/constants.js';

interface ApiResponse {
  rows: Array<{
    id: string;
    title: string;
    body: string;
    customer: string;
    category: string;
    url: string;
    date: string;
  }>;
  current_page: number;
  total_pages: number;
  items_per_page: number;
  total_items: number;
}

export class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: CONSTANTS.API_BASE_URL,
      timeout: CONSTANTS.REQUEST_TIMEOUT_MS,
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
      }
    });
  }

  async fetchPage(page: number, filters?: Record<string, string>): Promise<ApiResponse | null> {
    const params: Record<string, any> = {
      sort_by: 'published',
      page: page
    };

    if (filters) {
      Object.assign(params, filters);
    }

    return this.retryWithBackoff(async () => {
      try {
        logger.debug(`Fetching page ${page}`, params);

        const response = await this.client.get<ApiResponse>(CONSTANTS.API_ENDPOINT, { params });

        logger.debug(`Page ${page} fetched successfully`, {
          count: response.data.rows.length,
          total_pages: response.data.total_pages
        });

        return response.data;
      } catch (err) {
        logger.error(`Error fetching page ${page}`, {
          error: err instanceof Error ? err.message : String(err),
          status: axios.isAxiosError(err) ? err.response?.status : 'unknown'
        });
        throw err;
      }
    });
  }

  async backfill(startDate: Date, endDate: Date): Promise<number> {
    let totalFetched = 0;
    let page = 1;
    let hasMore = true;

    const dateFrom = this.formatDate(startDate);
    const dateTo = this.formatDate(endDate);

    logger.info(`Starting backfill from ${dateFrom} to ${dateTo}`);

    while (hasMore && page <= CONSTANTS.MAX_PAGES) {
      const response = await this.fetchPage(page, {
        date_from: dateFrom,
        date_to: dateTo
      });

      if (!response) {
        logger.warn(`Backfill stopped at page ${page} due to fetch error`);
        break;
      }

      totalFetched += response.rows.length;

      if (page >= response.total_pages) {
        hasMore = false;
      }

      logger.info(`Backfill progress: page ${page}/${response.total_pages}, total: ${totalFetched}`);

      page++;

      // Small delay between requests
      await this.delay(100);
    }

    logger.info(`Backfill completed: ${totalFetched} edictos fetched`);
    return totalFetched;
  }

  async cronQuery(lookbackDays: number): Promise<number> {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - lookbackDays);

    logger.info(`Starting cron query for last ${lookbackDays} days`);

    const response = await this.fetchPage(1, {
      date_from: this.formatDate(startDate),
      date_to: this.formatDate(endDate)
    });

    if (!response) {
      logger.error('Cron query failed');
      return 0;
    }

    logger.info(`Cron query completed: ${response.rows.length} edictos in last ${lookbackDays} days`);
    return response.rows.length;
  }

  private async retryWithBackoff<T>(fn: () => Promise<T>, attempt = 0): Promise<T | null> {
    try {
      return await fn();
    } catch (err) {
      if (attempt < CONSTANTS.MAX_RETRIES) {
        const delay = CONSTANTS.RETRY_DELAY_MS * Math.pow(CONSTANTS.RETRY_BACKOFF, attempt);
        logger.warn(`Retry attempt ${attempt + 1}/${CONSTANTS.MAX_RETRIES} after ${delay}ms`);
        await this.delay(delay);
        return this.retryWithBackoff(fn, attempt + 1);
      }

      logger.error(`All retry attempts exhausted`);
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
