import { NotificationType } from './types';
import { NotificationService } from './interfaces';
import { SlackNotificationService } from './impl/SlackNotificationService';
import { ConsoleNotificationService } from './impl/ConsoleNotificationService';

interface SlackConfig {
  secretKey: string;
  providerConfigKey: string;
  connectionId: string;
  channel: string;
}

export class NotificationFactory {
  private static instance: NotificationService;

  static initialize(type: NotificationType = NotificationType.Console, slackConfig?: SlackConfig): void {
    if (type === NotificationType.Slack && slackConfig) {
      this.instance = new SlackNotificationService(slackConfig);
    } else {
      this.instance = new ConsoleNotificationService();
    }
  }

  static getNotificationService(): NotificationService {
    if (!this.instance) {
      this.initialize();
    }
    return this.instance;
  }
} 