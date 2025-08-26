
/**
 * Smart value processing for automation engine
 */

import { logger } from '../utils/logger.js';
import {
  AutomationRule,
  ExecutionContext,
  SmartValue
} from './types.js';

export class SmartValueProcessor {
  private readonly smartValueRegex = /\{\{([^}]+)\}\}/g;

  /**
   * Process smart values in execution context
   */
  async processContext(context: ExecutionContext, rule: AutomationRule): Promise<ExecutionContext> {
    logger.debug('Processing smart values in context', {
      context: 'SmartValueProcessor',
      ruleId: rule.id,
      issueKey: context.issueKey
    });

    try {
      const processedContext = { ...context };

      // Process trigger data
      if (context.triggerData) {
        processedContext.triggerData = await this.processObject(context.triggerData, context);
      }

      // Process webhook data
      if (context.webhookData) {
        processedContext.webhookData = await this.processObject(context.webhookData, context);
      }

      return processedContext;
    } catch (error) {
      logger.error('Failed to process smart values in context', {
        context: 'SmartValueProcessor',
        ruleId: rule.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Process smart values in a string
   */
  async processString(input: string, context: ExecutionContext): Promise<string> {
    if (!input || typeof input !== 'string') {
      return input;
    }

    let result = input;
    const matches = Array.from(input.matchAll(this.smartValueRegex));

    for (const match of matches) {
      const fullMatch = match[0]; // {{expression}}
      const expression = match[1]; // expression
      
      try {
        const value = await this.evaluateExpression(expression, context);
        const stringValue = this.convertToString(value);
        result = result.replace(fullMatch, stringValue);
      } catch (error) {
        logger.warn('Failed to evaluate smart value expression', {
          context: 'SmartValueProcessor',
          expression,
          error: error instanceof Error ? error.message : String(error)
        });
        // Leave the original expression if evaluation fails
      }
    }

    return result;
  }

  /**
   * Process smart values in an object
   */
  async processObject(obj: any, context: ExecutionContext): Promise<any> {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return await this.processString(obj, context);
    }

    if (Array.isArray(obj)) {
      const processedArray = [];
      for (const item of obj) {
        processedArray.push(await this.processObject(item, context));
      }
      return processedArray;
    }

    if (typeof obj === 'object') {
      const processedObj: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const processedKey = await this.processString(key, context);
        processedObj[processedKey] = await this.processObject(value, context);
      }
      return processedObj;
    }

    return obj;
  }

  /**
   * Evaluate a smart value expression
   */
  private async evaluateExpression(expression: string, context: ExecutionContext): Promise<any> {
    const trimmedExpression = expression.trim();

    // Handle different types of expressions
    if (trimmedExpression.startsWith('issue.')) {
      return await this.evaluateIssueExpression(trimmedExpression, context);
    }

    if (trimmedExpression.startsWith('project.')) {
      return await this.evaluateProjectExpression(trimmedExpression, context);
    }

    if (trimmedExpression.startsWith('user.')) {
      return await this.evaluateUserExpression(trimmedExpression, context);
    }

    if (trimmedExpression.startsWith('now')) {
      return await this.evaluateDateExpression(trimmedExpression, context);
    }

    if (trimmedExpression.startsWith('webhook.')) {
      return await this.evaluateWebhookExpression(trimmedExpression, context);
    }

    if (trimmedExpression.startsWith('trigger.')) {
      return await this.evaluateTriggerExpression(trimmedExpression, context);
    }

    // Handle literal values
    if (trimmedExpression.startsWith('"') && trimmedExpression.endsWith('"')) {
      return trimmedExpression.slice(1, -1);
    }

    if (trimmedExpression.startsWith("'") && trimmedExpression.endsWith("'")) {
      return trimmedExpression.slice(1, -1);
    }

    // Handle numbers
    if (/^\d+(\.\d+)?$/.test(trimmedExpression)) {
      return parseFloat(trimmedExpression);
    }

    // Handle booleans
    if (trimmedExpression === 'true') return true;
    if (trimmedExpression === 'false') return false;
    if (trimmedExpression === 'null') return null;

    // Default: return as string
    return trimmedExpression;
  }

  /**
   * Evaluate issue-related expressions
   */
  private async evaluateIssueExpression(expression: string, context: ExecutionContext): Promise<any> {
    if (!context.issueKey) {
      throw new Error('Issue key not available in context');
    }

    const parts = expression.split('.');
    
    switch (parts[1]) {
      case 'key':
        return context.issueKey;
      case 'summary':
        // In a real implementation, fetch from JIRA API
        return `Summary of ${context.issueKey}`;
      case 'description':
        return `Description of ${context.issueKey}`;
      case 'status':
        return 'In Progress'; // Placeholder
      case 'priority':
        return 'High'; // Placeholder
      case 'assignee':
        if (parts[2] === 'displayName') {
          return 'John Doe'; // Placeholder
        }
        if (parts[2] === 'emailAddress') {
          return 'john.doe@example.com'; // Placeholder
        }
        return 'john.doe@example.com'; // Default to email
      case 'reporter':
        if (parts[2] === 'displayName') {
          return 'Jane Smith'; // Placeholder
        }
        if (parts[2] === 'emailAddress') {
          return 'jane.smith@example.com'; // Placeholder
        }
        return 'jane.smith@example.com'; // Default to email
      case 'created':
        return new Date().toISOString();
      case 'updated':
        return new Date().toISOString();
      default:
        throw new Error(`Unsupported issue expression: ${expression}`);
    }
  }

  /**
   * Evaluate project-related expressions
   */
  private async evaluateProjectExpression(expression: string, context: ExecutionContext): Promise<any> {
    if (!context.projectKey) {
      throw new Error('Project key not available in context');
    }

    const parts = expression.split('.');
    
    switch (parts[1]) {
      case 'key':
        return context.projectKey;
      case 'name':
        return `Project ${context.projectKey}`; // Placeholder
      case 'lead':
        if (parts[2] === 'displayName') {
          return 'Project Lead'; // Placeholder
        }
        if (parts[2] === 'emailAddress') {
          return 'lead@example.com'; // Placeholder
        }
        return 'lead@example.com'; // Default to email
      default:
        throw new Error(`Unsupported project expression: ${expression}`);
    }
  }

  /**
   * Evaluate user-related expressions
   */
  private async evaluateUserExpression(expression: string, context: ExecutionContext): Promise<any> {
    if (!context.userId) {
      throw new Error('User ID not available in context');
    }

    const parts = expression.split('.');
    
    switch (parts[1]) {
      case 'accountId':
        return context.userId;
      case 'displayName':
        return 'Current User'; // Placeholder
      case 'emailAddress':
        return 'user@example.com'; // Placeholder
      default:
        throw new Error(`Unsupported user expression: ${expression}`);
    }
  }

  /**
   * Evaluate date-related expressions
   */
  private async evaluateDateExpression(expression: string, context: ExecutionContext): Promise<any> {
    const now = new Date();
    
    if (expression === 'now') {
      return now.toISOString();
    }

    // Handle date arithmetic
    const plusDaysMatch = expression.match(/^now\.plusDays\((\d+)\)$/);
    if (plusDaysMatch) {
      const days = parseInt(plusDaysMatch[1]);
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + days);
      return futureDate.toISOString();
    }

    const minusDaysMatch = expression.match(/^now\.minusDays\((\d+)\)$/);
    if (minusDaysMatch) {
      const days = parseInt(minusDaysMatch[1]);
      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - days);
      return pastDate.toISOString();
    }

    const plusHoursMatch = expression.match(/^now\.plusHours\((\d+)\)$/);
    if (plusHoursMatch) {
      const hours = parseInt(plusHoursMatch[1]);
      const futureDate = new Date(now);
      futureDate.setHours(futureDate.getHours() + hours);
      return futureDate.toISOString();
    }

    const minusHoursMatch = expression.match(/^now\.minusHours\((\d+)\)$/);
    if (minusHoursMatch) {
      const hours = parseInt(minusHoursMatch[1]);
      const pastDate = new Date(now);
      pastDate.setHours(pastDate.getHours() - hours);
      return pastDate.toISOString();
    }

    // Handle date formatting
    if (expression === 'now.format("yyyy-MM-dd")') {
      return now.toISOString().split('T')[0];
    }

    if (expression === 'now.format("HH:mm:ss")') {
      return now.toTimeString().split(' ')[0];
    }

    throw new Error(`Unsupported date expression: ${expression}`);
  }

  /**
   * Evaluate webhook-related expressions
   */
  private async evaluateWebhookExpression(expression: string, context: ExecutionContext): Promise<any> {
    if (!context.webhookData) {
      throw new Error('Webhook data not available in context');
    }

    const parts = expression.split('.');
    let current = context.webhookData;

    // Navigate through the webhook data object
    for (let i = 1; i < parts.length; i++) {
      if (current && typeof current === 'object' && parts[i] in current) {
        current = current[parts[i]];
      } else {
        throw new Error(`Webhook property not found: ${parts[i]}`);
      }
    }

    return current;
  }

  /**
   * Evaluate trigger-related expressions
   */
  private async evaluateTriggerExpression(expression: string, context: ExecutionContext): Promise<any> {
    if (!context.triggerData) {
      throw new Error('Trigger data not available in context');
    }

    const parts = expression.split('.');
    let current = context.triggerData;

    // Navigate through the trigger data object
    for (let i = 1; i < parts.length; i++) {
      if (current && typeof current === 'object' && parts[i] in current) {
        current = current[parts[i]];
      } else {
        throw new Error(`Trigger property not found: ${parts[i]}`);
      }
    }

    return current;
  }

  /**
   * Convert value to string representation
   */
  private convertToString(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Validate smart value expression
   */
  validateExpression(expression: string): { valid: boolean; error?: string } {
    try {
      const trimmedExpression = expression.trim();

      // Check for basic syntax
      if (!trimmedExpression) {
        return { valid: false, error: 'Expression cannot be empty' };
      }

      // Check for balanced braces
      const openBraces = (trimmedExpression.match(/\{\{/g) || []).length;
      const closeBraces = (trimmedExpression.match(/\}\}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        return { valid: false, error: 'Unbalanced braces in expression' };
      }

      // Check for supported prefixes
      const supportedPrefixes = ['issue.', 'project.', 'user.', 'now', 'webhook.', 'trigger.'];
      const hasValidPrefix = supportedPrefixes.some(prefix => 
        trimmedExpression.startsWith(prefix) || 
        trimmedExpression.startsWith('"') ||
        trimmedExpression.startsWith("'") ||
        /^\d+(\.\d+)?$/.test(trimmedExpression) ||
        ['true', 'false', 'null'].includes(trimmedExpression)
      );

      if (!hasValidPrefix) {
        return { 
          valid: false, 
          error: `Expression must start with one of: ${supportedPrefixes.join(', ')} or be a literal value` 
        };
      }

      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown validation error' 
      };
    }
  }

  /**
   * Get available smart values for context
   */
  getAvailableSmartValues(context: ExecutionContext): string[] {
    const smartValues: string[] = [
      // Date/time values
      'now',
      'now.plusDays(1)',
      'now.minusDays(1)',
      'now.plusHours(1)',
      'now.minusHours(1)',
      'now.format("yyyy-MM-dd")',
      'now.format("HH:mm:ss")'
    ];

    if (context.issueKey) {
      smartValues.push(
        'issue.key',
        'issue.summary',
        'issue.description',
        'issue.status',
        'issue.priority',
        'issue.assignee.displayName',
        'issue.assignee.emailAddress',
        'issue.reporter.displayName',
        'issue.reporter.emailAddress',
        'issue.created',
        'issue.updated'
      );
    }

    if (context.projectKey) {
      smartValues.push(
        'project.key',
        'project.name',
        'project.lead.displayName',
        'project.lead.emailAddress'
      );
    }

    if (context.userId) {
      smartValues.push(
        'user.accountId',
        'user.displayName',
        'user.emailAddress'
      );
    }

    if (context.webhookData) {
      smartValues.push(
        'webhook.data',
        'webhook.timestamp'
      );
    }

    if (context.triggerData) {
      smartValues.push(
        'trigger.type',
        'trigger.timestamp'
      );
    }

    return smartValues.sort();
  }
}
