import { Nango } from '@nangohq/node';
import dotenv from 'dotenv';
import { RepositoryFactory } from '../repositories/factory';

dotenv.config();

const nango = new Nango({ 
  secretKey: process.env.NANGO_CLIENT_SECRET || ''
});

export const sendRateLimitAlert = async (accountId: string): Promise<void> => {
  try {
    const rateLimitAlertRepo = RepositoryFactory.getRateLimitAlertRepository();
    
    // Check if there's an active alert for this account
    const activeAlerts = await rateLimitAlertRepo.findActiveByAccountId(accountId);

    const message = `🚨 Rate limit exceeded for account: ${accountId}`;

    if (activeAlerts.length === 0) {
      // Send new alert
      const response = await nango.post({
        endpoint: '/api/v1/slack/chat.postMessage',
        data: {
          channel: 'api-alerts',
          text: message,
        }
      });

      // Store alert record
      await rateLimitAlertRepo.create({
        accountId,
        slackMessageTs: response.data.ts,
        status: 'active'
      });
    }
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
  }
};

export const updateRateLimitRecovery = async (accountId: string): Promise<void> => {
  try {
    const rateLimitAlertRepo = RepositoryFactory.getRateLimitAlertRepository();
    const activeAlerts = await rateLimitAlertRepo.findActiveByAccountId(accountId);

    if (activeAlerts.length > 0) {
      const alert = activeAlerts[0];
      const message = `✅ Rate limit recovered for account: ${accountId}`;

      // Update Slack message
      await nango.post({
        endpoint: '/api/v1/slack/chat.update',
        data: {
          channel: 'api-alerts',
          ts: alert.slackMessageTs,
          text: message,
        }
      });

      // Update alert status
      await rateLimitAlertRepo.updateStatus(alert.id, 'resolved');
    }
  } catch (error) {
    console.error('Failed to update Slack alert:', error);
  }
}; 