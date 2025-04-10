import { RepositoryFactory } from '../repositories/factory';
import { NotificationFactory } from './notifications/factory';

type QueuedOperation = () => Promise<void>;

export class AlertService {
  private static instance: AlertService;
  private queues: Map<string, Promise<void>> = new Map();
  
  private constructor() {}

  static getInstance(): AlertService {
    if (!this.instance) {
      this.instance = new AlertService();
    }
    return this.instance;
  }

  private async enqueueOperation(key: string, operation: QueuedOperation): Promise<void> {
    // Get the current promise chain for this key, or a resolved promise if none exists
    const currentPromise = this.queues.get(key) || Promise.resolve();

    // Create a new promise chain that waits for the current one and then executes the new operation
    const newPromise = currentPromise
      .then(operation)
      .catch(error => {
        console.error(`Error in queued operation for key ${key}:`, error);
      })
      .finally(() => {
        // Clean up the queue if this was the last operation
        if (this.queues.get(key) === newPromise) {
          this.queues.delete(key);
        }
      });

    // Update the queue with the new promise chain
    this.queues.set(key, newPromise);

    // Wait for the operation to complete
    await newPromise;
  }

  async sendRateLimitAlert(key: string): Promise<void> {
    await this.enqueueOperation(key, async () => {
      try {
        const rateLimitAlertRepo = RepositoryFactory.getRateLimitAlertRepository();
        const hasActiveAlert = await rateLimitAlertRepo.isActiveByKey(key);

        if (!hasActiveAlert) {
          const notificationService = NotificationFactory.getNotificationService();
          const messageId = await notificationService.sendAlert(key);

          await rateLimitAlertRepo.create({
            key,
            messageId,
            status: 'active'
          });
        }
      } catch (error) {
        console.error('Failed to send rate limit alert:', error);
      }
    });
  }

  async updateRateLimitRecovery(key: string): Promise<void> {
    await this.enqueueOperation(key, async () => {
      try {
        const rateLimitAlertRepo = RepositoryFactory.getRateLimitAlertRepository();
        const recoveredAlert = await rateLimitAlertRepo.markRecovered(key);

        if (recoveredAlert) {
          const message = `✅ Rate limit recovered for: ${key}`;
          const notificationService = NotificationFactory.getNotificationService();
          await notificationService.updateAlert(recoveredAlert.messageId, message);
        }
      } catch (error) {
        console.error('Failed to update rate limit recovery:', error);
      }
    });
  }
} 