import { Pool } from 'pg';
import { RateLimitAlert, RateLimitAlertRepository } from '../interfaces';

export class PostgresRateLimitAlertRepository implements RateLimitAlertRepository {
  constructor(private pool: Pool) {}

  async create(alert: Omit<RateLimitAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<RateLimitAlert> {
    const result = await this.pool.query<RateLimitAlert>(
      'INSERT INTO rate_limit_alerts (account_id, message_id, status) VALUES ($1, $2, $3) RETURNING *',
      [alert.accountId, alert.messageId, alert.status]
    );
    return this.mapRowToAlert(result.rows[0]);
  }

  async findActiveByAccountId(accountId: string): Promise<RateLimitAlert[]> {
    const result = await this.pool.query<RateLimitAlert>(
      'SELECT * FROM rate_limit_alerts WHERE account_id = $1 AND status = $2',
      [accountId, 'active']
    );
    return result.rows.map(this.mapRowToAlert);
  }

  async updateStatus(id: number, status: 'active' | 'resolved'): Promise<void> {
    await this.pool.query(
      'UPDATE rate_limit_alerts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );
  }

  private mapRowToAlert(row: any): RateLimitAlert {
    return {
      id: row.id,
      accountId: row.account_id,
      messageId: row.message_id,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
} 