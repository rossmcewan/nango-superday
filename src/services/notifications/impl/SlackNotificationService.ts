import { Nango } from '@nangohq/node';
import { NotificationService } from '../interfaces';

interface SlackConfig {
  secretKey: string;
  providerConfigKey: string;
  connectionId: string;
  channel: string;
}

interface SlackMessageInput {
  channel: string;
  text: string;
}

interface SlackMessageUpdateInput extends SlackMessageInput {
  ts: string;
}

export class SlackNotificationService implements NotificationService {
  private nango: Nango;
  private config: SlackConfig;

  constructor(config: SlackConfig) {
    this.nango = new Nango({ secretKey: config.secretKey });
    this.config = config;
  }

  async send(message: string): Promise<string> {
    const input: SlackMessageInput = {
      channel: this.config.channel,
      text: message
    };

    const response = await this.nango.triggerAction(
      this.config.providerConfigKey,
      this.config.connectionId,
      'send-message',
      input
    );
    console.log('response', response);
    if (!response || typeof response !== 'object' || !('ts' in response) || typeof response.ts !== 'string') {
      throw new Error('Invalid response from Slack: missing message timestamp');
    }

    return response.ts;
  }

  async update(messageId: string, message: string): Promise<void> {
    const input: SlackMessageUpdateInput = {
      channel: this.config.channel,
      ts: messageId,
      text: message
    };

    await this.nango.triggerAction(
      this.config.providerConfigKey,
      this.config.connectionId,
      'update-message',
      input
    );
  }
}