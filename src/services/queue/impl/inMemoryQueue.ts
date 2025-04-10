import { Queue, QueueMessage } from '../interfaces';

export class InMemoryQueue implements Queue {
  private queues: Map<string, QueueMessage[]> = new Map();
  private subscribers: Map<string, Array<(message: QueueMessage) => Promise<void>>> = new Map();
  private processingLoops: Map<string, Promise<void>> = new Map();
  private active = true;

  async push(message: QueueMessage): Promise<void> {
    const queue = this.queues.get(message.topic) || [];
    queue.push(message);
    this.queues.set(message.topic, queue);
    
    // Start processing loop if not already running
    this.ensureProcessingLoop(message.topic);
  }

  private async ensureProcessingLoop(topic: string): Promise<void> {
    if (!this.processingLoops.has(topic)) {
      const processingLoop = this.startProcessingLoop(topic);
      this.processingLoops.set(topic, processingLoop);
    }
  }

  private async startProcessingLoop(topic: string): Promise<void> {
    while (this.active) {
      const message = await this.pop(topic);
      if (!message) {
        // No more messages, end the processing loop
        this.processingLoops.delete(topic);
        break;
      }

      const handlers = this.subscribers.get(topic) || [];
      // Process message with all handlers sequentially
      for (const handler of handlers) {
        try {
          await handler(message);
        } catch (error) {
          console.error(`Error processing message in topic ${topic}:`, error);
        }
      }
    }
  }

  async pop(topic: string): Promise<QueueMessage | null> {
    const queue = this.queues.get(topic) || [];
    if (queue.length === 0) {
      return null;
    }
    const message = queue.shift()!;
    this.queues.set(topic, queue);
    return message;
  }

  async peek(topic: string): Promise<QueueMessage | null> {
    const queue = this.queues.get(topic) || [];
    return queue.length > 0 ? queue[0] : null;
  }

  async subscribe(topic: string, handler: (message: QueueMessage) => Promise<void>): Promise<() => void> {
    const handlers = this.subscribers.get(topic) || [];
    handlers.push(handler);
    this.subscribers.set(topic, handlers);

    // Ensure processing loop is running if there are messages
    this.ensureProcessingLoop(topic);

    // Return unsubscribe function
    return () => {
      const handlers = this.subscribers.get(topic) || [];
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
        this.subscribers.set(topic, handlers);
      }
    };
  }

  async shutdown(): Promise<void> {
    this.active = false;
    // Wait for all processing loops to complete
    await Promise.all(Array.from(this.processingLoops.values()));
    // Clear all queues and subscribers
    this.queues.clear();
    this.subscribers.clear();
    this.processingLoops.clear();
  }
} 