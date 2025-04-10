import { RateLimiterMemory } from 'rate-limiter-flexible';
import dotenv from 'dotenv';

dotenv.config();

const points = parseInt(process.env.RATE_LIMIT_POINTS || '100');
const duration = parseInt(process.env.RATE_LIMIT_DURATION || '1');

export const rateLimiter = new RateLimiterMemory({
  points,
  duration,
});

export const checkRateLimit = async (accountId: string): Promise<boolean> => {
  try {
    await rateLimiter.consume(accountId);
    return true;
  } catch (error) {
    return false;
  }
}; 