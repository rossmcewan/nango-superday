export interface Alert {
  id: number;
  accountId: string;
  messageId: string;  // Generic ID for the message in the notification system
  status: 'active' | 'resolved';
  createdAt: Date;
}

export interface NotificationService {
  sendAlert(key: string): Promise<string>;
  updateAlert(messageId: string, message: string): Promise<void>;
} 