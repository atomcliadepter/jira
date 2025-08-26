
/**
 * Rule validation for automation engine
 */

import { logger } from '../utils/logger.js';
import {
  AutomationRule,
  RuleValidationResult,
  ValidationError,
  ValidationWarning,
  TriggerType,
  ActionType,
  ConditionType
} from './types.js';

export class RuleValidator {
  /**
   * Validate an automation rule
   */
  async validateRule(rule: AutomationRule): Promise<RuleValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Basic validation
      this.validateBasicFields(rule, errors);
      
      // Validate triggers
      this.validateTriggers(rule, errors, warnings);
      
      // Validate conditions
      this.validateConditions(rule, errors, warnings);
      
      // Validate actions
      this.validateActions(rule, errors, warnings);
      
      // Validate rule logic
      this.validateRuleLogic(rule, errors, warnings);

      logger.debug('Rule validation completed', {
        context: 'RuleValidator',
        ruleId: rule.id,
        errorsCount: errors.length,
        warningsCount: warnings.length
      });

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      logger.error('Rule validation failed', {
        context: 'RuleValidator',
        ruleId: rule.id,
        error: error instanceof Error ? error.message : String(error)
      });

      errors.push({
        field: 'general',
        message: 'Validation process failed',
        code: 'VALIDATION_ERROR'
      });

      return {
        valid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Validate basic rule fields
   */
  private validateBasicFields(rule: AutomationRule, errors: ValidationError[]): void {
    if (!rule.name || rule.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Rule name is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (rule.name && rule.name.length > 255) {
      errors.push({
        field: 'name',
        message: 'Rule name must be less than 255 characters',
        code: 'FIELD_TOO_LONG'
      });
    }

    if (rule.description && rule.description.length > 1000) {
      errors.push({
        field: 'description',
        message: 'Rule description must be less than 1000 characters',
        code: 'FIELD_TOO_LONG'
      });
    }

    if (!rule.triggers || rule.triggers.length === 0) {
      errors.push({
        field: 'triggers',
        message: 'At least one trigger is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!rule.actions || rule.actions.length === 0) {
      errors.push({
        field: 'actions',
        message: 'At least one action is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (rule.projectKeys && rule.projectKeys.length === 0) {
      errors.push({
        field: 'projectKeys',
        message: 'If specified, project keys cannot be empty',
        code: 'INVALID_VALUE'
      });
    }
  }

  /**
   * Validate triggers
   */
  private validateTriggers(
    rule: AutomationRule, 
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    if (!rule.triggers) return;

    rule.triggers.forEach((trigger, index) => {
      const fieldPrefix = `triggers[${index}]`;

      if (!Object.values(TriggerType).includes(trigger.type)) {
        errors.push({
          field: `${fieldPrefix}.type`,
          message: `Invalid trigger type: ${trigger.type}`,
          code: 'INVALID_ENUM_VALUE'
        });
        return;
      }

      // Validate trigger-specific configuration
      switch (trigger.type) {
        case TriggerType.SCHEDULED:
          this.validateScheduledTrigger(trigger, fieldPrefix, errors, warnings);
          break;
        case TriggerType.WEBHOOK:
          this.validateWebhookTrigger(trigger, fieldPrefix, errors, warnings);
          break;
        case TriggerType.FIELD_CHANGED:
          this.validateFieldChangedTrigger(trigger, fieldPrefix, errors, warnings);
          break;
        case TriggerType.ISSUE_TRANSITIONED:
          this.validateTransitionTrigger(trigger, fieldPrefix, errors, warnings);
          break;
      }
    });

    // Check for conflicting triggers
    const triggerTypes = rule.triggers.map(t => t.type);
    const hasScheduled = triggerTypes.includes(TriggerType.SCHEDULED);
    const hasManual = triggerTypes.includes(TriggerType.MANUAL);

    if (hasScheduled && hasManual) {
      warnings.push({
        field: 'triggers',
        message: 'Having both scheduled and manual triggers may cause confusion',
        suggestion: 'Consider separating into different rules'
      });
    }
  }

  /**
   * Validate scheduled trigger
   */
  private validateScheduledTrigger(
    trigger: any,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!trigger.config.cronExpression) {
      errors.push({
        field: `${fieldPrefix}.config.cronExpression`,
        message: 'Cron expression is required for scheduled triggers',
        code: 'REQUIRED_FIELD'
      });
      return;
    }

    // Basic cron validation (simplified)
    const cronParts = trigger.config.cronExpression.split(' ');
    if (cronParts.length !== 5 && cronParts.length !== 6) {
      errors.push({
        field: `${fieldPrefix}.config.cronExpression`,
        message: 'Invalid cron expression format',
        code: 'INVALID_FORMAT'
      });
    }

    // Warn about very frequent schedules
    if (trigger.config.cronExpression.includes('* * * * *')) {
      warnings.push({
        field: `${fieldPrefix}.config.cronExpression`,
        message: 'Very frequent schedule detected (every minute)',
        suggestion: 'Consider if this frequency is necessary'
      });
    }
  }

  /**
   * Validate webhook trigger
   */
  private validateWebhookTrigger(
    trigger: any,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (trigger.config.webhookUrl) {
      try {
        new URL(trigger.config.webhookUrl);
      } catch {
        errors.push({
          field: `${fieldPrefix}.config.webhookUrl`,
          message: 'Invalid webhook URL format',
          code: 'INVALID_URL'
        });
      }
    }

    if (!trigger.config.secret) {
      warnings.push({
        field: `${fieldPrefix}.config.secret`,
        message: 'Webhook secret not configured',
        suggestion: 'Consider adding a secret for security'
      });
    }
  }

  /**
   * Validate field changed trigger
   */
  private validateFieldChangedTrigger(
    trigger: any,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!trigger.config.fieldId) {
      errors.push({
        field: `${fieldPrefix}.config.fieldId`,
        message: 'Field ID is required for field changed triggers',
        code: 'REQUIRED_FIELD'
      });
    }
  }

  /**
   * Validate transition trigger
   */
  private validateTransitionTrigger(
    trigger: any,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!trigger.config.fromStatus && !trigger.config.toStatus) {
      warnings.push({
        field: `${fieldPrefix}.config`,
        message: 'No status filters configured',
        suggestion: 'Consider adding fromStatus or toStatus filters'
      });
    }
  }

  /**
   * Validate conditions
   */
  private validateConditions(
    rule: AutomationRule,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!rule.conditions) return;

    rule.conditions.forEach((condition, index) => {
      const fieldPrefix = `conditions[${index}]`;

      if (!Object.values(ConditionType).includes(condition.type)) {
        errors.push({
          field: `${fieldPrefix}.type`,
          message: `Invalid condition type: ${condition.type}`,
          code: 'INVALID_ENUM_VALUE'
        });
        return;
      }

      // Validate condition-specific configuration
      switch (condition.type) {
        case ConditionType.JQL:
          this.validateJqlCondition(condition, fieldPrefix, errors, warnings);
          break;
        case ConditionType.FIELD_VALUE:
          this.validateFieldValueCondition(condition, fieldPrefix, errors, warnings);
          break;
        case ConditionType.USER_IN_GROUP:
          this.validateUserInGroupCondition(condition, fieldPrefix, errors, warnings);
          break;
        case ConditionType.ISSUE_AGE:
          this.validateIssueAgeCondition(condition, fieldPrefix, errors, warnings);
          break;
      }
    });
  }

  /**
   * Validate JQL condition
   */
  private validateJqlCondition(
    condition: any,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!condition.config.jql) {
      errors.push({
        field: `${fieldPrefix}.config.jql`,
        message: 'JQL query is required for JQL conditions',
        code: 'REQUIRED_FIELD'
      });
      return;
    }

    // Basic JQL validation
    const jql = condition.config.jql.toLowerCase();
    if (jql.includes('delete') || jql.includes('drop') || jql.includes('update')) {
      errors.push({
        field: `${fieldPrefix}.config.jql`,
        message: 'JQL query contains potentially dangerous keywords',
        code: 'SECURITY_VIOLATION'
      });
    }
  }

  /**
   * Validate field value condition
   */
  private validateFieldValueCondition(
    condition: any,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!condition.config.fieldId) {
      errors.push({
        field: `${fieldPrefix}.config.fieldId`,
        message: 'Field ID is required for field value conditions',
        code: 'REQUIRED_FIELD'
      });
    }

    if (condition.config.expectedValue === undefined || condition.config.expectedValue === null) {
      warnings.push({
        field: `${fieldPrefix}.config.expectedValue`,
        message: 'Expected value not specified',
        suggestion: 'Consider specifying an expected value'
      });
    }
  }

  /**
   * Validate user in group condition
   */
  private validateUserInGroupCondition(
    condition: any,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!condition.config.groupName) {
      errors.push({
        field: `${fieldPrefix}.config.groupName`,
        message: 'Group name is required for user in group conditions',
        code: 'REQUIRED_FIELD'
      });
    }
  }

  /**
   * Validate issue age condition
   */
  private validateIssueAgeCondition(
    condition: any,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (condition.config.ageInDays === undefined || condition.config.ageInDays < 0) {
      errors.push({
        field: `${fieldPrefix}.config.ageInDays`,
        message: 'Age in days must be a non-negative number',
        code: 'INVALID_VALUE'
      });
    }
  }

  /**
   * Validate actions
   */
  private validateActions(
    rule: AutomationRule,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!rule.actions) return;

    const orders = rule.actions.map(a => a.order);
    const duplicateOrders = orders.filter((order, index) => orders.indexOf(order) !== index);
    
    if (duplicateOrders.length > 0) {
      errors.push({
        field: 'actions',
        message: 'Duplicate action orders found',
        code: 'DUPLICATE_VALUES'
      });
    }

    rule.actions.forEach((action, index) => {
      const fieldPrefix = `actions[${index}]`;

      if (!Object.values(ActionType).includes(action.type)) {
        errors.push({
          field: `${fieldPrefix}.type`,
          message: `Invalid action type: ${action.type}`,
          code: 'INVALID_ENUM_VALUE'
        });
        return;
      }

      // Validate action-specific configuration
      switch (action.type) {
        case ActionType.UPDATE_ISSUE:
          this.validateUpdateIssueAction(action, fieldPrefix, errors, warnings);
          break;
        case ActionType.TRANSITION_ISSUE:
          this.validateTransitionIssueAction(action, fieldPrefix, errors, warnings);
          break;
        case ActionType.CREATE_ISSUE:
          this.validateCreateIssueAction(action, fieldPrefix, errors, warnings);
          break;
        case ActionType.SEND_NOTIFICATION:
          this.validateSendNotificationAction(action, fieldPrefix, errors, warnings);
          break;
        case ActionType.WEBHOOK_CALL:
          this.validateWebhookCallAction(action, fieldPrefix, errors, warnings);
          break;
        case ActionType.BULK_OPERATION:
          this.validateBulkOperationAction(action, fieldPrefix, errors, warnings);
          break;
      }
    });
  }

  /**
   * Validate update issue action
   */
  private validateUpdateIssueAction(
    action: any,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!action.config.fields || Object.keys(action.config.fields).length === 0) {
      warnings.push({
        field: `${fieldPrefix}.config.fields`,
        message: 'No fields specified for update',
        suggestion: 'Specify fields to update'
      });
    }
  }

  /**
   * Validate transition issue action
   */
  private validateTransitionIssueAction(
    action: any,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!action.config.transitionId && !action.config.transitionName) {
      errors.push({
        field: `${fieldPrefix}.config`,
        message: 'Either transition ID or name is required',
        code: 'REQUIRED_FIELD'
      });
    }
  }

  /**
   * Validate create issue action
   */
  private validateCreateIssueAction(
    action: any,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!action.config.projectKey) {
      errors.push({
        field: `${fieldPrefix}.config.projectKey`,
        message: 'Project key is required for create issue action',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!action.config.issueType) {
      errors.push({
        field: `${fieldPrefix}.config.issueType`,
        message: 'Issue type is required for create issue action',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!action.config.summary) {
      errors.push({
        field: `${fieldPrefix}.config.summary`,
        message: 'Summary is required for create issue action',
        code: 'REQUIRED_FIELD'
      });
    }
  }

  /**
   * Validate send notification action
   */
  private validateSendNotificationAction(
    action: any,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!action.config.recipients || action.config.recipients.length === 0) {
      errors.push({
        field: `${fieldPrefix}.config.recipients`,
        message: 'Recipients are required for notification action',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!action.config.message) {
      warnings.push({
        field: `${fieldPrefix}.config.message`,
        message: 'No message specified',
        suggestion: 'Consider adding a message'
      });
    }
  }

  /**
   * Validate webhook call action
   */
  private validateWebhookCallAction(
    action: any,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!action.config.url) {
      errors.push({
        field: `${fieldPrefix}.config.url`,
        message: 'URL is required for webhook call action',
        code: 'REQUIRED_FIELD'
      });
      return;
    }

    try {
      new URL(action.config.url);
    } catch {
      errors.push({
        field: `${fieldPrefix}.config.url`,
        message: 'Invalid URL format',
        code: 'INVALID_URL'
      });
    }

    if (!action.config.method) {
      warnings.push({
        field: `${fieldPrefix}.config.method`,
        message: 'HTTP method not specified, defaulting to POST',
        suggestion: 'Explicitly specify the HTTP method'
      });
    }
  }

  /**
   * Validate bulk operation action
   */
  private validateBulkOperationAction(
    action: any,
    fieldPrefix: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!action.config.jql) {
      errors.push({
        field: `${fieldPrefix}.config.jql`,
        message: 'JQL query is required for bulk operation action',
        code: 'REQUIRED_FIELD'
      });
    }

    if (action.config.maxIssues && action.config.maxIssues > 10000) {
      warnings.push({
        field: `${fieldPrefix}.config.maxIssues`,
        message: 'Large bulk operation detected',
        suggestion: 'Consider breaking into smaller operations'
      });
    }
  }

  /**
   * Validate rule logic
   */
  private validateRuleLogic(
    rule: AutomationRule,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Check for potential infinite loops
    const hasIssueUpdateTrigger = rule.triggers.some(t => t.type === TriggerType.ISSUE_UPDATED);
    const hasIssueUpdateAction = rule.actions.some(a => a.type === ActionType.UPDATE_ISSUE);

    if (hasIssueUpdateTrigger && hasIssueUpdateAction) {
      warnings.push({
        field: 'rule',
        message: 'Potential infinite loop detected',
        suggestion: 'Add conditions to prevent the rule from triggering itself'
      });
    }

    // Check for performance concerns
    const hasBulkOperation = rule.actions.some(a => a.type === ActionType.BULK_OPERATION);
    const hasFrequentTrigger = rule.triggers.some(t => 
      t.type === TriggerType.ISSUE_UPDATED || 
      (t.type === TriggerType.SCHEDULED && t.config.cronExpression?.includes('*'))
    );

    if (hasBulkOperation && hasFrequentTrigger) {
      warnings.push({
        field: 'rule',
        message: 'Performance concern: bulk operations with frequent triggers',
        suggestion: 'Consider using less frequent triggers or smaller batch sizes'
      });
    }
  }
}
