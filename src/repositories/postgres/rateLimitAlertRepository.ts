import { Pool } from 'pg';
import { RateLimitAlert, RateLimitAlertRepository } from '../interfaces';

export class PostgresRateLimitAlertRepository implements RateLimitAlertRepository {
  constructor(private pool: Pool) {}

  async create(alert: Omit<RateLimitAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<RateLimitAlert> {
    const result = await this.pool.query<RateLimitAlert>(
      'INSERT INTO rate_limit_alerts (key, message_id, status) VALUES ($1, $2, $3) RETURNING *',
      [alert.key, alert.messageId, alert.status]
    );
    return this.mapRowToAlert(result.rows[0]);
  }

  async isActiveByKey(key: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT EXISTS(SELECT 1 FROM rate_limit_alerts WHERE key = $1 AND status = $2)',
      [key, 'active']
    );
    return result.rows[0].exists;
  }

  async updateStatus(id: number, status: 'active' | 'resolved'): Promise<void> {
    await this.pool.query(
      'UPDATE rate_limit_alerts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );
  }

  async markRecovered(key: string): Promise<RateLimitAlert | null> {
    const result = await this.pool.query<RateLimitAlert>(
      'UPDATE rate_limit_alerts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2 AND status = $3 RETURNING *',
      ['resolved', key, 'active']
    );

    return result.rows.length > 0 ? this.mapRowToAlert(result.rows[0]) : null;
  }

  private mapRowToAlert(row: any): RateLimitAlert {
    return {
      id: row.id,
      key: row.key,
      messageId: row.message_id,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
} 