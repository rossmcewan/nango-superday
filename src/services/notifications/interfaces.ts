export interface Alert {
  key: string;
  messageId: string;
  status: 'active' | 'resolved';
}

export interface NotificationService {
  send(message: string): Promise<string>;
  update(messageId: string, message: string): Promise<void>;
} 