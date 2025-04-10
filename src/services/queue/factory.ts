import { Queue } from './interfaces';
import { InMemoryQueue } from './impl/inMemoryQueue';

export enum QueueType {
  InMemory = 'in-memory',
  // Future implementations
  // SQS = 'sqs',
  // Redis = 'redis',
}

export class QueueFactory {
  private static queue: Queue;

  static initialize(type: QueueType = QueueType.InMemory): void {
    switch (type) {
      case QueueType.InMemory:
        this.queue = new InMemoryQueue();
        break;
      // Future implementations
      // case QueueType.SQS:
      //   this.queue = new SQSQueue();
      //   break;
      // case QueueType.Redis:
      //   this.queue = new RedisQueue();
      //   break;
      default:
        throw new Error(`Unsupported queue type: ${type}`);
    }
  }

  static getQueue(): Queue {
    if (!this.queue) {
      this.initialize();
    }
    return this.queue;
  }

  static async shutdown(): Promise<void> {
    if (this.queue) {
      await this.queue.shutdown();
    }
  }
} 