import { RateLimitService, RateLimitConfig, RateLimitKey, RateLimitResult } from '../types';

interface RateLimitState {
  count: number;
  resetTime: Date;
}

export class InMemoryRateLimitService implements RateLimitService {
  private limits: Map<string, RateLimitState> = new Map();
  private configs: Record<RateLimitKey['type'], RateLimitConfig>;

  constructor(configs: Record<RateLimitKey['type'], RateLimitConfig>) {
    this.configs = configs;
  }

  private getKey(key: RateLimitKey): string {
    return `${key.type}:${key.value}`;
  }

  private getConfig(type: RateLimitKey['type']): RateLimitConfig {
    return this.configs[type];
  }

  async checkLimit(key: RateLimitKey): Promise<RateLimitResult> {
    const storeKey = this.getKey(key);
    const config = this.getConfig(key.type);
    const now = new Date();

    // Clean up expired entries
    for (const [key, state] of this.limits.entries()) {
      if (state.resetTime <= now) {
        this.limits.delete(key);
      }
    }

    let state = this.limits.get(storeKey);
    if (!state || state.resetTime <= now) {
      // Initialize new state
      state = {
        count: 0,
        resetTime: new Date(now.getTime() + config.window * 1000)
      };
      this.limits.set(storeKey, state);
    }

    state.count++;

    return {
      isAllowed: state.count <= config.limit,
      remaining: Math.max(0, config.limit - state.count),
      resetTime: state.resetTime
    };
  }

  async reset(key: RateLimitKey): Promise<void> {
    this.limits.delete(this.getKey(key));
  }
} 