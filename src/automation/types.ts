
/**
 * Type definitions for the Automation Engine
 */

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  projectKeys?: string[];
  triggers: AutomationTrigger[];
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastExecuted?: Date;
  executionCount: number;
  failureCount: number;
}

export interface AutomationTrigger {
  type: TriggerType;
  config: TriggerConfig;
}

export enum TriggerType {
  ISSUE_CREATED = 'issue_created',
  ISSUE_UPDATED = 'issue_updated',
  ISSUE_TRANSITIONED = 'issue_transitioned',
  ISSUE_COMMENTED = 'issue_commented',
  SCHEDULED = 'scheduled',
  WEBHOOK = 'webhook',
  MANUAL = 'manual',
  FIELD_CHANGED = 'field_changed',
  SLA_BREACH = 'sla_breach'
}

export interface TriggerConfig {
  // Common config
  projectKeys?: string[];
  issueTypes?: string[];
  
  // Issue update specific
  fields?: string[];
  
  // Transition specific
  fromStatus?: string[];
  toStatus?: string[];
  
  // Scheduled specific
  cronExpression?: string;
  timezone?: string;
  
  // Webhook specific
  webhookUrl?: string;
  secret?: string;
  
  // Field change specific
  fieldId?: string;
  fromValue?: any;
  toValue?: any;
}

export interface AutomationCondition {
  type: ConditionType;
  config: ConditionConfig;
  operator?: 'AND' | 'OR';
}

export enum ConditionType {
  JQL = 'jql',
  FIELD_VALUE = 'field_value',
  USER_IN_GROUP = 'user_in_group',
  PROJECT_CATEGORY = 'project_category',
  ISSUE_AGE = 'issue_age',
  CUSTOM_SCRIPT = 'custom_script',
  SMART_VALUE = 'smart_value'
}

export interface ConditionConfig {
  jql?: string;
  fieldId?: string;
  expectedValue?: any;
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  groupName?: string;
  categoryId?: string;
  ageInDays?: number;
  scriptCode?: string;
  smartValueExpression?: string;
}

export interface AutomationAction {
  type: ActionType;
  config: ActionConfig;
  order: number;
  continueOnError?: boolean;
}

export enum ActionType {
  UPDATE_ISSUE = 'update_issue',
  TRANSITION_ISSUE = 'transition_issue',
  CREATE_ISSUE = 'create_issue',
  ADD_COMMENT = 'add_comment',
  ASSIGN_ISSUE = 'assign_issue',
  SEND_NOTIFICATION = 'send_notification',
  WEBHOOK_CALL = 'webhook_call',
  BULK_OPERATION = 'bulk_operation',
  CREATE_SUBTASK = 'create_subtask',
  LINK_ISSUES = 'link_issues',
  UPDATE_CUSTOM_FIELD = 'update_custom_field'
}

export interface ActionConfig {
  // Update issue
  fields?: Record<string, any>;
  
  // Transition
  transitionId?: string;
  transitionName?: string;
  
  // Create issue
  projectKey?: string;
  issueType?: string;
  summary?: string;
  description?: string;
  
  // Comment
  comment?: string;
  visibility?: 'public' | 'internal';
  
  // Assignment
  assigneeId?: string;
  assigneeEmail?: string;
  
  // Notification
  recipients?: string[];
  subject?: string;
  message?: string;
  channel?: 'email' | 'slack' | 'teams';
  
  // Webhook
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  payload?: any;
  
  // Bulk operation
  jql?: string;
  batchSize?: number;
  maxIssues?: number;
  
  // Subtask
  parentIssueKey?: string;
  
  // Link issues
  linkType?: string;
  targetIssueKey?: string;
  
  // Custom field
  customFieldId?: string;
  customFieldValue?: any;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  triggeredAt: Date;
  triggeredBy: string;
  status: ExecutionStatus;
  context: ExecutionContext;
  results: ActionResult[];
  error?: string;
  duration: number;
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface ExecutionContext {
  issueKey?: string;
  projectKey?: string;
  userId?: string;
  webhookData?: any;
  triggerData?: any;
}

export interface ActionResult {
  actionType: ActionType;
  status: 'success' | 'failed' | 'skipped';
  message?: string;
  data?: any;
  duration: number;
}

export interface BulkOperationProgress {
  id: string;
  ruleId: string;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  status: ExecutionStatus;
  startedAt: Date;
  estimatedCompletion?: Date;
  errors: BulkOperationError[];
}

export interface BulkOperationError {
  itemKey: string;
  error: string;
  timestamp: Date;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  escalationRules: EscalationRule[];
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'teams' | 'webhook';
  config: {
    recipients?: string[];
    webhookUrl?: string;
    channel?: string;
    template?: string;
  };
}

export interface EscalationRule {
  id: string;
  name: string;
  conditions: EscalationCondition[];
  actions: EscalationAction[];
  delayMinutes: number;
}

export interface EscalationCondition {
  type: 'execution_failed' | 'no_response' | 'sla_breach' | 'custom';
  config: any;
}

export interface EscalationAction {
  type: 'notify_manager' | 'create_incident' | 'escalate_priority' | 'webhook';
  config: any;
}

export interface WebhookIntegration {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  headers?: Record<string, string>;
  retryPolicy: RetryPolicy;
  enabled: boolean;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

export interface AutomationMetrics {
  ruleId: string;
  executionCount: number;
  successRate: number;
  averageDuration: number;
  lastExecution?: Date;
  failureReasons: Record<string, number>;
}

export interface SmartValue {
  expression: string;
  context: ExecutionContext;
}

export interface RuleValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}
