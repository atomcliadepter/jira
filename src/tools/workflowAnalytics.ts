
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';
import { logger, generateRequestId } from '../utils/logger.js';
import { createError, ErrorCodes, McpJiraError, ErrorCategory } from '../utils/errorCodes.js';

// Schema definitions for analytics
const AnalyticsArgsSchema = z.object({
  jql: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: z.enum(['assignee', 'issueType', 'priority', 'component']).optional(),
  includeSubtasks: z.boolean().default(false),
  maxResults: z.number().default(1000)
});

const CycleTimeArgsSchema = z.object({
  jql: z.string(),
  startStatus: z.string().default('In Progress'),
  endStatus: z.string().default('Done'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: z.enum(['assignee', 'issueType', 'priority', 'component']).optional()
});

const LeadTimeArgsSchema = z.object({
  jql: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: z.enum(['assignee', 'issueType', 'priority', 'component']).optional()
});

const ThroughputArgsSchema = z.object({
  jql: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  interval: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  groupBy: z.enum(['assignee', 'issueType', 'priority', 'component']).optional()
});

export type AnalyticsArgs = z.infer<typeof AnalyticsArgsSchema>;
export type CycleTimeArgs = z.infer<typeof CycleTimeArgsSchema>;
export type LeadTimeArgs = z.infer<typeof LeadTimeArgsSchema>;
export type ThroughputArgs = z.infer<typeof ThroughputArgsSchema>;

export interface WorkflowMetrics {
  cycleTime: {
    median: number;
    average: number;
    percentile85: number;
    percentile95: number;
    min: number;
    max: number;
    count: number;
  };
  leadTime: {
    median: number;
    average: number;
    percentile85: number;
    percentile95: number;
    min: number;
    max: number;
    count: number;
  };
  throughput: {
    total: number;
    average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  workInProgress: {
    current: number;
    average: number;
    max: number;
  };
  flowEfficiency: number;
  defectRate: number;
}

export interface IssueMetrics {
  key: string;
  summary: string;
  issueType: string;
  priority: string;
  assignee: string | null;
  created: string;
  resolved: string | null;
  cycleTime: number | null;
  leadTime: number | null;
  statusHistory: Array<{
    status: string;
    entered: string;
    duration: number;
  }>;
}

export class WorkflowAnalytics {
  private client: JiraRestClient;
  private requestId: string;

  constructor(client: JiraRestClient) {
    this.client = client;
    this.requestId = generateRequestId();
  }

  /**
   * Calculate cycle time for issues
   */
  async calculateCycleTime(args: CycleTimeArgs): Promise<{
    metrics: WorkflowMetrics['cycleTime'];
    issues: Array<IssueMetrics>;
    groupedMetrics?: Record<string, WorkflowMetrics['cycleTime']>;
  }> {
    logger.info('Calculating cycle time', args, this.requestId);

    try {
      const issues = await this.fetchIssuesWithHistory(args.jql, args.startDate, args.endDate);
      const cycleTimeData: number[] = [];
      const issueMetrics: IssueMetrics[] = [];

      for (const issue of issues) {
        const cycleTime = this.calculateIssueCycleTime(issue, args.startStatus, args.endStatus);
        if (cycleTime !== null) {
          cycleTimeData.push(cycleTime);
        }

        issueMetrics.push({
          key: issue.key,
          summary: issue.fields.summary,
          issueType: issue.fields.issuetype.name,
          priority: issue.fields.priority?.name || 'None',
          assignee: issue.fields.assignee?.displayName || null,
          created: issue.fields.created,
          resolved: issue.fields.resolutiondate,
          cycleTime,
          leadTime: this.calculateIssueLeadTime(issue),
          statusHistory: this.extractStatusHistory(issue)
        });
      }

      const metrics = this.calculateTimeMetrics(cycleTimeData);
      let groupedMetrics: Record<string, WorkflowMetrics['cycleTime']> | undefined;

      if (args.groupBy) {
        groupedMetrics = this.groupMetricsByField(issueMetrics, args.groupBy, 'cycleTime');
      }

      return { metrics, issues: issueMetrics, groupedMetrics };
    } catch (error: any) {
      logger.error('Error calculating cycle time', { error: error.message }, this.requestId);
      throw new McpJiraError(
        ErrorCodes.JIRA_EXECUTION_ERROR.code,
        `Failed to calculate cycle time: ${error.message}`,
        ErrorCategory.EXECUTION,
        args,
        this.requestId
      );
    }
  }

  /**
   * Calculate lead time for issues
   */
  async calculateLeadTime(args: LeadTimeArgs): Promise<{
    metrics: WorkflowMetrics['leadTime'];
    issues: Array<IssueMetrics>;
    groupedMetrics?: Record<string, WorkflowMetrics['leadTime']>;
  }> {
    logger.info('Calculating lead time', args, this.requestId);

    try {
      const issues = await this.fetchIssuesWithHistory(args.jql, args.startDate, args.endDate);
      const leadTimeData: number[] = [];
      const issueMetrics: IssueMetrics[] = [];

      for (const issue of issues) {
        const leadTime = this.calculateIssueLeadTime(issue);
        if (leadTime !== null) {
          leadTimeData.push(leadTime);
        }

        issueMetrics.push({
          key: issue.key,
          summary: issue.fields.summary,
          issueType: issue.fields.issuetype.name,
          priority: issue.fields.priority?.name || 'None',
          assignee: issue.fields.assignee?.displayName || null,
          created: issue.fields.created,
          resolved: issue.fields.resolutiondate,
          cycleTime: this.calculateIssueCycleTime(issue, 'In Progress', 'Done'),
          leadTime,
          statusHistory: this.extractStatusHistory(issue)
        });
      }

      const metrics = this.calculateTimeMetrics(leadTimeData);
      let groupedMetrics: Record<string, WorkflowMetrics['leadTime']> | undefined;

      if (args.groupBy) {
        groupedMetrics = this.groupMetricsByField(issueMetrics, args.groupBy, 'leadTime');
      }

      return { metrics, issues: issueMetrics, groupedMetrics };
    } catch (error: any) {
      logger.error('Error calculating lead time', { error: error.message }, this.requestId);
      throw new McpJiraError(
        ErrorCodes.JIRA_EXECUTION_ERROR.code,
        `Failed to calculate lead time: ${error.message}`,
        ErrorCategory.EXECUTION,
        args,
        this.requestId
      );
    }
  }

  /**
   * Calculate throughput metrics
   */
  async calculateThroughput(args: ThroughputArgs): Promise<{
    metrics: WorkflowMetrics['throughput'];
    timeline: Array<{
      period: string;
      count: number;
      issues: string[];
    }>;
    groupedMetrics?: Record<string, WorkflowMetrics['throughput']>;
  }> {
    logger.info('Calculating throughput', args, this.requestId);

    try {
      const issues = await this.fetchIssuesWithHistory(args.jql, args.startDate, args.endDate);
      const resolvedIssues = issues.filter(issue => issue.fields.resolutiondate);

      const timeline = this.groupIssuesByTimeInterval(resolvedIssues, args.interval);
      const totalCount = resolvedIssues.length;
      const averageThroughput = timeline.length > 0 ? totalCount / timeline.length : 0;
      
      // Calculate trend
      const trend = this.calculateTrend(timeline.map(t => t.count));

      const metrics: WorkflowMetrics['throughput'] = {
        total: totalCount,
        average: averageThroughput,
        trend
      };

      let groupedMetrics: Record<string, WorkflowMetrics['throughput']> | undefined;
      if (args.groupBy) {
        groupedMetrics = this.groupThroughputByField(resolvedIssues, args.groupBy, args.interval);
      }

      return { metrics, timeline, groupedMetrics };
    } catch (error: any) {
      logger.error('Error calculating throughput', { error: error.message }, this.requestId);
      throw new McpJiraError(
        ErrorCodes.JIRA_EXECUTION_ERROR.code,
        `Failed to calculate throughput: ${error.message}`,
        ErrorCategory.EXECUTION,
        args,
        this.requestId
      );
    }
  }

  /**
   * Generate comprehensive workflow analytics
   */
  async generateWorkflowAnalytics(args: AnalyticsArgs): Promise<{
    summary: WorkflowMetrics;
    cycleTimeAnalysis: Awaited<ReturnType<WorkflowAnalytics['calculateCycleTime']>>;
    leadTimeAnalysis: Awaited<ReturnType<WorkflowAnalytics['calculateLeadTime']>>;
    throughputAnalysis: Awaited<ReturnType<WorkflowAnalytics['calculateThroughput']>>;
    recommendations: string[];
  }> {
    logger.info('Generating comprehensive workflow analytics', args, this.requestId);

    try {
      // Calculate all metrics in parallel
      const [cycleTimeAnalysis, leadTimeAnalysis, throughputAnalysis] = await Promise.all([
        this.calculateCycleTime({
          jql: args.jql,
          startDate: args.startDate,
          endDate: args.endDate,
          groupBy: args.groupBy,
          startStatus: 'In Progress',
          endStatus: 'Done'
        }),
        this.calculateLeadTime({
          jql: args.jql,
          startDate: args.startDate,
          endDate: args.endDate,
          groupBy: args.groupBy
        }),
        this.calculateThroughput({
          jql: args.jql,
          startDate: args.startDate,
          endDate: args.endDate,
          groupBy: args.groupBy,
          interval: 'weekly'
        })
      ]);

      // Calculate additional metrics
      const issues = await this.fetchIssuesWithHistory(args.jql, args.startDate, args.endDate);
      const wipMetrics = this.calculateWorkInProgress(issues);
      const flowEfficiency = this.calculateFlowEfficiency(cycleTimeAnalysis.issues);
      const defectRate = this.calculateDefectRate(issues);

      const summary: WorkflowMetrics = {
        cycleTime: cycleTimeAnalysis.metrics,
        leadTime: leadTimeAnalysis.metrics,
        throughput: throughputAnalysis.metrics,
        workInProgress: wipMetrics,
        flowEfficiency,
        defectRate
      };

      const recommendations = this.generateRecommendations(summary);

      return {
        summary,
        cycleTimeAnalysis,
        leadTimeAnalysis,
        throughputAnalysis,
        recommendations
      };
    } catch (error: any) {
      logger.error('Error generating workflow analytics', { error: error.message }, this.requestId);
      throw new McpJiraError(
        ErrorCodes.JIRA_EXECUTION_ERROR.code,
        `Failed to generate workflow analytics: ${error.message}`,
        ErrorCategory.EXECUTION,
        args,
        this.requestId
      );
    }
  }

  private async fetchIssuesWithHistory(jql: string, startDate?: string, endDate?: string): Promise<any[]> {
    let fullJql = jql;
    
    if (startDate || endDate) {
      const dateFilter = [];
      if (startDate) dateFilter.push(`created >= "${startDate}"`);
      if (endDate) dateFilter.push(`created <= "${endDate}"`);
      fullJql += ` AND ${dateFilter.join(' AND ')}`;
    }

    const response = await this.client.get('/rest/api/3/search', {
      params: {
        jql: fullJql,
        expand: 'changelog',
        fields: 'summary,issuetype,priority,assignee,created,resolutiondate,status',
        maxResults: 1000
      }
    });

    return response.issues || [];
  }

  private calculateIssueCycleTime(issue: any, startStatus: string, endStatus: string): number | null {
    const changelog = issue.changelog?.histories || [];
    let startTime: Date | null = null;
    let endTime: Date | null = null;

    for (const history of changelog) {
      for (const item of history.items) {
        if (item.field === 'status') {
          if (item.toString === startStatus && !startTime) {
            startTime = new Date(history.created);
          }
          if (item.toString === endStatus && startTime) {
            endTime = new Date(history.created);
            break;
          }
        }
      }
      if (endTime) break;
    }

    if (startTime && endTime) {
      return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24 * 10)) / 10; // Days with 1 decimal
    }

    return null;
  }

  private calculateIssueLeadTime(issue: any): number | null {
    const created = new Date(issue.fields.created);
    const resolved = issue.fields.resolutiondate ? new Date(issue.fields.resolutiondate) : null;

    if (resolved) {
      return Math.round((resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 10)) / 10; // Days with 1 decimal
    }

    return null;
  }

  private extractStatusHistory(issue: any): Array<{ status: string; entered: string; duration: number }> {
    const changelog = issue.changelog?.histories || [];
    const statusHistory: Array<{ status: string; entered: string; duration: number }> = [];
    let currentStatus = 'To Do';
    let currentTime = new Date(issue.fields.created);

    // Add initial status
    statusHistory.push({
      status: currentStatus,
      entered: issue.fields.created,
      duration: 0
    });

    for (const history of changelog) {
      for (const item of history.items) {
        if (item.field === 'status') {
          const historyTime = new Date(history.created);
          const duration = Math.round((historyTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24 * 10)) / 10;
          
          // Update duration of previous status
          if (statusHistory.length > 0) {
            statusHistory[statusHistory.length - 1].duration = duration;
          }

          // Add new status
          statusHistory.push({
            status: item.toString,
            entered: history.created,
            duration: 0
          });

          currentStatus = item.toString;
          currentTime = historyTime;
        }
      }
    }

    // Calculate duration for current status
    if (statusHistory.length > 0) {
      const now = issue.fields.resolutiondate ? new Date(issue.fields.resolutiondate) : new Date();
      const duration = Math.round((now.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24 * 10)) / 10;
      statusHistory[statusHistory.length - 1].duration = duration;
    }

    return statusHistory;
  }

  private calculateTimeMetrics(times: number[]): WorkflowMetrics['cycleTime'] {
    if (times.length === 0) {
      return {
        median: 0,
        average: 0,
        percentile85: 0,
        percentile95: 0,
        min: 0,
        max: 0,
        count: 0
      };
    }

    const sorted = times.sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);

    return {
      median: this.percentile(sorted, 50),
      average: Math.round((sum / times.length) * 10) / 10,
      percentile85: this.percentile(sorted, 85),
      percentile95: this.percentile(sorted, 95),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: times.length
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return Math.round((sorted[lower] * (1 - weight) + sorted[upper] * weight) * 10) / 10;
  }

  private groupMetricsByField(
    issues: IssueMetrics[], 
    groupBy: string, 
    metric: 'cycleTime' | 'leadTime'
  ): Record<string, WorkflowMetrics['cycleTime']> {
    const groups: Record<string, number[]> = {};

    for (const issue of issues) {
      let groupKey: string;
      switch (groupBy) {
        case 'assignee':
          groupKey = issue.assignee || 'Unassigned';
          break;
        case 'issueType':
          groupKey = issue.issueType;
          break;
        case 'priority':
          groupKey = issue.priority;
          break;
        default:
          groupKey = 'Unknown';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }

      const value = issue[metric];
      if (value !== null) {
        groups[groupKey].push(value);
      }
    }

    const result: Record<string, WorkflowMetrics['cycleTime']> = {};
    for (const [key, values] of Object.entries(groups)) {
      result[key] = this.calculateTimeMetrics(values);
    }

    return result;
  }

  private groupIssuesByTimeInterval(
    issues: any[], 
    interval: 'daily' | 'weekly' | 'monthly'
  ): Array<{ period: string; count: number; issues: string[] }> {
    const groups: Record<string, string[]> = {};

    for (const issue of issues) {
      const resolvedDate = new Date(issue.fields.resolutiondate);
      let periodKey: string;

      switch (interval) {
        case 'daily':
          periodKey = resolvedDate.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(resolvedDate);
          weekStart.setDate(resolvedDate.getDate() - resolvedDate.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          periodKey = `${resolvedDate.getFullYear()}-${String(resolvedDate.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!groups[periodKey]) {
        groups[periodKey] = [];
      }
      groups[periodKey].push(issue.key);
    }

    return Object.entries(groups)
      .map(([period, issues]) => ({
        period,
        count: issues.length,
        issues
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private groupThroughputByField(
    issues: any[], 
    groupBy: string, 
    interval: 'daily' | 'weekly' | 'monthly'
  ): Record<string, WorkflowMetrics['throughput']> {
    const groups: Record<string, any[]> = {};

    for (const issue of issues) {
      let groupKey: string;
      switch (groupBy) {
        case 'assignee':
          groupKey = issue.fields.assignee?.displayName || 'Unassigned';
          break;
        case 'issueType':
          groupKey = issue.fields.issuetype.name;
          break;
        case 'priority':
          groupKey = issue.fields.priority?.name || 'None';
          break;
        default:
          groupKey = 'Unknown';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(issue);
    }

    const result: Record<string, WorkflowMetrics['throughput']> = {};
    for (const [key, groupIssues] of Object.entries(groups)) {
      const timeline = this.groupIssuesByTimeInterval(groupIssues, interval);
      const total = groupIssues.length;
      const average = timeline.length > 0 ? total / timeline.length : 0;
      const trend = this.calculateTrend(timeline.map(t => t.count));

      result[key] = { total, average, trend };
    }

    return result;
  }

  private calculateWorkInProgress(issues: any[]): WorkflowMetrics['workInProgress'] {
    const inProgressStatuses = ['In Progress', 'In Review', 'Testing'];
    const wipIssues = issues.filter(issue => 
      inProgressStatuses.includes(issue.fields.status.name)
    );

    return {
      current: wipIssues.length,
      average: wipIssues.length, // Simplified - would need historical data for true average
      max: wipIssues.length // Simplified - would need historical data for true max
    };
  }

  private calculateFlowEfficiency(issues: IssueMetrics[]): number {
    let totalActiveTime = 0;
    let totalLeadTime = 0;

    for (const issue of issues) {
      if (issue.leadTime && issue.cycleTime) {
        totalActiveTime += issue.cycleTime;
        totalLeadTime += issue.leadTime;
      }
    }

    return totalLeadTime > 0 ? Math.round((totalActiveTime / totalLeadTime) * 100) : 0;
  }

  private calculateDefectRate(issues: any[]): number {
    const bugIssues = issues.filter(issue => 
      issue.fields.issuetype.name.toLowerCase().includes('bug') ||
      issue.fields.issuetype.name.toLowerCase().includes('defect')
    );

    return issues.length > 0 ? Math.round((bugIssues.length / issues.length) * 100) : 0;
  }

  private generateRecommendations(metrics: WorkflowMetrics): string[] {
    const recommendations: string[] = [];

    // Cycle time recommendations
    if (metrics.cycleTime.percentile95 > metrics.cycleTime.median * 3) {
      recommendations.push('High cycle time variance detected. Consider investigating outliers and standardizing processes.');
    }

    if (metrics.cycleTime.average > 10) {
      recommendations.push('Average cycle time is high. Consider breaking down large tasks and reducing work in progress.');
    }

    // Lead time recommendations
    if (metrics.leadTime.average > metrics.cycleTime.average * 2) {
      recommendations.push('Lead time significantly exceeds cycle time. Focus on reducing queue times and improving flow.');
    }

    // Throughput recommendations
    if (metrics.throughput.trend === 'decreasing') {
      recommendations.push('Throughput is decreasing. Review capacity, remove blockers, and optimize workflow.');
    }

    // WIP recommendations
    if (metrics.workInProgress.current > 20) {
      recommendations.push('High work in progress detected. Consider implementing WIP limits to improve flow.');
    }

    // Flow efficiency recommendations
    if (metrics.flowEfficiency < 25) {
      recommendations.push('Low flow efficiency. Focus on reducing wait times and improving handoffs between stages.');
    }

    // Defect rate recommendations
    if (metrics.defectRate > 15) {
      recommendations.push('High defect rate detected. Invest in quality practices, testing, and code reviews.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Workflow metrics look healthy. Continue monitoring and consider setting improvement targets.');
    }

    return recommendations;
  }
}

// Tool definitions
export const workflowAnalyticsTool: Tool = {
  name: 'workflow.analytics',
  description: 'Generate comprehensive workflow analytics including cycle time, lead time, throughput, and recommendations',
  inputSchema: {
    type: 'object',
    properties: {
      jql: {
        type: 'string',
        description: 'JQL query to filter issues for analysis'
      },
      startDate: {
        type: 'string',
        description: 'Start date for analysis (YYYY-MM-DD format)'
      },
      endDate: {
        type: 'string',
        description: 'End date for analysis (YYYY-MM-DD format)'
      },
      groupBy: {
        type: 'string',
        enum: ['assignee', 'issueType', 'priority', 'component'],
        description: 'Group metrics by field'
      },
      includeSubtasks: {
        type: 'boolean',
        description: 'Include subtasks in analysis',
        default: false
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of issues to analyze',
        default: 1000
      }
    },
    required: ['jql']
  }
};

export const cycleTimeTool: Tool = {
  name: 'workflow.cycle_time',
  description: 'Calculate cycle time metrics for issues',
  inputSchema: {
    type: 'object',
    properties: {
      jql: {
        type: 'string',
        description: 'JQL query to filter issues'
      },
      startStatus: {
        type: 'string',
        description: 'Status that marks the start of cycle time',
        default: 'In Progress'
      },
      endStatus: {
        type: 'string',
        description: 'Status that marks the end of cycle time',
        default: 'Done'
      },
      startDate: {
        type: 'string',
        description: 'Start date for analysis (YYYY-MM-DD format)'
      },
      endDate: {
        type: 'string',
        description: 'End date for analysis (YYYY-MM-DD format)'
      },
      groupBy: {
        type: 'string',
        enum: ['assignee', 'issueType', 'priority', 'component'],
        description: 'Group metrics by field'
      }
    },
    required: ['jql']
  }
};

export const leadTimeTool: Tool = {
  name: 'workflow.lead_time',
  description: 'Calculate lead time metrics for issues',
  inputSchema: {
    type: 'object',
    properties: {
      jql: {
        type: 'string',
        description: 'JQL query to filter issues'
      },
      startDate: {
        type: 'string',
        description: 'Start date for analysis (YYYY-MM-DD format)'
      },
      endDate: {
        type: 'string',
        description: 'End date for analysis (YYYY-MM-DD format)'
      },
      groupBy: {
        type: 'string',
        enum: ['assignee', 'issueType', 'priority', 'component'],
        description: 'Group metrics by field'
      }
    },
    required: ['jql']
  }
};

export const throughputTool: Tool = {
  name: 'workflow.throughput',
  description: 'Calculate throughput metrics for issues',
  inputSchema: {
    type: 'object',
    properties: {
      jql: {
        type: 'string',
        description: 'JQL query to filter issues'
      },
      startDate: {
        type: 'string',
        description: 'Start date for analysis (YYYY-MM-DD format)'
      },
      endDate: {
        type: 'string',
        description: 'End date for analysis (YYYY-MM-DD format)'
      },
      interval: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly'],
        description: 'Time interval for throughput calculation',
        default: 'weekly'
      },
      groupBy: {
        type: 'string',
        enum: ['assignee', 'issueType', 'priority', 'component'],
        description: 'Group metrics by field'
      }
    },
    required: ['jql']
  }
};

// Execution functions
export async function executeWorkflowAnalytics(client: JiraRestClient, args: any) {
  const validatedArgs = AnalyticsArgsSchema.parse(args);
  const analytics = new WorkflowAnalytics(client);
  return await analytics.generateWorkflowAnalytics(validatedArgs);
}

export async function executeCycleTime(client: JiraRestClient, args: any) {
  const validatedArgs = CycleTimeArgsSchema.parse(args);
  const analytics = new WorkflowAnalytics(client);
  return await analytics.calculateCycleTime(validatedArgs);
}

export async function executeLeadTime(client: JiraRestClient, args: any) {
  const validatedArgs = LeadTimeArgsSchema.parse(args);
  const analytics = new WorkflowAnalytics(client);
  return await analytics.calculateLeadTime(validatedArgs);
}

export async function executeThroughput(client: JiraRestClient, args: any) {
  const validatedArgs = ThroughputArgsSchema.parse(args);
  const analytics = new WorkflowAnalytics(client);
  return await analytics.calculateThroughput(validatedArgs);
}
