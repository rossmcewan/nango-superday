export interface Alert {
  key: string;
  messageId: string;
  status: 'active' | 'resolved';
}

export interface AlertService {
  sendRateLimitAlert(key: string): Promise<void>;
  updateRateLimitRecovery(key: string): Promise<void>;
  shutdown(): Promise<void>;
} 