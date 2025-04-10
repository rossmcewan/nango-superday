export interface ApiUsage {
  accountId: string;
  endpoint: string;
  timestamp: Date;
}

export interface TimeWindow {
  startTime: Date;
  endTime: Date;
}

export interface UsageStats {
  timeBucket: Date;
  count: number;
}

export type AggregationWindow = 'minute' | 'hour' | 'day';

export interface MeteringService {
  logUsage(usage: ApiUsage): Promise<void>;
  getUsageStats(
    accountId: string,
    endpoint: string,
    timeWindow: TimeWindow,
    aggregation: AggregationWindow
  ): Promise<UsageStats[]>;
} 