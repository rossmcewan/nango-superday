import { Pool } from 'pg';
import { RateLimitService, RateLimitConfig, RateLimitKey, RateLimitResult } from '../../ratelimiting/types';

export class PostgresRateLimitService implements RateLimitService {
  private pool: Pool;
  private configs: Record<RateLimitKey['type'], RateLimitConfig>;

  constructor(pool: Pool, configs: Record<RateLimitKey['type'], RateLimitConfig>) {
    this.pool = pool;
    this.configs = configs;
  }

  private getConfig(type: RateLimitKey['type']): RateLimitConfig {
    return this.configs[type];
  }

  async checkLimit(key: RateLimitKey): Promise<RateLimitResult> {
    const config = this.getConfig(key.type);
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.window * 1000);

    // Use a transaction to ensure atomicity
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Clean up old records
      await client.query(
        'DELETE FROM rate_limit_requests WHERE key_type = $1 AND key_value = $2 AND timestamp < $3',
        [key.type, key.value, windowStart]
      );

      // Count existing requests in window
      const { rows: [{ count }] } = await client.query(
        'SELECT COUNT(*) as count FROM rate_limit_requests WHERE key_type = $1 AND key_value = $2',
        [key.type, key.value]
      );

      const currentCount = parseInt(count);
      const isAllowed = currentCount < config.limit;

      if (isAllowed) {
        // Record the new request
        await client.query(
          'INSERT INTO rate_limit_requests (key_type, key_value, timestamp) VALUES ($1, $2, $3)',
          [key.type, key.value, now]
        );
      }

      await client.query('COMMIT');

      return {
        isAllowed,
        remaining: Math.max(0, config.limit - (currentCount + (isAllowed ? 1 : 0))),
        resetTime: new Date(windowStart.getTime() + config.window * 1000)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async reset(key: RateLimitKey): Promise<void> {
    await this.pool.query(
      'DELETE FROM rate_limit_requests WHERE key_type = $1 AND key_value = $2',
      [key.type, key.value]
    );
  }
} 