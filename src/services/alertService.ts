import { RepositoryFactory } from '../repositories/factory';
import { NotificationFactory } from './notifications/factory';

export class AlertService {
  private static instance: AlertService;
  private constructor() {}

  static getInstance(): AlertService {
    if (!this.instance) {
      this.instance = new AlertService();
    }
    return this.instance;
  }

  async sendRateLimitAlert(accountId: string): Promise<void> {
    try {
      // Check if there's an active alert for this account
      const rateLimitAlertRepo = RepositoryFactory.getRateLimitAlertRepository();
      const activeAlerts = await rateLimitAlertRepo.findActiveByAccountId(accountId);

      if (activeAlerts.length === 0) {
        // Send new alert
        const notificationService = NotificationFactory.getNotificationService();
        const messageId = await notificationService.sendAlert(accountId);

        // Store alert record
        await rateLimitAlertRepo.create({
          accountId,
          messageId,
          status: 'active'
        });
      }
    } catch (error) {
      console.error('Failed to send rate limit alert:', error);
    }
  }

  async updateRateLimitRecovery(accountId: string): Promise<void> {
    try {
      const rateLimitAlertRepo = RepositoryFactory.getRateLimitAlertRepository();
      const activeAlerts = await rateLimitAlertRepo.findActiveByAccountId(accountId);

      if (activeAlerts.length > 0) {
        const alert = activeAlerts[0];
        const message = `✅ Rate limit recovered for account: ${accountId}`;

        // Update notification
        const notificationService = NotificationFactory.getNotificationService();
        await notificationService.updateAlert(alert.messageId, message);

        // Update alert status
        await rateLimitAlertRepo.updateStatus(alert.id, 'resolved');
      }
    } catch (error) {
      console.error('Failed to update rate limit recovery:', error);
    }
  }
} 