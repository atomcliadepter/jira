
/**
 * Trigger management for automation engine
 */

import { EventEmitter } from 'events';
import { CronJob } from 'cron';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import {
  AutomationTrigger,
  TriggerType,
  ExecutionContext
} from './types.js';

export class TriggerManager extends EventEmitter {
  private scheduledJobs: Map<string, CronJob> = new Map();
  private webhookEndpoints: Map<string, string> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(private automationEngine: any) {
    super();
    this.setupJiraEventListeners();
  }

  /**
   * Setup a trigger for a rule
   */
  async setupTrigger(ruleId: string, trigger: AutomationTrigger): Promise<void> {
    const requestId = uuidv4();
    logger.info('Setting up automation trigger', {
      context: 'TriggerManager',
      requestId,
      ruleId,
      triggerType: trigger.type
    });

    try {
      switch (trigger.type) {
        case TriggerType.SCHEDULED:
          await this.setupScheduledTrigger(ruleId, trigger);
          break;
        case TriggerType.WEBHOOK:
          await this.setupWebhookTrigger(ruleId, trigger);
          break;
        case TriggerType.ISSUE_CREATED:
        case TriggerType.ISSUE_UPDATED:
        case TriggerType.ISSUE_TRANSITIONED:
        case TriggerType.ISSUE_COMMENTED:
        case TriggerType.FIELD_CHANGED:
          await this.setupJiraEventTrigger(ruleId, trigger);
          break;
        case TriggerType.MANUAL:
          // Manual triggers don't need setup
          break;
        default:
          throw new Error(`Unsupported trigger type: ${trigger.type}`);
      }

      logger.info('Trigger setup completed', {
        context: 'TriggerManager',
        requestId,
        ruleId,
        triggerType: trigger.type
      });
    } catch (error) {
      logger.error('Failed to setup trigger', {
        context: 'TriggerManager',
        requestId,
        ruleId,
        triggerType: trigger.type,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Teardown triggers for a rule
   */
  async teardownTriggers(ruleId: string): Promise<void> {
    logger.info('Tearing down triggers for rule', {
      context: 'TriggerManager',
      ruleId
    });

    // Stop scheduled jobs
    for (const [jobKey, job] of this.scheduledJobs.entries()) {
      if (jobKey.startsWith(`${ruleId}:`)) {
        job.stop();
        this.scheduledJobs.delete(jobKey);
      }
    }

    // Remove webhook endpoints
    for (const [endpointKey] of this.webhookEndpoints.entries()) {
      if (endpointKey.startsWith(`${ruleId}:`)) {
        this.webhookEndpoints.delete(endpointKey);
      }
    }

    // Remove event listeners
    for (const [eventKey, listeners] of this.eventListeners.entries()) {
      if (eventKey.startsWith(`${ruleId}:`)) {
        this.eventListeners.delete(eventKey);
      }
    }

    logger.info('Triggers teardown completed', {
      context: 'TriggerManager',
      ruleId
    });
  }

  /**
   * Setup scheduled trigger
   */
  private async setupScheduledTrigger(ruleId: string, trigger: AutomationTrigger): Promise<void> {
    if (!trigger.config.cronExpression) {
      throw new Error('Cron expression is required for scheduled trigger');
    }

    const jobKey = `${ruleId}:scheduled`;
    const timezone = trigger.config.timezone || 'UTC';

    try {
      const job = new CronJob(
        trigger.config.cronExpression,
        () => {
          const context: ExecutionContext = {
            triggerData: {
              type: 'scheduled',
              timestamp: new Date().toISOString()
            }
          };
          this.emit('triggerFired', ruleId, context);
        },
        null,
        true,
        timezone
      );

      this.scheduledJobs.set(jobKey, job);

      logger.info('Scheduled trigger setup completed', {
        context: 'TriggerManager',
        ruleId,
        cronExpression: trigger.config.cronExpression,
        timezone
      });
    } catch (error) {
      throw new Error(`Failed to setup scheduled trigger: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Setup webhook trigger
   */
  private async setupWebhookTrigger(ruleId: string, trigger: AutomationTrigger): Promise<void> {
    const webhookId = uuidv4();
    const endpointKey = `${ruleId}:webhook:${webhookId}`;
    const webhookUrl = `/automation/webhook/${webhookId}`;

    this.webhookEndpoints.set(endpointKey, webhookUrl);

    logger.info('Webhook trigger setup completed', {
      context: 'TriggerManager',
      ruleId,
      webhookUrl,
      webhookId
    });
  }

  /**
   * Setup JIRA event trigger
   */
  private async setupJiraEventTrigger(ruleId: string, trigger: AutomationTrigger): Promise<void> {
    const eventKey = `${ruleId}:${trigger.type}`;
    const listeners = this.eventListeners.get(eventKey) || [];

    const listener = (eventData: any) => {
      // Check if event matches trigger configuration
      if (this.matchesTriggerConfig(eventData, trigger)) {
        const context: ExecutionContext = {
          issueKey: eventData.issue?.key,
          projectKey: eventData.issue?.fields?.project?.key,
          userId: eventData.user?.accountId,
          triggerData: eventData
        };
        this.emit('triggerFired', ruleId, context);
      }
    };

    listeners.push(listener);
    this.eventListeners.set(eventKey, listeners);

    logger.info('JIRA event trigger setup completed', {
      context: 'TriggerManager',
      ruleId,
      eventType: trigger.type
    });
  }

  /**
   * Check if event matches trigger configuration
   */
  private matchesTriggerConfig(eventData: any, trigger: AutomationTrigger): boolean {
    // Project filter
    if (trigger.config.projectKeys && trigger.config.projectKeys.length > 0) {
      const projectKey = eventData.issue?.fields?.project?.key;
      if (!projectKey || !trigger.config.projectKeys.includes(projectKey)) {
        return false;
      }
    }

    // Issue type filter
    if (trigger.config.issueTypes && trigger.config.issueTypes.length > 0) {
      const issueType = eventData.issue?.fields?.issuetype?.name;
      if (!issueType || !trigger.config.issueTypes.includes(issueType)) {
        return false;
      }
    }

    // Field change specific filters
    if (trigger.type === TriggerType.FIELD_CHANGED) {
      if (trigger.config.fieldId) {
        const changedFields = eventData.changelog?.items || [];
        const fieldChanged = changedFields.some((item: any) => item.fieldId === trigger.config.fieldId);
        if (!fieldChanged) {
          return false;
        }

        // Check from/to values if specified
        if (trigger.config.fromValue !== undefined || trigger.config.toValue !== undefined) {
          const fieldChange = changedFields.find((item: any) => item.fieldId === trigger.config.fieldId);
          if (fieldChange) {
            if (trigger.config.fromValue !== undefined && fieldChange.fromString !== trigger.config.fromValue) {
              return false;
            }
            if (trigger.config.toValue !== undefined && fieldChange.toString !== trigger.config.toValue) {
              return false;
            }
          }
        }
      }
    }

    // Transition specific filters
    if (trigger.type === TriggerType.ISSUE_TRANSITIONED) {
      const statusChanges = eventData.changelog?.items?.filter((item: any) => item.field === 'status') || [];
      if (statusChanges.length === 0) {
        return false;
      }

      const statusChange = statusChanges[0];
      if (trigger.config.fromStatus && trigger.config.fromStatus.length > 0) {
        if (!trigger.config.fromStatus.includes(statusChange.fromString)) {
          return false;
        }
      }

      if (trigger.config.toStatus && trigger.config.toStatus.length > 0) {
        if (!trigger.config.toStatus.includes(statusChange.toString)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Setup JIRA event listeners (simulated)
   */
  private setupJiraEventListeners(): void {
    // In a real implementation, this would connect to JIRA webhooks or polling
    // For now, we'll simulate event handling
    logger.info('JIRA event listeners setup completed', {
      context: 'TriggerManager'
    });
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(webhookId: string, data: any): Promise<void> {
    logger.info('Handling incoming webhook', {
      context: 'TriggerManager',
      webhookId
    });

    // Find rules with this webhook
    for (const [endpointKey] of this.webhookEndpoints.entries()) {
      if (endpointKey.includes(webhookId)) {
        const ruleId = endpointKey.split(':')[0];
        const context: ExecutionContext = {
          webhookData: data,
          triggerData: data
        };
        this.emit('triggerFired', ruleId, context);
      }
    }
  }

  /**
   * Simulate JIRA event (for testing)
   */
  simulateJiraEvent(eventType: TriggerType, eventData: any): void {
    logger.info('Simulating JIRA event', {
      context: 'TriggerManager',
      eventType
    });

    // Find listeners for this event type
    for (const [eventKey, listeners] of this.eventListeners.entries()) {
      if (eventKey.includes(eventType)) {
        const ruleId = eventKey.split(':')[0];
        for (const listener of listeners) {
          listener(eventData);
        }
      }
    }
  }

  /**
   * Get webhook URL for a rule
   */
  getWebhookUrl(ruleId: string): string | undefined {
    for (const [endpointKey, url] of this.webhookEndpoints.entries()) {
      if (endpointKey.startsWith(`${ruleId}:`)) {
        return url;
      }
    }
    return undefined;
  }

  /**
   * Get scheduled jobs for a rule
   */
  getScheduledJobs(ruleId: string): CronJob[] {
    const jobs: CronJob[] = [];
    for (const [jobKey, job] of this.scheduledJobs.entries()) {
      if (jobKey.startsWith(`${ruleId}:`)) {
        jobs.push(job);
      }
    }
    return jobs;
  }

  /**
   * Shutdown trigger manager
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down trigger manager', {
      context: 'TriggerManager'
    });

    // Stop all scheduled jobs
    for (const [jobKey, job] of this.scheduledJobs.entries()) {
      job.stop();
    }
    this.scheduledJobs.clear();

    // Clear all data
    this.webhookEndpoints.clear();
    this.eventListeners.clear();

    this.removeAllListeners();
    logger.info('Trigger manager shutdown completed', {
      context: 'TriggerManager'
    });
  }
}
