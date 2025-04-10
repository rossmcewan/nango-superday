import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { checkRateLimit } from '../services/rateLimiter';
import { sendRateLimitAlert, updateRateLimitRecovery } from '../services/slackNotifier';
import { RepositoryFactory } from '../repositories/factory';

interface LogUsageBody {
  accountId: string;
  endpoint: string;
  timestamp?: string;
}

interface QueryUsageParams {
  accountId: string;
  endpoint: string;
  startTime?: string;
  endTime?: string;
  window?: 'minute' | 'hour' | 'day';
}

// Valid time windows for aggregation
const VALID_WINDOWS = ['minute', 'hour', 'day'] as const;
type TimeWindow = typeof VALID_WINDOWS[number];

function isValidWindow(window: string): window is TimeWindow {
  return VALID_WINDOWS.includes(window as TimeWindow);
}

function parseDate(dateStr: string | undefined, defaultDate: Date): Date {
  if (!dateStr) return defaultDate;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return date;
}

export default async function (fastify: FastifyInstance) {
  const apiRequestRepo = RepositoryFactory.getApiRequestRepository();

  // Log API usage
  fastify.post('/log', async (request: FastifyRequest<{ Body: LogUsageBody }>, reply: FastifyReply) => {
    const { accountId, endpoint, timestamp } = request.body;

    // Check rate limit
    const isAllowed = await checkRateLimit(accountId);
    if (!isAllowed) {
      await sendRateLimitAlert(accountId);
      return reply.code(429).send({ error: 'Rate limit exceeded' });
    }

    try {
      await apiRequestRepo.create({
        accountId,
        endpoint,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      });

      // Check if we need to update rate limit recovery
      await updateRateLimitRecovery(accountId);

      return reply.code(201).send({ status: 'success' });
    } catch (error) {
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Query API usage
  fastify.get('/usage', async (request: FastifyRequest<{ Querystring: QueryUsageParams }>, reply: FastifyReply) => {
    const { accountId, endpoint, startTime, endTime, window = 'hour' } = request.query;

    if (!accountId || !endpoint) {
      return reply.code(400).send({ error: 'accountId and endpoint are required' });
    }

    if (!isValidWindow(window)) {
      return reply.code(400).send({ 
        error: `Invalid window parameter. Must be one of: ${VALID_WINDOWS.join(', ')}` 
      });
    }

    try {
      // Default to last 24 hours if no time range is specified
      const now = new Date();
      const defaultStartTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const parsedStartTime = parseDate(startTime, defaultStartTime);
      const parsedEndTime = parseDate(endTime, now);

      // Ensure start time is before end time
      if (parsedStartTime > parsedEndTime) {
        return reply.code(400).send({ error: 'startTime must be before endTime' });
      }

      const usage = await apiRequestRepo.getUsageStats(
        accountId,
        endpoint,
        parsedStartTime,
        parsedEndTime,
        window
      );

      return reply.send({
        accountId,
        endpoint,
        startTime: parsedStartTime.toISOString(),
        endTime: parsedEndTime.toISOString(),
        window,
        usage
      });
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      if (error instanceof Error && error.message.includes('Invalid date format')) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 