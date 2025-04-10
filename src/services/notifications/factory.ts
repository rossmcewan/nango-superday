import { NotificationService } from './interfaces';
import { SlackNotificationService } from './slackNotifier';
import { ConsoleNotificationService } from './consoleNotifier';
import { NotificationType } from './types';

export class NotificationFactory {
  private static notificationService: NotificationService;

  static initialize(type: NotificationType = NotificationType.Console) {
    switch (type) {
      case NotificationType.Slack:
        this.notificationService = new SlackNotificationService();
        break;
      case NotificationType.Console:
      default:
        this.notificationService = new ConsoleNotificationService();
        break;
    }
  }

  static getNotificationService(): NotificationService {
    if (!this.notificationService) {
      this.initialize();
    }
    return this.notificationService;
  }
} 