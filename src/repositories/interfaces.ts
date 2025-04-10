export interface ApiRequest {
  id: number;
  accountId: string;
  endpoint: string;
  timestamp: Date;
  createdAt: Date;
}

export interface RateLimitAlert {
  id: number;
  accountId: string;
  messageId: string;
  status: 'active' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiRequestRepository {
  create(request: Omit<ApiRequest, 'id' | 'createdAt'>): Promise<ApiRequest>;
  findByAccountAndTimeRange(
    accountId: string,
    endpoint: string,
    startTime: Date,
    endTime: Date
  ): Promise<ApiRequest[]>;
  getUsageStats(
    accountId: string,
    endpoint: string,
    startTime: Date,
    endTime: Date,
    window: string
  ): Promise<Array<{ timeBucket: Date; count: number }>>;
}

export interface RateLimitAlertRepository {
  create(alert: Omit<RateLimitAlert, 'id' | 'createdAt' | 'updatedAt'>): Promise<RateLimitAlert>;
  findActiveByAccountId(accountId: string): Promise<RateLimitAlert[]>;
  updateStatus(id: number, status: 'active' | 'resolved'): Promise<void>;
} 