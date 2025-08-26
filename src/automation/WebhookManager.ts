
/**
 * Webhook integration management for automation engine
 */

import { EventEmitter } from 'events';
import { createHash, createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import {
  WebhookIntegration,
  RetryPolicy
} from './types.js';

export class WebhookManager extends EventEmitter {
  private integrations: Map<string, WebhookIntegration> = new Map();
  private retryQueues: Map<string, any[]> = new Map();
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
  }

  /**
   * Register a webhook integration
   */
  async registerWebhook(integration: Omit<WebhookIntegration, 'id'>): Promise<WebhookIntegration> {
    const requestId = uuidv4();
    const webhookId = uuidv4();

    logger.info('Registering webhook integration', {
      context: 'WebhookManager',
      requestId,
      webhookId,
      name: integration.name,
      url: integration.url
    });

    try {
      const newIntegration: WebhookIntegration = {
        ...integration,
        id: webhookId
      };

      this.integrations.set(webhookId, newIntegration);
      this.retryQueues.set(webhookId, []);

      logger.info('Webhook integration registered successfully', {
        context: 'WebhookManager',
        requestId,
        webhookId
      });

      return newIntegration;
    } catch (error) {
      logger.error('Failed to register webhook integration', {
        context: 'WebhookManager',
        requestId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update webhook integration
   */
  async updateWebhook(webhookId: string, updates: Partial<WebhookIntegration>): Promise<WebhookIntegration> {
    const requestId = uuidv4();
    logger.info('Updating webhook integration', {
      context: 'WebhookManager',
      requestId,
      webhookId
    });

    try {
      const existing = this.integrations.get(webhookId);
      if (!existing) {
        throw new Error(`Webhook integration not found: ${webhookId}`);
      }

      const updated: WebhookIntegration = {
        ...existing,
        ...updates,
        id: webhookId // Ensure ID doesn't change
      };

      this.integrations.set(webhookId, updated);

      logger.info('Webhook integration updated successfully', {
        context: 'WebhookManager',
        requestId,
        webhookId
      });

      return updated;
    } catch (error) {
      logger.error('Failed to update webhook integration', {
        context: 'WebhookManager',
        requestId,
        webhookId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete webhook integration
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    const requestId = uuidv4();
    logger.info('Deleting webhook integration', {
      context: 'WebhookManager',
      requestId,
      webhookId
    });

    try {
      const integration = this.integrations.get(webhookId);
      if (!integration) {
        throw new Error(`Webhook integration not found: ${webhookId}`);
      }

      // Cancel any pending retries
      const timer = this.retryTimers.get(webhookId);
      if (timer) {
        clearTimeout(timer);
        this.retryTimers.delete(webhookId);
      }

      // Remove integration and retry queue
      this.integrations.delete(webhookId);
      this.retryQueues.delete(webhookId);

      logger.info('Webhook integration deleted successfully', {
        context: 'WebhookManager',
        requestId,
        webhookId
      });
    } catch (error) {
      logger.error('Failed to delete webhook integration', {
        context: 'WebhookManager',
        requestId,
        webhookId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Send webhook notification
   */
  async sendWebhook(webhookId: string, event: string, data: any): Promise<void> {
    const requestId = uuidv4();
    logger.info('Sending webhook notification', {
      context: 'WebhookManager',
      requestId,
      webhookId,
      event
    });

    try {
      const integration = this.integrations.get(webhookId);
      if (!integration) {
        throw new Error(`Webhook integration not found: ${webhookId}`);
      }

      if (!integration.enabled) {
        logger.debug('Webhook integration is disabled', {
          context: 'WebhookManager',
          requestId,
          webhookId
        });
        return;
      }

      // Check if this event is configured for this webhook
      if (integration.events.length > 0 && !integration.events.includes(event)) {
        logger.debug('Event not configured for webhook', {
          context: 'WebhookManager',
          requestId,
          webhookId,
          event,
          configuredEvents: integration.events
        });
        return;
      }

      await this.sendWebhookRequest(integration, event, data, 0);

      logger.info('Webhook notification sent successfully', {
        context: 'WebhookManager',
        requestId,
        webhookId,
        event
      });
    } catch (error) {
      logger.error('Failed to send webhook notification', {
        context: 'WebhookManager',
        requestId,
        webhookId,
        event,
        error: error instanceof Error ? error.message : String(error)
      });

      // Add to retry queue if retries are configured
      const integration = this.integrations.get(webhookId);
      if (integration && integration.retryPolicy.maxRetries > 0) {
        this.addToRetryQueue(webhookId, { event, data, attempt: 0 });
      }
    }
  }

  /**
   * Send webhook request with retry logic
   */
  private async sendWebhookRequest(
    integration: WebhookIntegration,
    event: string,
    data: any,
    attempt: number
  ): Promise<void> {
    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
      webhookId: integration.id
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'JIRA-Automation-Webhook/1.0',
      'X-Webhook-Event': event,
      'X-Webhook-ID': integration.id,
      ...integration.headers
    };

    // Add signature if secret is configured
    if (integration.secret) {
      const signature = this.generateSignature(JSON.stringify(payload), integration.secret);
      headers['X-Webhook-Signature'] = signature;
    }

    const response = await fetch(integration.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    logger.debug('Webhook request successful', {
      context: 'WebhookManager',
      webhookId: integration.id,
      event,
      statusCode: response.status,
      attempt
    });
  }

  /**
   * Add webhook request to retry queue
   */
  private addToRetryQueue(webhookId: string, request: any): void {
    const queue = this.retryQueues.get(webhookId) || [];
    queue.push(request);
    this.retryQueues.set(webhookId, queue);

    // Schedule retry processing
    this.scheduleRetryProcessing(webhookId);
  }

  /**
   * Schedule retry processing for a webhook
   */
  private scheduleRetryProcessing(webhookId: string): void {
    // Don't schedule if already scheduled
    if (this.retryTimers.has(webhookId)) {
      return;
    }

    const integration = this.integrations.get(webhookId);
    if (!integration) {
      return;
    }

    const delay = this.calculateRetryDelay(integration.retryPolicy, 0);
    const timer = setTimeout(() => {
      this.processRetryQueue(webhookId);
    }, delay);

    this.retryTimers.set(webhookId, timer);
  }

  /**
   * Process retry queue for a webhook
   */
  private async processRetryQueue(webhookId: string): Promise<void> {
    const integration = this.integrations.get(webhookId);
    const queue = this.retryQueues.get(webhookId);

    if (!integration || !queue || queue.length === 0) {
      this.retryTimers.delete(webhookId);
      return;
    }

    const request = queue.shift()!;
    const nextAttempt = request.attempt + 1;

    try {
      await this.sendWebhookRequest(integration, request.event, request.data, nextAttempt);
      
      logger.info('Webhook retry successful', {
        context: 'WebhookManager',
        webhookId,
        event: request.event,
        attempt: nextAttempt
      });
    } catch (error) {
      logger.warn('Webhook retry failed', {
        context: 'WebhookManager',
        webhookId,
        event: request.event,
        attempt: nextAttempt,
        error: error instanceof Error ? error.message : String(error)
      });

      // Add back to queue if more retries available
      if (nextAttempt < integration.retryPolicy.maxRetries) {
        request.attempt = nextAttempt;
        queue.unshift(request); // Add back to front of queue
      } else {
        logger.error('Webhook retry exhausted', {
          context: 'WebhookManager',
          webhookId,
          event: request.event,
          maxRetries: integration.retryPolicy.maxRetries
        });
      }
    }

    // Schedule next retry processing if queue is not empty
    if (queue.length > 0) {
      const delay = this.calculateRetryDelay(integration.retryPolicy, request.attempt);
      const timer = setTimeout(() => {
        this.processRetryQueue(webhookId);
      }, delay);
      this.retryTimers.set(webhookId, timer);
    } else {
      this.retryTimers.delete(webhookId);
    }
  }

  /**
   * Calculate retry delay based on retry policy
   */
  private calculateRetryDelay(retryPolicy: RetryPolicy, attempt: number): number {
    const delay = retryPolicy.initialDelayMs * Math.pow(retryPolicy.backoffMultiplier, attempt);
    return Math.min(delay, retryPolicy.maxDelayMs);
  }

  /**
   * Generate webhook signature
   */
  private generateSignature(payload: string, secret: string): string {
    return 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return signature === expectedSignature;
  }

  /**
   * Handle incoming webhook (for webhook triggers)
   */
  async handleIncomingWebhook(webhookId: string, headers: Record<string, string>, body: any): Promise<void> {
    const requestId = uuidv4();
    logger.info('Handling incoming webhook', {
      context: 'WebhookManager',
      requestId,
      webhookId
    });

    try {
      // Verify signature if secret is configured
      const integration = this.integrations.get(webhookId);
      if (integration?.secret) {
        const signature = headers['x-webhook-signature'] || headers['X-Webhook-Signature'];
        if (!signature) {
          throw new Error('Missing webhook signature');
        }

        const payloadString = typeof body === 'string' ? body : JSON.stringify(body);
        if (!this.verifySignature(payloadString, signature, integration.secret)) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Emit webhook received event
      this.emit('webhookReceived', {
        webhookId,
        headers,
        body,
        timestamp: new Date().toISOString()
      });

      logger.info('Incoming webhook handled successfully', {
        context: 'WebhookManager',
        requestId,
        webhookId
      });
    } catch (error) {
      logger.error('Failed to handle incoming webhook', {
        context: 'WebhookManager',
        requestId,
        webhookId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get webhook integration
   */
  getWebhook(webhookId: string): WebhookIntegration | undefined {
    return this.integrations.get(webhookId);
  }

  /**
   * Get all webhook integrations
   */
  getWebhooks(filters?: { enabled?: boolean; event?: string }): WebhookIntegration[] {
    let webhooks = Array.from(this.integrations.values());

    if (filters) {
      if (filters.enabled !== undefined) {
        webhooks = webhooks.filter(webhook => webhook.enabled === filters.enabled);
      }
      if (filters.event) {
        webhooks = webhooks.filter(webhook => 
          webhook.events.length === 0 || webhook.events.includes(filters.event!)
        );
      }
    }

    return webhooks;
  }

  /**
   * Get retry queue status
   */
  getRetryQueueStatus(webhookId: string): { queueLength: number; nextRetryAt?: Date } {
    const queue = this.retryQueues.get(webhookId) || [];
    const timer = this.retryTimers.get(webhookId);
    
    return {
      queueLength: queue.length,
      nextRetryAt: timer ? new Date(Date.now() + 1000) : undefined // Approximate
    };
  }

  /**
   * Test webhook connectivity
   */
  async testWebhook(webhookId: string): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const requestId = uuidv4();
    logger.info('Testing webhook connectivity', {
      context: 'WebhookManager',
      requestId,
      webhookId
    });

    try {
      const integration = this.integrations.get(webhookId);
      if (!integration) {
        throw new Error(`Webhook integration not found: ${webhookId}`);
      }

      const testPayload = {
        event: 'test',
        data: { message: 'Test webhook connectivity' },
        timestamp: new Date().toISOString(),
        webhookId: integration.id
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'JIRA-Automation-Webhook/1.0',
        'X-Webhook-Event': 'test',
        'X-Webhook-ID': integration.id,
        ...integration.headers
      };

      if (integration.secret) {
        const signature = this.generateSignature(JSON.stringify(testPayload), integration.secret);
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await fetch(integration.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload)
      });

      logger.info('Webhook test completed', {
        context: 'WebhookManager',
        requestId,
        webhookId,
        statusCode: response.status,
        success: response.ok
      });

      return {
        success: response.ok,
        statusCode: response.status
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Webhook test failed', {
        context: 'WebhookManager',
        requestId,
        webhookId,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Shutdown webhook manager
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down webhook manager', {
      context: 'WebhookManager'
    });

    // Cancel all retry timers
    for (const [webhookId, timer] of this.retryTimers.entries()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();

    // Clear all data
    this.integrations.clear();
    this.retryQueues.clear();

    this.removeAllListeners();
    logger.info('Webhook manager shutdown completed', {
      context: 'WebhookManager'
    });
  }
}
