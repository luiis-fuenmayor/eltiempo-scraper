import { logger } from '../utils/logger.js';
import crypto from 'crypto';

interface Edicto {
  id: string;
  title: string;
  body: string;
  customer: string;
  category: string;
  url: string;
  date: string;
  content_hash: string;
  scraped_at: string;
}

export class DatabaseService {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL || '';
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    }

    logger.debug('Supabase REST client initialized');
  }

  async upsertEdicto(edicto: Edicto): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const contentHash = this.calculateHash(edicto.body);

      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/edictos?id=eq.${edicto.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.supabaseKey}`,
            'apikey': this.supabaseKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            id: edicto.id,
            titulo: edicto.title,
            contenido: edicto.body,
            url: edicto.url,
            fecha_publicacion: edicto.date,
            hash: contentHash,
            scraped_at: now,
            updated_at: now,
          }),
        }
      );

      if (!response.ok && response.status !== 201) {
        // If update didn't find row, insert
        if (response.status === 200) {
          const insertResponse = await fetch(
            `${this.supabaseUrl}/rest/v1/edictos`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.supabaseKey}`,
                'apikey': this.supabaseKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({
                id: edicto.id,
                titulo: edicto.title,
                contenido: edicto.body,
                url: edicto.url,
                fecha_publicacion: edicto.date,
                hash: contentHash,
                scraped_at: now,
                updated_at: now,
              }),
            }
          );
          return insertResponse.ok;
        }
        logger.error('Error upserting edicto', { id: edicto.id, status: response.status });
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Error upserting edicto', { id: edicto.id, error: String(err) });
      return false;
    }
  }

  async upsertBatch(edictos: Edicto[]): Promise<number> {
    let count = 0;
    for (const edicto of edictos) {
      if (await this.upsertEdicto(edicto)) {
        count++;
      }
    }
    return count;
  }

  async getLatestScrapedDate(): Promise<Date | null> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/edictos?select=fecha_publicacion&order=fecha_publicacion.desc&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${this.supabaseKey}`,
            'apikey': this.supabaseKey,
          },
        }
      );

      if (!response.ok) return null;

      const data = await response.json() as Array<{ fecha_publicacion: string }>;
      if (!data || data.length === 0) return null;

      return new Date(data[0].fecha_publicacion);
    } catch (err) {
      logger.error('Error getting latest date', { error: String(err) });
      return null;
    }
  }

  async countTotal(): Promise<number> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/rest/v1/edictos?select=count&head=true`,
        {
          headers: {
            'Authorization': `Bearer ${this.supabaseKey}`,
            'apikey': this.supabaseKey,
            'Prefer': 'count=exact',
          },
        }
      );

      if (!response.ok) return 0;

      const count = response.headers.get('content-range');
      if (!count) return 0;

      return parseInt(count.split('/')[1], 10) || 0;
    } catch (err) {
      logger.error('Error counting edictos', { error: String(err) });
      return 0;
    }
  }

  async close(): Promise<void> {
    logger.debug('Supabase connection closed');
  }

  private calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
