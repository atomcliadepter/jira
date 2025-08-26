
/**
 * Confluence Automation Engine
 * Handles automated documentation creation and synchronization between Jira and Confluence
 */

import { logger } from '../utils/logger.js';
import { ConfluenceService } from '../services/ConfluenceService.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { EventEmitter } from 'events';

export interface DocumentationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: {
    type: 'issue_created' | 'issue_updated' | 'issue_transitioned';
    conditions: {
      projectKeys?: string[];
      issueTypes?: string[];
      statuses?: string[];
      labels?: string[];
    };
  };
  action: {
    type: 'create_page' | 'update_page' | 'link_page';
    spaceKey: string;
    parentPageId?: string;
    template?: string;
    includeComments?: boolean;
    includeAttachments?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  issueKey: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

export class ConfluenceAutomation extends EventEmitter {
  private rules: Map<string, DocumentationRule> = new Map();
  private executions: Map<string, AutomationExecution> = new Map();

  constructor(
    private confluenceService: ConfluenceService,
    private jiraClient: JiraRestClient
  ) {
    super();
    logger.info('Confluence Automation Engine initialized');
  }

  /**
   * Create a new documentation rule
   */
  async createRule(rule: Omit<DocumentationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentationRule> {
    const newRule: DocumentationRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.set(newRule.id, newRule);
    logger.info('Documentation rule created', { ruleId: newRule.id, name: newRule.name });
    
    this.emit('rule_created', newRule);
    return newRule;
  }

  /**
   * Update an existing documentation rule
   */
  async updateRule(ruleId: string, updates: Partial<DocumentationRule>): Promise<DocumentationRule> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Documentation rule not found: ${ruleId}`);
    }

    const updatedRule: DocumentationRule = {
      ...rule,
      ...updates,
      id: ruleId, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    this.rules.set(ruleId, updatedRule);
    logger.info('Documentation rule updated', { ruleId, name: updatedRule.name });
    
    this.emit('rule_updated', updatedRule);
    return updatedRule;
  }

  /**
   * Delete a documentation rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Documentation rule not found: ${ruleId}`);
    }

    this.rules.delete(ruleId);
    logger.info('Documentation rule deleted', { ruleId, name: rule.name });
    
    this.emit('rule_deleted', rule);
  }

  /**
   * Get all documentation rules
   */
  getRules(filters?: {
    enabled?: boolean;
    triggerType?: string;
    spaceKey?: string;
  }): DocumentationRule[] {
    let rules = Array.from(this.rules.values());

    if (filters) {
      if (filters.enabled !== undefined) {
        rules = rules.filter(rule => rule.enabled === filters.enabled);
      }
      if (filters.triggerType) {
        rules = rules.filter(rule => rule.trigger.type === filters.triggerType);
      }
      if (filters.spaceKey) {
        rules = rules.filter(rule => rule.action.spaceKey === filters.spaceKey);
      }
    }

    return rules;
  }

  /**
   * Get a specific documentation rule
   */
  getRule(ruleId: string): DocumentationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Process a Jira webhook event
   */
  async processJiraEvent(event: any): Promise<void> {
    logger.info('Processing Jira event', { 
      eventType: event.webhookEvent,
      issueKey: event.issue?.key 
    });

    const matchingRules = this.findMatchingRules(event);
    
    for (const rule of matchingRules) {
      if (!rule.enabled) {
        logger.debug('Skipping disabled rule', { ruleId: rule.id });
        continue;
      }

      await this.executeRule(rule, event);
    }
  }

  /**
   * Execute a documentation rule
   */
  async executeRule(rule: DocumentationRule, event: any): Promise<AutomationExecution> {
    const execution: AutomationExecution = {
      id: this.generateId(),
      ruleId: rule.id,
      issueKey: event.issue.key,
      status: 'pending',
      startedAt: new Date()
    };

    this.executions.set(execution.id, execution);
    this.emit('execution_started', execution);

    try {
      execution.status = 'running';
      logger.info('Executing documentation rule', { 
        ruleId: rule.id, 
        executionId: execution.id,
        issueKey: event.issue.key 
      });

      let result: any;

      switch (rule.action.type) {
        case 'create_page':
          result = await this.createDocumentationPage(rule, event);
          break;
        case 'update_page':
          result = await this.updateDocumentationPage(rule, event);
          break;
        case 'link_page':
          result = await this.linkExistingPage(rule, event);
          break;
        default:
          throw new Error(`Unknown action type: ${rule.action.type}`);
      }

      execution.status = 'completed';
      execution.result = result;
      execution.completedAt = new Date();

      logger.info('Documentation rule executed successfully', { 
        ruleId: rule.id, 
        executionId: execution.id 
      });

      this.emit('execution_completed', execution);

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();

      logger.error('Documentation rule execution failed', { 
        ruleId: rule.id, 
        executionId: execution.id,
        error: execution.error 
      });

      this.emit('execution_failed', execution);
    }

    this.executions.set(execution.id, execution);
    return execution;
  }

  /**
   * Get execution history
   */
  getExecutions(filters?: {
    ruleId?: string;
    issueKey?: string;
    status?: string;
    limit?: number;
  }): AutomationExecution[] {
    let executions = Array.from(this.executions.values());

    if (filters) {
      if (filters.ruleId) {
        executions = executions.filter(exec => exec.ruleId === filters.ruleId);
      }
      if (filters.issueKey) {
        executions = executions.filter(exec => exec.issueKey === filters.issueKey);
      }
      if (filters.status) {
        executions = executions.filter(exec => exec.status === filters.status);
      }
    }

    // Sort by start time (newest first)
    executions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    if (filters?.limit) {
      executions = executions.slice(0, filters.limit);
    }

    return executions;
  }

  private findMatchingRules(event: any): DocumentationRule[] {
    const rules = this.getRules({ enabled: true });
    const matchingRules: DocumentationRule[] = [];

    for (const rule of rules) {
      if (this.ruleMatches(rule, event)) {
        matchingRules.push(rule);
      }
    }

    return matchingRules;
  }

  private ruleMatches(rule: DocumentationRule, event: any): boolean {
    const { trigger } = rule;
    const { issue } = event;

    // Check trigger type
    const eventTypeMap: Record<string, string> = {
      'jira:issue_created': 'issue_created',
      'jira:issue_updated': 'issue_updated',
      'jira:issue_transitioned': 'issue_transitioned'
    };

    if (trigger.type !== eventTypeMap[event.webhookEvent]) {
      return false;
    }

    // Check conditions
    const { conditions } = trigger;

    if (conditions.projectKeys && conditions.projectKeys.length > 0) {
      if (!conditions.projectKeys.includes(issue.fields.project.key)) {
        return false;
      }
    }

    if (conditions.issueTypes && conditions.issueTypes.length > 0) {
      if (!conditions.issueTypes.includes(issue.fields.issuetype.name)) {
        return false;
      }
    }

    if (conditions.statuses && conditions.statuses.length > 0) {
      if (!conditions.statuses.includes(issue.fields.status.name)) {
        return false;
      }
    }

    if (conditions.labels && conditions.labels.length > 0) {
      const issueLabels = issue.fields.labels || [];
      const hasMatchingLabel = conditions.labels.some(label => 
        issueLabels.includes(label)
      );
      if (!hasMatchingLabel) {
        return false;
      }
    }

    return true;
  }

  private async createDocumentationPage(rule: DocumentationRule, event: any): Promise<any> {
    const { issue } = event;
    const { action } = rule;

    // Fetch additional issue data if needed
    let issueData = issue;
    if (action.includeComments || action.includeAttachments) {
      issueData = await this.jiraClient.get(`/rest/api/3/issue/${issue.key}`, {
        params: {
          expand: 'names,schema,operations,editmeta,changelog,renderedFields'
        }
      });

      if (action.includeComments) {
        const commentsResponse = await this.jiraClient.get(`/rest/api/3/issue/${issue.key}/comment`);
        issueData.comments = commentsResponse.comments || [];
      }

      if (action.includeAttachments) {
        issueData.attachments = issueData.fields.attachment || [];
      }
    }

    return await this.confluenceService.createDocumentationFromJiraIssue(
      issue.key,
      issueData,
      action.spaceKey,
      action.parentPageId
    );
  }

  private async updateDocumentationPage(rule: DocumentationRule, event: any): Promise<any> {
    // Implementation for updating existing documentation pages
    // This would involve finding the linked page and updating its content
    logger.warn('Update documentation page not yet implemented');
    return { message: 'Update not implemented' };
  }

  private async linkExistingPage(rule: DocumentationRule, event: any): Promise<any> {
    // Implementation for linking to existing pages
    // This would involve finding a page and adding a Jira issue macro
    logger.warn('Link existing page not yet implemented');
    return { message: 'Link not implemented' };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
