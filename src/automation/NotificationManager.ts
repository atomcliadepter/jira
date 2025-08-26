
/**
 * Notification and escalation management for automation engine
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import {
  AutomationRule,
  AutomationExecution,
  NotificationConfig,
  NotificationChannel,
  EscalationRule,
  EscalationCondition,
  EscalationAction
} from './types.js';

export class NotificationManager extends EventEmitter {
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private notificationTemplates: Map<string, string> = new Map();

  constructor() {
    super();
    this.setupDefaultTemplates();
  }

  /**
   * Send failure notification
   */
  async sendFailureNotification(rule: AutomationRule, execution: AutomationExecution): Promise<void> {
    const requestId = uuidv4();
    logger.info('Sending failure notification', {
      context: 'NotificationManager',
      requestId,
      ruleId: rule.id,
      executionId: execution.id
    });

    try {
      const notification = {
        type: 'rule_failure',
        rule: rule.name,
        ruleId: rule.id,
        executionId: execution.id,
        error: execution.error,
        timestamp: execution.triggeredAt.toISOString(),
        duration: execution.duration
      };

      // Send to default channels (email to rule creator, system admins)
      await this.sendNotification({
        enabled: true,
        channels: [
          {
            type: 'email',
            config: {
              recipients: [rule.createdBy, 'admin@company.com'],
              template: 'rule_failure'
            }
          }
        ],
        escalationRules: []
      }, notification);

      logger.info('Failure notification sent successfully', {
        context: 'NotificationManager',
        requestId,
        ruleId: rule.id
      });
    } catch (error) {
      logger.error('Failed to send failure notification', {
        context: 'NotificationManager',
        requestId,
        ruleId: rule.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Send success notification
   */
  async sendSuccessNotification(rule: AutomationRule, execution: AutomationExecution): Promise<void> {
    const requestId = uuidv4();
    logger.info('Sending success notification', {
      context: 'NotificationManager',
      requestId,
      ruleId: rule.id,
      executionId: execution.id
    });

    try {
      const notification = {
        type: 'rule_success',
        rule: rule.name,
        ruleId: rule.id,
        executionId: execution.id,
        timestamp: execution.triggeredAt.toISOString(),
        duration: execution.duration,
        actionsExecuted: execution.results.length
      };

      // Only send success notifications if explicitly configured
      // This is typically used for critical rules or monitoring
      this.emit('successNotification', notification);

      logger.info('Success notification sent successfully', {
        context: 'NotificationManager',
        requestId,
        ruleId: rule.id
      });
    } catch (error) {
      logger.error('Failed to send success notification', {
        context: 'NotificationManager',
        requestId,
        ruleId: rule.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Send custom notification
   */
  async sendNotification(config: NotificationConfig, data: any): Promise<void> {
    if (!config.enabled) {
      return;
    }

    const requestId = uuidv4();
    logger.info('Sending custom notification', {
      context: 'NotificationManager',
      requestId,
      channelCount: config.channels.length
    });

    try {
      // Send to all configured channels
      const promises = config.channels.map(channel => this.sendToChannel(channel, data));
      await Promise.allSettled(promises);

      // Setup escalation if configured
      if (config.escalationRules.length > 0) {
        this.setupEscalation(config.escalationRules, data);
      }

      logger.info('Custom notification sent successfully', {
        context: 'NotificationManager',
        requestId
      });
    } catch (error) {
      logger.error('Failed to send custom notification', {
        context: 'NotificationManager',
        requestId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Send notification to specific channel
   */
  private async sendToChannel(channel: NotificationChannel, data: any): Promise<void> {
    const requestId = uuidv4();
    logger.debug('Sending to channel', {
      context: 'NotificationManager',
      requestId,
      channelType: channel.type
    });

    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailNotification(channel, data);
          break;
        case 'slack':
          await this.sendSlackNotification(channel, data);
          break;
        case 'teams':
          await this.sendTeamsNotification(channel, data);
          break;
        case 'webhook':
          await this.sendWebhookNotification(channel, data);
          break;
        default:
          throw new Error(`Unsupported channel type: ${channel.type}`);
      }

      logger.debug('Channel notification sent successfully', {
        context: 'NotificationManager',
        requestId,
        channelType: channel.type
      });
    } catch (error) {
      logger.error('Failed to send channel notification', {
        context: 'NotificationManager',
        requestId,
        channelType: channel.type,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(channel: NotificationChannel, data: any): Promise<void> {
    if (!channel.config.recipients || channel.config.recipients.length === 0) {
      throw new Error('Email recipients are required');
    }

    const template = channel.config.template || 'default';
    const subject = this.generateSubject(data);
    const body = this.generateEmailBody(template, data);

    // Simulate email sending
    logger.info('Email notification sent', {
      context: 'NotificationManager',
      recipients: channel.config.recipients,
      subject,
      template
    });

    // In a real implementation, integrate with email service (SendGrid, SES, etc.)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(channel: NotificationChannel, data: any): Promise<void> {
    if (!channel.config.webhookUrl) {
      throw new Error('Slack webhook URL is required');
    }

    const message = this.generateSlackMessage(data);
    const payload = {
      text: message,
      channel: channel.config.channel,
      username: 'JIRA Automation',
      icon_emoji: ':robot_face:'
    };

    // Send to Slack webhook
    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.status} ${response.statusText}`);
    }

    logger.info('Slack notification sent successfully', {
      context: 'NotificationManager',
      channel: channel.config.channel
    });
  }

  /**
   * Send Teams notification
   */
  private async sendTeamsNotification(channel: NotificationChannel, data: any): Promise<void> {
    if (!channel.config.webhookUrl) {
      throw new Error('Teams webhook URL is required');
    }

    const message = this.generateTeamsMessage(data);
    const payload = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: data.type === 'rule_failure' ? 'FF0000' : '00FF00',
      summary: this.generateSubject(data),
      sections: [{
        activityTitle: 'JIRA Automation',
        activitySubtitle: this.generateSubject(data),
        text: message,
        facts: this.generateTeamsFacts(data)
      }]
    };

    // Send to Teams webhook
    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Teams notification failed: ${response.status} ${response.statusText}`);
    }

    logger.info('Teams notification sent successfully', {
      context: 'NotificationManager'
    });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(channel: NotificationChannel, data: any): Promise<void> {
    if (!channel.config.webhookUrl) {
      throw new Error('Webhook URL is required');
    }

    const payload = {
      ...data,
      timestamp: new Date().toISOString(),
      source: 'jira-automation'
    };

    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook notification failed: ${response.status} ${response.statusText}`);
    }

    logger.info('Webhook notification sent successfully', {
      context: 'NotificationManager',
      url: channel.config.webhookUrl
    });
  }

  /**
   * Setup escalation rules
   */
  private setupEscalation(escalationRules: EscalationRule[], data: any): void {
    for (const rule of escalationRules) {
      const timerId = setTimeout(async () => {
        try {
          const shouldEscalate = await this.evaluateEscalationConditions(rule.conditions, data);
          if (shouldEscalate) {
            await this.executeEscalationActions(rule.actions, data);
          }
        } catch (error) {
          logger.error('Escalation execution failed', {
            context: 'NotificationManager',
            escalationRuleId: rule.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }, rule.delayMinutes * 60 * 1000);

      this.escalationTimers.set(rule.id, timerId);
    }
  }

  /**
   * Evaluate escalation conditions
   */
  private async evaluateEscalationConditions(conditions: EscalationCondition[], data: any): Promise<boolean> {
    for (const condition of conditions) {
      switch (condition.type) {
        case 'execution_failed':
          if (data.type !== 'rule_failure') {
            return false;
          }
          break;
        case 'no_response':
          // Check if there was any response/acknowledgment
          // This would require additional tracking
          break;
        case 'sla_breach':
          // Check SLA breach conditions
          break;
        case 'custom':
          // Evaluate custom condition logic
          break;
      }
    }
    return true;
  }

  /**
   * Execute escalation actions
   */
  private async executeEscalationActions(actions: EscalationAction[], data: any): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'notify_manager':
            await this.notifyManager(action.config, data);
            break;
          case 'create_incident':
            await this.createIncident(action.config, data);
            break;
          case 'escalate_priority':
            await this.escalatePriority(action.config, data);
            break;
          case 'webhook':
            await this.sendWebhookNotification({
              type: 'webhook',
              config: action.config
            }, data);
            break;
        }
      } catch (error) {
        logger.error('Escalation action failed', {
          context: 'NotificationManager',
          actionType: action.type,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Notify manager
   */
  private async notifyManager(config: any, data: any): Promise<void> {
    logger.info('Notifying manager for escalation', {
      context: 'NotificationManager',
      data: data.ruleId
    });

    // Implementation would look up manager and send notification
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Create incident
   */
  private async createIncident(config: any, data: any): Promise<void> {
    logger.info('Creating incident for escalation', {
      context: 'NotificationManager',
      data: data.ruleId
    });

    // Implementation would create incident in incident management system
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Escalate priority
   */
  private async escalatePriority(config: any, data: any): Promise<void> {
    logger.info('Escalating priority', {
      context: 'NotificationManager',
      data: data.ruleId
    });

    // Implementation would update issue priority or create high-priority alert
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Generate email subject
   */
  private generateSubject(data: any): string {
    switch (data.type) {
      case 'rule_failure':
        return `JIRA Automation Rule Failed: ${data.rule}`;
      case 'rule_success':
        return `JIRA Automation Rule Completed: ${data.rule}`;
      default:
        return 'JIRA Automation Notification';
    }
  }

  /**
   * Generate email body
   */
  private generateEmailBody(template: string, data: any): string {
    const templateContent = this.notificationTemplates.get(template) || this.notificationTemplates.get('default')!;
    
    return templateContent
      .replace('{{rule}}', data.rule || 'Unknown')
      .replace('{{ruleId}}', data.ruleId || 'Unknown')
      .replace('{{timestamp}}', data.timestamp || new Date().toISOString())
      .replace('{{error}}', data.error || 'No error details')
      .replace('{{duration}}', data.duration ? `${data.duration}ms` : 'Unknown');
  }

  /**
   * Generate Slack message
   */
  private generateSlackMessage(data: any): string {
    switch (data.type) {
      case 'rule_failure':
        return `🚨 *Automation Rule Failed*\n*Rule:* ${data.rule}\n*Error:* ${data.error}\n*Time:* ${data.timestamp}`;
      case 'rule_success':
        return `✅ *Automation Rule Completed*\n*Rule:* ${data.rule}\n*Duration:* ${data.duration}ms\n*Time:* ${data.timestamp}`;
      default:
        return `📋 *JIRA Automation Notification*\n${JSON.stringify(data, null, 2)}`;
    }
  }

  /**
   * Generate Teams message
   */
  private generateTeamsMessage(data: any): string {
    switch (data.type) {
      case 'rule_failure':
        return `Automation rule "${data.rule}" failed with error: ${data.error}`;
      case 'rule_success':
        return `Automation rule "${data.rule}" completed successfully in ${data.duration}ms`;
      default:
        return `JIRA Automation notification: ${JSON.stringify(data)}`;
    }
  }

  /**
   * Generate Teams facts
   */
  private generateTeamsFacts(data: any): any[] {
    const facts = [
      { name: 'Rule ID', value: data.ruleId || 'Unknown' },
      { name: 'Timestamp', value: data.timestamp || new Date().toISOString() }
    ];

    if (data.error) {
      facts.push({ name: 'Error', value: data.error });
    }

    if (data.duration) {
      facts.push({ name: 'Duration', value: `${data.duration}ms` });
    }

    return facts;
  }

  /**
   * Setup default notification templates
   */
  private setupDefaultTemplates(): void {
    this.notificationTemplates.set('default', `
JIRA Automation Notification

Rule: {{rule}}
Rule ID: {{ruleId}}
Timestamp: {{timestamp}}
Duration: {{duration}}

Details:
{{error}}
    `.trim());

    this.notificationTemplates.set('rule_failure', `
JIRA Automation Rule Failure

A JIRA automation rule has failed and requires attention.

Rule Name: {{rule}}
Rule ID: {{ruleId}}
Failure Time: {{timestamp}}
Execution Duration: {{duration}}

Error Details:
{{error}}

Please check the automation logs for more details and take appropriate action.
    `.trim());

    this.notificationTemplates.set('rule_success', `
JIRA Automation Rule Success

A JIRA automation rule has completed successfully.

Rule Name: {{rule}}
Rule ID: {{ruleId}}
Completion Time: {{timestamp}}
Execution Duration: {{duration}}

This notification was sent because success notifications are enabled for this rule.
    `.trim());
  }

  /**
   * Cancel escalation
   */
  cancelEscalation(escalationRuleId: string): void {
    const timerId = this.escalationTimers.get(escalationRuleId);
    if (timerId) {
      clearTimeout(timerId);
      this.escalationTimers.delete(escalationRuleId);
      logger.info('Escalation cancelled', {
        context: 'NotificationManager',
        escalationRuleId
      });
    }
  }

  /**
   * Shutdown notification manager
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down notification manager', {
      context: 'NotificationManager'
    });

    // Cancel all escalation timers
    for (const [escalationRuleId, timerId] of this.escalationTimers.entries()) {
      clearTimeout(timerId);
    }
    this.escalationTimers.clear();

    this.removeAllListeners();
    logger.info('Notification manager shutdown completed', {
      context: 'NotificationManager'
    });
  }
}
