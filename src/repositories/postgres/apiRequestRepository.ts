import { Pool } from 'pg';
import { ApiRequest, ApiRequestRepository } from '../interfaces';

const VALID_WINDOWS = ['minute', 'hour', 'day'] as const;
type TimeWindow = typeof VALID_WINDOWS[number];

// Map time windows to PostgreSQL interval syntax
const INTERVAL_MAP = {
  minute: '1 minute',
  hour: '1 hour',
  day: '1 day'
} as const;

export class PostgresApiRequestRepository implements ApiRequestRepository {
  constructor(private pool: Pool) {}

  async create(request: Omit<ApiRequest, 'id' | 'createdAt'>): Promise<ApiRequest> {
    const result = await this.pool.query<ApiRequest>(
      'INSERT INTO api_requests (account_id, endpoint, timestamp) VALUES ($1, $2, $3) RETURNING *',
      [request.accountId, request.endpoint, request.timestamp]
    );
    return this.mapRowToApiRequest(result.rows[0]);
  }

  async findByAccountAndTimeRange(
    accountId: string,
    endpoint: string,
    startTime: Date,
    endTime: Date
  ): Promise<ApiRequest[]> {
    const result = await this.pool.query<ApiRequest>(
      'SELECT * FROM api_requests WHERE account_id = $1 AND endpoint = $2 AND timestamp >= $3 AND timestamp <= $4',
      [accountId, endpoint, startTime, endTime]
    );
    return result.rows.map(this.mapRowToApiRequest);
  }

  async getUsageStats(
    accountId: string,
    endpoint: string,
    startTime: Date,
    endTime: Date,
    window: string
  ): Promise<Array<{ timeBucket: Date; count: number }>> {
    // Validate inputs
    if (!accountId || !endpoint) {
      throw new Error('accountId and endpoint are required');
    }

    if (!startTime || !endTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new Error('Invalid date range');
    }

    if (!VALID_WINDOWS.includes(window as TimeWindow)) {
      throw new Error(`Invalid window parameter. Must be one of: ${VALID_WINDOWS.join(', ')}`);
    }

    const interval = INTERVAL_MAP[window as TimeWindow];

    const result = await this.pool.query(
      `
      WITH time_series AS (
        SELECT generate_series(
          date_trunc($1, $4::timestamp),
          date_trunc($1, $5::timestamp),
          $6::interval
        ) as time_bucket
      )
      SELECT
        time_series.time_bucket,
        COALESCE(COUNT(api_requests.*), 0) as count
      FROM time_series
      LEFT JOIN api_requests ON
        date_trunc($1, api_requests.timestamp) = time_series.time_bucket
        AND api_requests.account_id = $2
        AND api_requests.endpoint = $3
        AND api_requests.timestamp >= $4
        AND api_requests.timestamp <= $5
      GROUP BY time_series.time_bucket
      ORDER BY time_series.time_bucket ASC
      `,
      [window, accountId, endpoint, startTime, endTime, interval]
    );

    return result.rows.map(row => ({
      timeBucket: new Date(row.time_bucket),
      count: parseInt(row.count)
    }));
  }

  private mapRowToApiRequest(row: any): ApiRequest {
    return {
      id: row.id,
      accountId: row.account_id,
      endpoint: row.endpoint,
      timestamp: new Date(row.timestamp),
      createdAt: new Date(row.created_at)
    };
  }
} 