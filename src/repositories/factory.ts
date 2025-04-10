import { Pool } from 'pg';
import { ApiRequestRepository, RateLimitAlertRepository } from './interfaces';
import { PostgresApiRequestRepository } from './postgres/apiRequestRepository';
import { PostgresRateLimitAlertRepository } from './postgres/rateLimitAlertRepository';

export class RepositoryFactory {
  private static apiRequestRepository: ApiRequestRepository;
  private static rateLimitAlertRepository: RateLimitAlertRepository;

  static initialize(pool: Pool) {
    this.apiRequestRepository = new PostgresApiRequestRepository(pool);
    this.rateLimitAlertRepository = new PostgresRateLimitAlertRepository(pool);
  }

  static getApiRequestRepository(): ApiRequestRepository {
    if (!this.apiRequestRepository) {
      throw new Error('Repository factory not initialized');
    }
    return this.apiRequestRepository;
  }

  static getRateLimitAlertRepository(): RateLimitAlertRepository {
    if (!this.rateLimitAlertRepository) {
      throw new Error('Repository factory not initialized');
    }
    return this.rateLimitAlertRepository;
  }
} 