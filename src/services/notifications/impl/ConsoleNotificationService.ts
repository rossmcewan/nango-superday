import { NotificationService } from '../interfaces';

export class ConsoleNotificationService implements NotificationService {
  async send(message: string): Promise<string> {
    const messageId = new Date().toISOString();
    console.log(`[${messageId}] ${message}`);
    return messageId;
  }

  async update(messageId: string, message: string): Promise<void> {
    console.log(`[${messageId}] Updated: ${message}`);
  }
} 