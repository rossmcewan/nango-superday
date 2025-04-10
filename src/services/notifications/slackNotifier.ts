import { Nango } from '@nangohq/node';
import dotenv from 'dotenv';
import { NotificationService } from './interfaces';

dotenv.config();

interface SlackMessageResponse {
  ts: string;
  channel: string;
}

export class SlackNotificationService implements NotificationService {
  private nango: Nango;
  private channel: string;

  constructor() {
    const secretKey = process.env.NANGO_CLIENT_SECRET;
    const providerConfigKey = process.env.NANGO_SLACK_PROVIDER_CONFIG_KEY;
    const connectionId = process.env.NANGO_SLACK_CONNECTION_ID;

    if (!secretKey || !providerConfigKey || !connectionId) {
      throw new Error('Missing required Nango environment variables: NANGO_CLIENT_SECRET, NANGO_SLACK_PROVIDER_CONFIG_KEY, NANGO_SLACK_CONNECTION_ID');
    }

    this.nango = new Nango({ secretKey });
    this.channel = process.env.SLACK_CHANNEL || 'superday-ross';
  }

  async sendAlert(key: string, message: string): Promise<string> {
    try {
      const response = await this.nango.triggerAction(
        process.env.NANGO_SLACK_PROVIDER_CONFIG_KEY || '',
        process.env.NANGO_SLACK_CONNECTION_ID || '',
        'send-message',
        {
          channel: this.channel,
          text: message
        }
      ) as SlackMessageResponse;
      console.log('response', response);
      if (!response?.ts) {
        throw new Error('Invalid response from Slack: missing message timestamp');
      }

      return response.ts;  // Slack's message timestamp serves as our messageId
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
      throw new Error('Failed to send Slack notification');
    }
  }

  async updateAlert(messageId: string, message: string): Promise<void> {
    try {
      await this.nango.triggerAction(
        process.env.NANGO_SLACK_PROVIDER_CONFIG_KEY || '',
        process.env.NANGO_SLACK_CONNECTION_ID || '',
        'update-message',
        {
          channel: this.channel,
          ts: messageId,
          text: message
        }
      );
    } catch (error) {
      console.error('Failed to update Slack alert:', error);
      throw new Error('Failed to update Slack notification');
    }
  }
}