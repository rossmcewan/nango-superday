import { Pool } from 'pg';
import { MeteringService, ApiUsage, UsageStats, TimeWindow, AggregationWindow } from '../../metering/types';

const INTERVAL_MAP: Record<AggregationWindow, string> = {
  minute: '1 minute',
  hour: '1 hour',
  day: '1 day'
};

export class PostgresMeteringService implements MeteringService {
  constructor(private pool: Pool) {}

  async logUsage(usage: ApiUsage): Promise<void> {
    await this.pool.query(
      'INSERT INTO api_requests (account_id, endpoint, timestamp) VALUES ($1, $2, $3)',
      [usage.accountId, usage.endpoint, usage.timestamp]
    );
  }

  async getUsageStats(
    accountId: string,
    endpoint: string,
    timeWindow: TimeWindow,
    aggregation: AggregationWindow
  ): Promise<UsageStats[]> {
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
      [
        aggregation,
        accountId,
        endpoint,
        timeWindow.startTime,
        timeWindow.endTime,
        INTERVAL_MAP[aggregation]
      ]
    );

    return result.rows.map(row => ({
      timeBucket: new Date(row.time_bucket),
      count: parseInt(row.count)
    }));
  }
} 