export interface QueueMessage {
  topic: string;
  key: string;
  type: 'alert' | 'recovery';
  timestamp: Date;
}

export interface Queue {
  /**
   * Pushes a message onto the queue.
   * Returns a promise that resolves when the message has been queued.
   */
  push(message: QueueMessage): Promise<void>;

  /**
   * Retrieves and removes the next message from the queue for the given topic.
   * Returns null if the queue is empty.
   */
  pop(topic: string): Promise<QueueMessage | null>;

  /**
   * Retrieves but does not remove the next message from the queue for the given topic.
   * Returns null if the queue is empty.
   */
  peek(topic: string): Promise<QueueMessage | null>;

  /**
   * Starts consuming messages from the queue for the given topic.
   * The handler will be called for each message.
   * Returns a function that can be called to stop consuming.
   */
  subscribe(topic: string, handler: (message: QueueMessage) => Promise<void>): Promise<() => void>;

  /**
   * Gracefully shuts down the queue, waiting for in-flight messages to complete.
   */
  shutdown(): Promise<void>;
} 