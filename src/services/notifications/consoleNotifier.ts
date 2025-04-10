import { NotificationService } from './interfaces';
import { randomUUID } from 'crypto';

export class ConsoleNotificationService implements NotificationService {
  async sendAlert(accountId: string): Promise<string> {
    const messageId = randomUUID();
    const message = `🚨 Rate limit exceeded for account: ${accountId}`;
    
    console.log(`[ALERT ${messageId}] ${message}`);
    return messageId;
  }

  async updateAlert(messageId: string, message: string): Promise<void> {
    console.log(`[UPDATE ${messageId}] ${message}`);
  }
} 