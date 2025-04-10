import { NotificationService } from './interfaces';
import { randomUUID } from 'crypto';

export class ConsoleNotificationService implements NotificationService {
  async sendAlert(key: string, message: string): Promise<string> {
    const messageId = randomUUID();
    console.log(`[ALERT ${messageId}] ${message}`);
    return messageId;
  }

  async updateAlert(messageId: string, message: string): Promise<void> {
    console.log(`[UPDATE ${messageId}] ${message}`);
  }
} 