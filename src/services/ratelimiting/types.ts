export interface RateLimitConfig {
  limit: number;
  window: number; // in seconds
}

export interface RateLimitKey {
  type: 'account' | 'ip';
  value: string;
}

export interface RateLimitResult {
  isAllowed: boolean;
  remaining: number;
  resetTime: Date;
}

export interface RateLimitService {
  // Check if a request should be allowed
  checkLimit(key: RateLimitKey): Promise<RateLimitResult>;
  
  // Reset rate limit for a key (useful for testing)
  reset(key: RateLimitKey): Promise<void>;
} 