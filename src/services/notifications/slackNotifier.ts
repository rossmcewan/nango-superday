import { Nango } from '@nangohq/node';
import dotenv from 'dotenv';
import { NotificationService } from './interfaces';

dotenv.config();

export class SlackNotificationService implements NotificationService {
  private nango: Nango;
  private channel: string;

  constructor() {
    this.nango = new Nango({ 
      secretKey: process.env.NANGO_CLIENT_SECRET || ''
    });
    this.channel = process.env.SLACK_CHANNEL || 'api-alerts';
  }

  async sendAlert(accountId: string): Promise<string> {
    const message = `🚨 Rate limit exceeded for account: ${accountId}`;
    
    const response = await this.nango.post({
      endpoint: '/api/v1/slack/chat.postMessage',
      data: {
        channel: this.channel,
        text: message,
      }
    });

    return response.data.ts;  // Slack's message timestamp serves as our messageId
  }

  async updateAlert(messageId: string, message: string): Promise<void> {
    await this.nango.post({
      endpoint: '/api/v1/slack/chat.update',
      data: {
        channel: this.channel,
        ts: messageId,
        text: message,
      }
    });
  }
} 