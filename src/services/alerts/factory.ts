import { AlertService } from './interfaces';
import { DefaultAlertService } from './impl/DefaultAlertService';

export class AlertFactory {
  private static instance: AlertService;

  static initialize(): void {
    this.instance = DefaultAlertService.getInstance();
  }

  static getAlertService(): AlertService {
    if (!this.instance) {
      this.initialize();
    }
    return this.instance;
  }
} 