export interface ApiUsage {
  accountId: string;
  endpoint: string;
  timestamp: Date;
}

export interface UsageStats {
  timeBucket: Date;
  count: number;
}

export interface TimeWindow {
  startTime: Date;
  endTime: Date;
}

export type AggregationWindow = 'minute' | 'hour' | 'day';

export interface MeteringService {
  // Core metering functionality
  logUsage(usage: ApiUsage): Promise<void>;
  
  // Usage statistics
  getUsageStats(
    accountId: string,
    endpoint: string,
    timeWindow: TimeWindow,
    aggregation: AggregationWindow
  ): Promise<UsageStats[]>;
} 