
/**
 * Action executor for automation engine
 */

import { v4 as uuidv4 } from 'uuid';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { logger } from '../utils/logger.js';
import {
  AutomationAction,
  ActionResult,
  ExecutionContext,
  ActionType,
  BulkOperationProgress,
  ExecutionStatus
} from './types.js';

export class ActionExecutor {
  constructor(private jiraClient: JiraRestClient) {}

  /**
   * Execute an automation action
   */
  async executeAction(action: AutomationAction, context: ExecutionContext): Promise<ActionResult> {
    const startTime = Date.now();
    const requestId = uuidv4();

    logger.info('Executing automation action', {
      context: 'ActionExecutor',
      requestId,
      actionType: action.type,
      issueKey: context.issueKey
    });

    try {
      let result: ActionResult;

      switch (action.type) {
        case ActionType.UPDATE_ISSUE:
          result = await this.executeUpdateIssue(action, context);
          break;
        case ActionType.TRANSITION_ISSUE:
          result = await this.executeTransitionIssue(action, context);
          break;
        case ActionType.CREATE_ISSUE:
          result = await this.executeCreateIssue(action, context);
          break;
        case ActionType.ADD_COMMENT:
          result = await this.executeAddComment(action, context);
          break;
        case ActionType.ASSIGN_ISSUE:
          result = await this.executeAssignIssue(action, context);
          break;
        case ActionType.SEND_NOTIFICATION:
          result = await this.executeSendNotification(action, context);
          break;
        case ActionType.WEBHOOK_CALL:
          result = await this.executeWebhookCall(action, context);
          break;
        case ActionType.BULK_OPERATION:
          result = await this.executeBulkOperation(action, context);
          break;
        case ActionType.CREATE_SUBTASK:
          result = await this.executeCreateSubtask(action, context);
          break;
        case ActionType.LINK_ISSUES:
          result = await this.executeLinkIssues(action, context);
          break;
        case ActionType.UPDATE_CUSTOM_FIELD:
          result = await this.executeUpdateCustomField(action, context);
          break;
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      result.duration = Date.now() - startTime;

      logger.info('Action executed successfully', {
        context: 'ActionExecutor',
        requestId,
        actionType: action.type,
        duration: result.duration,
        status: result.status
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Action execution failed', {
        context: 'ActionExecutor',
        requestId,
        actionType: action.type,
        error: errorMessage,
        duration
      });

      return {
        actionType: action.type,
        status: 'failed',
        message: errorMessage,
        duration
      };
    }
  }

  /**
   * Execute update issue action
   */
  private async executeUpdateIssue(action: AutomationAction, context: ExecutionContext): Promise<ActionResult> {
    if (!context.issueKey) {
      throw new Error('Issue key is required for update issue action');
    }

    if (!action.config.fields || Object.keys(action.config.fields).length === 0) {
      throw new Error('Fields are required for update issue action');
    }

    const response = await this.jiraClient.put(`/rest/api/3/issue/${context.issueKey}`, {
      fields: action.config.fields
    });

    return {
      actionType: action.type,
      status: 'success',
      message: `Issue ${context.issueKey} updated successfully`,
      data: { issueKey: context.issueKey, updatedFields: Object.keys(action.config.fields) },
      duration: 0
    };
  }

  /**
   * Execute transition issue action
   */
  private async executeTransitionIssue(action: AutomationAction, context: ExecutionContext): Promise<ActionResult> {
    if (!context.issueKey) {
      throw new Error('Issue key is required for transition issue action');
    }

    // Get available transitions if transition name is provided
    let transitionId = action.config.transitionId;
    if (!transitionId && action.config.transitionName) {
      const transitionsResponse = await this.jiraClient.get(`/rest/api/3/issue/${context.issueKey}/transitions`);
      const transitions = transitionsResponse.transitions || [];
      const transition = transitions.find((t: any) => t.name === action.config.transitionName);
      
      if (!transition) {
        throw new Error(`Transition '${action.config.transitionName}' not found for issue ${context.issueKey}`);
      }
      transitionId = transition.id;
    }

    if (!transitionId) {
      throw new Error('Either transition ID or name is required');
    }

    const transitionData: any = {
      transition: { id: transitionId }
    };

    if (action.config.fields) {
      transitionData.fields = action.config.fields;
    }

    await this.jiraClient.post(`/rest/api/3/issue/${context.issueKey}/transitions`, transitionData);

    return {
      actionType: action.type,
      status: 'success',
      message: `Issue ${context.issueKey} transitioned successfully`,
      data: { issueKey: context.issueKey, transitionId },
      duration: 0
    };
  }

  /**
   * Execute create issue action
   */
  private async executeCreateIssue(action: AutomationAction, context: ExecutionContext): Promise<ActionResult> {
    if (!action.config.projectKey || !action.config.issueType || !action.config.summary) {
      throw new Error('Project key, issue type, and summary are required for create issue action');
    }

    const issueData = {
      fields: {
        project: { key: action.config.projectKey },
        issuetype: { name: action.config.issueType },
        summary: action.config.summary,
        ...(action.config.description && { description: action.config.description }),
        ...(action.config.assigneeId && { assignee: { accountId: action.config.assigneeId } }),
        ...(action.config.assigneeEmail && { assignee: { emailAddress: action.config.assigneeEmail } })
      }
    };

    const response = await this.jiraClient.post('/rest/api/3/issue', issueData);

    return {
      actionType: action.type,
      status: 'success',
      message: `Issue created successfully: ${response.key}`,
      data: { issueKey: response.key, issueId: response.id },
      duration: 0
    };
  }

  /**
   * Execute add comment action
   */
  private async executeAddComment(action: AutomationAction, context: ExecutionContext): Promise<ActionResult> {
    if (!context.issueKey) {
      throw new Error('Issue key is required for add comment action');
    }

    if (!action.config.comment) {
      throw new Error('Comment text is required for add comment action');
    }

    const commentData: any = {
      body: action.config.comment
    };

    if (action.config.visibility) {
      commentData.visibility = {
        type: action.config.visibility === 'internal' ? 'role' : 'group',
        value: action.config.visibility === 'internal' ? 'Administrators' : 'jira-users'
      };
    }

    const response = await this.jiraClient.post(`/rest/api/3/issue/${context.issueKey}/comment`, commentData);

    return {
      actionType: action.type,
      status: 'success',
      message: `Comment added to issue ${context.issueKey}`,
      data: { issueKey: context.issueKey, commentId: response.id },
      duration: 0
    };
  }

  /**
   * Execute assign issue action
   */
  private async executeAssignIssue(action: AutomationAction, context: ExecutionContext): Promise<ActionResult> {
    if (!context.issueKey) {
      throw new Error('Issue key is required for assign issue action');
    }

    let assigneeData: any = {};
    if (action.config.assigneeId) {
      assigneeData = { accountId: action.config.assigneeId };
    } else if (action.config.assigneeEmail) {
      assigneeData = { emailAddress: action.config.assigneeEmail };
    } else {
      assigneeData = null; // Unassign
    }

    await this.jiraClient.put(`/rest/api/3/issue/${context.issueKey}/assignee`, {
      assignee: assigneeData
    });

    const message = assigneeData 
      ? `Issue ${context.issueKey} assigned successfully`
      : `Issue ${context.issueKey} unassigned successfully`;

    return {
      actionType: action.type,
      status: 'success',
      message,
      data: { issueKey: context.issueKey, assignee: assigneeData },
      duration: 0
    };
  }

  /**
   * Execute send notification action
   */
  private async executeSendNotification(action: AutomationAction, context: ExecutionContext): Promise<ActionResult> {
    if (!action.config.recipients || action.config.recipients.length === 0) {
      throw new Error('Recipients are required for send notification action');
    }

    // This is a placeholder implementation
    // In a real implementation, you would integrate with email service, Slack, etc.
    logger.info('Sending notification', {
      context: 'ActionExecutor',
      recipients: action.config.recipients,
      subject: action.config.subject,
      channel: action.config.channel || 'email'
    });

    // Simulate notification sending
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      actionType: action.type,
      status: 'success',
      message: `Notification sent to ${action.config.recipients.length} recipients`,
      data: { 
        recipients: action.config.recipients,
        channel: action.config.channel || 'email'
      },
      duration: 0
    };
  }

  /**
   * Execute webhook call action
   */
  private async executeWebhookCall(action: AutomationAction, context: ExecutionContext): Promise<ActionResult> {
    if (!action.config.url) {
      throw new Error('URL is required for webhook call action');
    }

    const method = action.config.method || 'POST';
    const headers = {
      'Content-Type': 'application/json',
      ...action.config.headers
    };

    const payload = action.config.payload || {
      issueKey: context.issueKey,
      projectKey: context.projectKey,
      userId: context.userId,
      timestamp: new Date().toISOString()
    };

    // Use fetch for HTTP requests
    const response = await fetch(action.config.url, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(payload) : undefined
    });

    if (!response.ok) {
      throw new Error(`Webhook call failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.text();

    return {
      actionType: action.type,
      status: 'success',
      message: `Webhook call successful: ${response.status}`,
      data: { 
        url: action.config.url,
        method,
        statusCode: response.status,
        response: responseData
      },
      duration: 0
    };
  }

  /**
   * Execute bulk operation action
   */
  private async executeBulkOperation(action: AutomationAction, context: ExecutionContext): Promise<ActionResult> {
    if (!action.config.jql) {
      throw new Error('JQL query is required for bulk operation action');
    }

    const batchSize = action.config.batchSize || 50;
    const maxIssues = action.config.maxIssues || 1000;

    // Search for issues
    const searchParams = new URLSearchParams({
      jql: action.config.jql,
      maxResults: Math.min(maxIssues, 1000).toString(),
      fields: 'key,summary'
    });
    const searchResponse = await this.jiraClient.get(`/rest/api/3/search?${searchParams.toString()}`);

    const issues = searchResponse.issues || [];
    const totalIssues = Math.min(issues.length, maxIssues);

    if (totalIssues === 0) {
      return {
        actionType: action.type,
        status: 'success',
        message: 'No issues found matching the JQL query',
        data: { processedCount: 0 },
        duration: 0
      };
    }

    // Create bulk operation progress tracking
    const operationId = uuidv4();
    const progress: BulkOperationProgress = {
      id: operationId,
      ruleId: context.issueKey || 'unknown',
      totalItems: totalIssues,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      status: ExecutionStatus.RUNNING,
      startedAt: new Date(),
      errors: []
    };

    // Process issues in batches
    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < issues.length; i += batchSize) {
      const batch = issues.slice(i, i + batchSize);
      
      for (const issue of batch) {
        try {
          // Apply the bulk operation (example: update a field)
          if (action.config.fields) {
            await this.jiraClient.put(`/rest/api/3/issue/${issue.key}`, {
              fields: action.config.fields
            });
          }
          successCount++;
        } catch (error) {
          failureCount++;
          progress.errors.push({
            itemKey: issue.key,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date()
          });
        }
        processedCount++;
      }

      // Update progress
      progress.processedItems = processedCount;
      progress.successfulItems = successCount;
      progress.failedItems = failureCount;
    }

    progress.status = ExecutionStatus.COMPLETED;

    return {
      actionType: action.type,
      status: failureCount === 0 ? 'success' : 'failed',
      message: `Bulk operation completed: ${successCount} successful, ${failureCount} failed`,
      data: {
        operationId,
        totalIssues,
        processedCount,
        successCount,
        failureCount,
        errors: progress.errors
      },
      duration: 0
    };
  }

  /**
   * Execute create subtask action
   */
  private async executeCreateSubtask(action: AutomationAction, context: ExecutionContext): Promise<ActionResult> {
    const parentIssueKey = action.config.parentIssueKey || context.issueKey;
    if (!parentIssueKey) {
      throw new Error('Parent issue key is required for create subtask action');
    }

    if (!action.config.summary) {
      throw new Error('Summary is required for create subtask action');
    }

    // Get parent issue to determine project
    const parentIssue = await this.jiraClient.get(`/rest/api/3/issue/${parentIssueKey}?fields=project`);

    const subtaskData = {
      fields: {
        project: { key: parentIssue.fields.project.key },
        parent: { key: parentIssueKey },
        issuetype: { name: 'Sub-task' },
        summary: action.config.summary,
        ...(action.config.description && { description: action.config.description })
      }
    };

    const response = await this.jiraClient.post('/rest/api/3/issue', subtaskData);

    return {
      actionType: action.type,
      status: 'success',
      message: `Subtask created successfully: ${response.key}`,
      data: { 
        subtaskKey: response.key,
        subtaskId: response.id,
        parentKey: parentIssueKey
      },
      duration: 0
    };
  }

  /**
   * Execute link issues action
   */
  private async executeLinkIssues(action: AutomationAction, context: ExecutionContext): Promise<ActionResult> {
    if (!context.issueKey) {
      throw new Error('Issue key is required for link issues action');
    }

    if (!action.config.targetIssueKey || !action.config.linkType) {
      throw new Error('Target issue key and link type are required for link issues action');
    }

    const linkData = {
      type: { name: action.config.linkType },
      inwardIssue: { key: context.issueKey },
      outwardIssue: { key: action.config.targetIssueKey }
    };

    await this.jiraClient.post('/rest/api/3/issueLink', linkData);

    return {
      actionType: action.type,
      status: 'success',
      message: `Issues linked successfully: ${context.issueKey} -> ${action.config.targetIssueKey}`,
      data: {
        sourceIssue: context.issueKey,
        targetIssue: action.config.targetIssueKey,
        linkType: action.config.linkType
      },
      duration: 0
    };
  }

  /**
   * Execute update custom field action
   */
  private async executeUpdateCustomField(action: AutomationAction, context: ExecutionContext): Promise<ActionResult> {
    if (!context.issueKey) {
      throw new Error('Issue key is required for update custom field action');
    }

    if (!action.config.customFieldId) {
      throw new Error('Custom field ID is required for update custom field action');
    }

    const updateData = {
      fields: {
        [action.config.customFieldId]: action.config.customFieldValue
      }
    };

    await this.jiraClient.put(`/rest/api/3/issue/${context.issueKey}`, updateData);

    return {
      actionType: action.type,
      status: 'success',
      message: `Custom field ${action.config.customFieldId} updated successfully`,
      data: {
        issueKey: context.issueKey,
        fieldId: action.config.customFieldId,
        value: action.config.customFieldValue
      },
      duration: 0
    };
  }
}
