import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RepositoryFactory } from '../repositories/factory';
import { AlertService } from '../services/alertService';

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
  fastify.post('/log', {
    config: {
      rateLimit: {
        max: parseInt(process.env.ACCOUNT_RATE_LIMIT || '100'),
        timeWindow: 1000,
        keyGenerator: function(request) {
          const accountId = (request.body as any)?.accountId;
          if (!accountId) {
            throw new Error('Account ID is required for POST requests');
          }
          return `account:${accountId}`;
        },
        onExceeding: async function(req, key) {
          await AlertService.getInstance().updateRateLimitRecovery(key);
        },
        onExceeded: async function(req, key) {
          const rateLimitAlertRepo = RepositoryFactory.getRateLimitAlertRepository();
          const hasActiveAlert = await rateLimitAlertRepo.isActiveByKey(key);
          
          if (!hasActiveAlert) {
            await AlertService.getInstance().sendRateLimitAlert(key);
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: LogUsageBody }>, reply: FastifyReply) => {
    const { accountId, endpoint, timestamp } = request.body;

    try {
      await apiRequestRepo.create({
        accountId,
        endpoint,
        timestamp: timestamp ? new Date(timestamp) : new Date()
      });

      return reply.code(201).send({ status: 'success' });
    } catch (error) {
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Query API usage
  fastify.get('/usage', {
    config: {
      rateLimit: false
    }
  }, async (request: FastifyRequest<{ Querystring: QueryUsageParams }>, reply: FastifyReply) => {
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
      if (error instanceof Error && error.message.includes('Invalid date format')) {
        return reply.code(400).send({ error: error.message });
      }
      console.error('Error fetching usage stats:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
} 