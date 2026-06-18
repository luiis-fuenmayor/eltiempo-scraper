import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import ws from 'ws';

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
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    logger.debug('Supabase client initialized with WebSocket support');
  }

  async upsertEdicto(edicto: Edicto): Promise<boolean> {
    try {
      const now = new Date().toISOString();
      const contentHash = this.calculateHash(edicto.body);

      const { error } = await this.supabase
        .from('edictos')
        .upsert({
          id: edicto.id,
          titulo: edicto.title,
          contenido: edicto.body,
          cliente: edicto.customer,
          categoria: edicto.category,
          url: edicto.url,
          fecha_publicacion: edicto.date,
          hash: contentHash,
          scraped_at: now,
          updated_at: now,
        }, { onConflict: 'id' });

      if (error) {
        logger.error('Error upserting edicto', { id: edicto.id, error: error.message });
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
      const { data, error } = await this.supabase
        .from('edictos')
        .select('fecha_publicacion')
        .order('fecha_publicacion', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return null;
      }

      return new Date(data[0].fecha_publicacion);
    } catch (err) {
      logger.error('Error getting latest date', { error: String(err) });
      return null;
    }
  }

  async countTotal(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('edictos')
        .select('*', { count: 'exact', head: true });

      if (error || count === null) {
        return 0;
      }

      return count;
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
