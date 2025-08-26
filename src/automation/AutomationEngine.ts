
/**
 * Core Automation Engine for JIRA workflow automation
 */

import { EventEmitter } from 'events';
import { CronJob } from 'cron';
import { v4 as uuidv4 } from 'uuid';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { logger } from '../utils/logger.js';
import {
  AutomationRule,
  AutomationExecution,
  ExecutionStatus,
  ExecutionContext,
  ActionResult,
  BulkOperationProgress,
  AutomationMetrics,
  TriggerType,
  ActionType,
  RuleValidationResult
} from './types.js';
import { RuleValidator } from './RuleValidator.js';
import { ActionExecutor } from './ActionExecutor.js';
import { TriggerManager } from './TriggerManager.js';
import { NotificationManager } from './NotificationManager.js';
import { WebhookManager } from './WebhookManager.js';
import { SmartValueProcessor } from './SmartValueProcessor.js';

export class AutomationEngine extends EventEmitter {
  private rules: Map<string, AutomationRule> = new Map();
  private executions: Map<string, AutomationExecution> = new Map();
  private bulkOperations: Map<string, BulkOperationProgress> = new Map();
  private scheduledJobs: Map<string, CronJob> = new Map();
  private metrics: Map<string, AutomationMetrics> = new Map();
  
  private ruleValidator: RuleValidator;
  private actionExecutor: ActionExecutor;
  private triggerManager: TriggerManager;
  private notificationManager: NotificationManager;
  private webhookManager: WebhookManager;
  private smartValueProcessor: SmartValueProcessor;

  constructor(
    private jiraClient: JiraRestClient,
    private config: {
      maxConcurrentExecutions?: number;
      executionTimeoutMs?: number;
      bulkOperationBatchSize?: number;
      retentionDays?: number;
    } = {}
  ) {
    super();
    
    this.config = {
      maxConcurrentExecutions: 10,
      executionTimeoutMs: 300000, // 5 minutes
      bulkOperationBatchSize: 100,
      retentionDays: 30,
      ...config
    };

    this.ruleValidator = new RuleValidator();
    this.actionExecutor = new ActionExecutor(jiraClient);
    this.triggerManager = new TriggerManager(this);
    this.notificationManager = new NotificationManager();
    this.webhookManager = new WebhookManager();
    this.smartValueProcessor = new SmartValueProcessor();

    this.setupEventHandlers();
    logger.info('AutomationEngine initialized', { 
      context: 'AutomationEngine',
      config: this.config 
    });
  }

  /**
   * Create a new automation rule
   */
  async createRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'failureCount'>): Promise<AutomationRule> {
    const requestId = uuidv4();
    logger.info('Creating automation rule', { 
      context: 'AutomationEngine', 
      requestId,
      ruleName: rule.name 
    });

    try {
      // Validate rule
      const validation = await this.ruleValidator.validateRule(rule as AutomationRule);
      if (!validation.valid) {
        throw new Error(`Rule validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      const newRule: AutomationRule = {
        ...rule,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
        executionCount: 0,
        failureCount: 0
      };

      this.rules.set(newRule.id, newRule);
      
      // Setup triggers
      if (newRule.enabled) {
        await this.setupRuleTriggers(newRule);
      }

      // Initialize metrics
      this.metrics.set(newRule.id, {
        ruleId: newRule.id,
        executionCount: 0,
        successRate: 0,
        averageDuration: 0,
        failureReasons: {}
      });

      this.emit('ruleCreated', newRule);
      logger.info('Automation rule created successfully', { 
        context: 'AutomationEngine', 
        requestId,
        ruleId: newRule.id 
      });

      return newRule;
    } catch (error) {
      logger.error('Failed to create automation rule', { 
        context: 'AutomationEngine', 
        requestId,
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Update an existing automation rule
   */
  async updateRule(ruleId: string, updates: Partial<AutomationRule>): Promise<AutomationRule> {
    const requestId = uuidv4();
    logger.info('Updating automation rule', { 
      context: 'AutomationEngine', 
      requestId,
      ruleId 
    });

    try {
      const existingRule = this.rules.get(ruleId);
      if (!existingRule) {
        throw new Error(`Rule not found: ${ruleId}`);
      }

      const updatedRule: AutomationRule = {
        ...existingRule,
        ...updates,
        id: ruleId, // Ensure ID doesn't change
        updatedAt: new Date()
      };

      // Validate updated rule
      const validation = await this.ruleValidator.validateRule(updatedRule);
      if (!validation.valid) {
        throw new Error(`Rule validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Update triggers if rule was enabled/disabled or triggers changed
      if (updates.enabled !== undefined || updates.triggers) {
        await this.teardownRuleTriggers(ruleId);
        if (updatedRule.enabled) {
          await this.setupRuleTriggers(updatedRule);
        }
      }

      this.rules.set(ruleId, updatedRule);
      this.emit('ruleUpdated', updatedRule);
      
      logger.info('Automation rule updated successfully', { 
        context: 'AutomationEngine', 
        requestId,
        ruleId 
      });

      return updatedRule;
    } catch (error) {
      logger.error('Failed to update automation rule', { 
        context: 'AutomationEngine', 
        requestId,
        ruleId,
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Delete an automation rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    const requestId = uuidv4();
    logger.info('Deleting automation rule', { 
      context: 'AutomationEngine', 
      requestId,
      ruleId 
    });

    try {
      const rule = this.rules.get(ruleId);
      if (!rule) {
        throw new Error(`Rule not found: ${ruleId}`);
      }

      // Teardown triggers
      await this.teardownRuleTriggers(ruleId);

      // Remove rule and associated data
      this.rules.delete(ruleId);
      this.metrics.delete(ruleId);

      // Cancel any running executions
      for (const [executionId, execution] of this.executions.entries()) {
        if (execution.ruleId === ruleId && execution.status === ExecutionStatus.RUNNING) {
          execution.status = ExecutionStatus.CANCELLED;
          this.executions.set(executionId, execution);
        }
      }

      this.emit('ruleDeleted', ruleId);
      logger.info('Automation rule deleted successfully', { 
        context: 'AutomationEngine', 
        requestId,
        ruleId 
      });
    } catch (error) {
      logger.error('Failed to delete automation rule', { 
        context: 'AutomationEngine', 
        requestId,
        ruleId,
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Execute a rule manually
   */
  async executeRule(ruleId: string, context: ExecutionContext): Promise<AutomationExecution> {
    const requestId = uuidv4();
    logger.info('Executing automation rule manually', { 
      context: 'AutomationEngine', 
      requestId,
      ruleId 
    });

    try {
      const rule = this.rules.get(ruleId);
      if (!rule) {
        throw new Error(`Rule not found: ${ruleId}`);
      }

      if (!rule.enabled) {
        throw new Error(`Rule is disabled: ${ruleId}`);
      }

      return await this.executeRuleInternal(rule, context, 'manual');
    } catch (error) {
      logger.error('Failed to execute automation rule', { 
        context: 'AutomationEngine', 
        requestId,
        ruleId,
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Get all automation rules
   */
  getRules(filters?: {
    enabled?: boolean;
    projectKey?: string;
    triggerType?: TriggerType;
  }): AutomationRule[] {
    let rules = Array.from(this.rules.values());

    if (filters) {
      if (filters.enabled !== undefined) {
        rules = rules.filter(rule => rule.enabled === filters.enabled);
      }
      if (filters.projectKey) {
        rules = rules.filter(rule => 
          !rule.projectKeys || rule.projectKeys.includes(filters.projectKey!)
        );
      }
      if (filters.triggerType) {
        rules = rules.filter(rule => 
          rule.triggers.some(trigger => trigger.type === filters.triggerType)
        );
      }
    }

    return rules;
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): AutomationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get execution history
   */
  getExecutions(filters?: {
    ruleId?: string;
    status?: ExecutionStatus;
    limit?: number;
  }): AutomationExecution[] {
    let executions = Array.from(this.executions.values());

    if (filters) {
      if (filters.ruleId) {
        executions = executions.filter(exec => exec.ruleId === filters.ruleId);
      }
      if (filters.status) {
        executions = executions.filter(exec => exec.status === filters.status);
      }
    }

    // Sort by triggered date (newest first)
    executions.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());

    if (filters?.limit) {
      executions = executions.slice(0, filters.limit);
    }

    return executions;
  }

  /**
   * Get bulk operation progress
   */
  getBulkOperationProgress(operationId: string): BulkOperationProgress | undefined {
    return this.bulkOperations.get(operationId);
  }

  /**
   * Get automation metrics
   */
  getMetrics(ruleId?: string): AutomationMetrics[] {
    if (ruleId) {
      const metrics = this.metrics.get(ruleId);
      return metrics ? [metrics] : [];
    }
    return Array.from(this.metrics.values());
  }

  /**
   * Validate a rule without saving it
   */
  async validateRule(rule: AutomationRule): Promise<RuleValidationResult> {
    return await this.ruleValidator.validateRule(rule);
  }

  /**
   * Internal method to execute a rule
   */
  private async executeRuleInternal(
    rule: AutomationRule, 
    context: ExecutionContext, 
    triggeredBy: string
  ): Promise<AutomationExecution> {
    const executionId = uuidv4();
    const startTime = Date.now();

    const execution: AutomationExecution = {
      id: executionId,
      ruleId: rule.id,
      triggeredAt: new Date(),
      triggeredBy,
      status: ExecutionStatus.RUNNING,
      context,
      results: [],
      duration: 0
    };

    this.executions.set(executionId, execution);
    this.emit('executionStarted', execution);

    try {
      logger.info('Starting rule execution', { 
        context: 'AutomationEngine',
        ruleId: rule.id,
        executionId,
        triggeredBy 
      });

      // Process smart values in context
      const processedContext = await this.smartValueProcessor.processContext(context, rule);

      // Check conditions
      if (rule.conditions && rule.conditions.length > 0) {
        const conditionsMet = await this.evaluateConditions(rule.conditions, processedContext);
        if (!conditionsMet) {
          execution.status = ExecutionStatus.COMPLETED;
          execution.results.push({
            actionType: ActionType.UPDATE_ISSUE, // Placeholder
            status: 'skipped',
            message: 'Rule conditions not met',
            duration: 0
          });
          logger.info('Rule execution skipped - conditions not met', { 
            context: 'AutomationEngine',
            ruleId: rule.id,
            executionId 
          });
          return execution;
        }
      }

      // Execute actions
      for (const action of rule.actions.sort((a, b) => a.order - b.order)) {
        try {
          const actionResult = await this.actionExecutor.executeAction(action, processedContext);
          execution.results.push(actionResult);

          if (actionResult.status === 'failed' && !action.continueOnError) {
            throw new Error(`Action failed: ${actionResult.message}`);
          }
        } catch (error) {
          const actionResult: ActionResult = {
            actionType: action.type,
            status: 'failed',
            message: error instanceof Error ? error.message : String(error),
            duration: 0
          };
          execution.results.push(actionResult);

          if (!action.continueOnError) {
            throw error;
          }
        }
      }

      execution.status = ExecutionStatus.COMPLETED;
      execution.duration = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(rule.id, execution);

      logger.info('Rule execution completed successfully', { 
        context: 'AutomationEngine',
        ruleId: rule.id,
        executionId,
        duration: execution.duration 
      });

    } catch (error) {
      execution.status = ExecutionStatus.FAILED;
      execution.error = error instanceof Error ? error.message : String(error);
      execution.duration = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(rule.id, execution);

      logger.error('Rule execution failed', { 
        context: 'AutomationEngine',
        ruleId: rule.id,
        executionId,
        error: execution.error 
      });

      // Send failure notifications
      await this.notificationManager.sendFailureNotification(rule, execution);
    }

    this.executions.set(executionId, execution);
    this.emit('executionCompleted', execution);

    return execution;
  }

  /**
   * Setup triggers for a rule
   */
  private async setupRuleTriggers(rule: AutomationRule): Promise<void> {
    for (const trigger of rule.triggers) {
      await this.triggerManager.setupTrigger(rule.id, trigger);
    }
  }

  /**
   * Teardown triggers for a rule
   */
  private async teardownRuleTriggers(ruleId: string): Promise<void> {
    await this.triggerManager.teardownTriggers(ruleId);
  }

  /**
   * Evaluate rule conditions
   */
  private async evaluateConditions(
    conditions: any[], 
    context: ExecutionContext
  ): Promise<boolean> {
    // Implementation would evaluate conditions based on type
    // For now, return true as placeholder
    return true;
  }

  /**
   * Update metrics for a rule
   */
  private updateMetrics(ruleId: string, execution: AutomationExecution): void {
    const metrics = this.metrics.get(ruleId);
    if (!metrics) return;

    metrics.executionCount++;
    metrics.lastExecution = execution.triggeredAt;

    if (execution.status === ExecutionStatus.COMPLETED) {
      const totalDuration = (metrics.averageDuration * (metrics.executionCount - 1)) + execution.duration;
      metrics.averageDuration = totalDuration / metrics.executionCount;
    } else if (execution.status === ExecutionStatus.FAILED) {
      const reason = execution.error || 'Unknown error';
      metrics.failureReasons[reason] = (metrics.failureReasons[reason] || 0) + 1;
    }

    const successfulExecutions = metrics.executionCount - Object.values(metrics.failureReasons).reduce((a, b) => a + b, 0);
    metrics.successRate = (successfulExecutions / metrics.executionCount) * 100;

    this.metrics.set(ruleId, metrics);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle trigger events
    this.triggerManager.on('triggerFired', async (ruleId: string, context: ExecutionContext) => {
      const rule = this.rules.get(ruleId);
      if (rule && rule.enabled) {
        await this.executeRuleInternal(rule, context, 'trigger');
      }
    });

    // Handle webhook events
    this.webhookManager.on('webhookReceived', async (data: any) => {
      // Find rules with webhook triggers
      const webhookRules = this.getRules().filter(rule => 
        rule.enabled && rule.triggers.some(trigger => trigger.type === TriggerType.WEBHOOK)
      );

      for (const rule of webhookRules) {
        const context: ExecutionContext = {
          webhookData: data,
          triggerData: data
        };
        await this.executeRuleInternal(rule, context, 'webhook');
      }
    });
  }

  /**
   * Cleanup old executions and data
   */
  async cleanup(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (this.config.retentionDays || 30));

    // Remove old executions
    for (const [executionId, execution] of this.executions.entries()) {
      if (execution.triggeredAt < cutoffDate) {
        this.executions.delete(executionId);
      }
    }

    // Remove old bulk operations
    for (const [operationId, operation] of this.bulkOperations.entries()) {
      if (operation.startedAt < cutoffDate) {
        this.bulkOperations.delete(operationId);
      }
    }

    logger.info('Automation engine cleanup completed', { 
      context: 'AutomationEngine',
      cutoffDate: cutoffDate.toISOString() 
    });
  }

  /**
   * Shutdown the automation engine
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down automation engine', { context: 'AutomationEngine' });

    // Stop all scheduled jobs
    for (const [ruleId, job] of this.scheduledJobs.entries()) {
      job.stop();
    }
    this.scheduledJobs.clear();

    // Cancel running executions
    for (const [executionId, execution] of this.executions.entries()) {
      if (execution.status === ExecutionStatus.RUNNING) {
        execution.status = ExecutionStatus.CANCELLED;
        this.executions.set(executionId, execution);
      }
    }

    // Shutdown components
    await this.triggerManager.shutdown();
    await this.webhookManager.shutdown();

    this.removeAllListeners();
    logger.info('Automation engine shutdown completed', { context: 'AutomationEngine' });
  }
}
