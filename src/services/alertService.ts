import { RepositoryFactory } from '../repositories/factory';
import { NotificationFactory } from './notifications/factory';
import { QueueFactory } from './queue/factory';
import { QueueMessage } from './queue/interfaces';

export class AlertService {
  private static instance: AlertService;
  private unsubscribe?: () => void;

  private constructor() {
    this.initialize();
  }

  private async initialize() {
    // Subscribe to messages for processing
    this.unsubscribe = await QueueFactory.getQueue().subscribe('alerts', this.processMessage.bind(this));
  }

  static getInstance(): AlertService {
    if (!this.instance) {
      this.instance = new AlertService();
    }
    return this.instance;
  }

  private async processMessage(message: QueueMessage): Promise<void> {
    try {
      const rateLimitAlertRepo = RepositoryFactory.getRateLimitAlertRepository();

      if (message.type === 'alert') {
        const hasActiveAlert = await rateLimitAlertRepo.isActiveByKey(message.key);
        if (!hasActiveAlert) {
          const notificationService = NotificationFactory.getNotificationService();
          const alertMessage = `🚨 Rate limit exceeded for: ${message.key}`;
          const messageId = await notificationService.sendAlert(message.key, alertMessage);

          await rateLimitAlertRepo.create({
            key: message.key,
            messageId,
            status: 'active'
          });
        }
      } else if (message.type === 'recovery') {
        const recoveredAlert = await rateLimitAlertRepo.markRecovered(message.key);
        if (recoveredAlert) {
          const recoveryMessage = `✅ Rate limit recovered for: ${message.key}`;
          const notificationService = NotificationFactory.getNotificationService();
          await notificationService.updateAlert(recoveredAlert.messageId, recoveryMessage);
        }
      }
    } catch (error) {
      console.error(`Failed to process ${message.type} message:`, error);
    }
  }

  async sendRateLimitAlert(key: string): Promise<void> {
    await QueueFactory.getQueue().push({
      topic: 'alerts',
      key,
      type: 'alert',
      timestamp: new Date()
    });
  }

  async updateRateLimitRecovery(key: string): Promise<void> {
    await QueueFactory.getQueue().push({
      topic: 'alerts',
      key,
      type: 'recovery',
      timestamp: new Date()
    });
  }

  async shutdown(): Promise<void> {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    await QueueFactory.getQueue().shutdown();
  }
} 