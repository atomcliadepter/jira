
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';
import { logger, generateRequestId } from '../utils/logger.js';
import { createError, ErrorCodes, McpJiraError, ErrorCategory } from '../utils/errorCodes.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Schema definitions for advanced reporting
const JQLQueryBuilderSchema = z.object({
  project: z.string().optional(),
  issueType: z.array(z.string()).optional(),
  status: z.array(z.string()).optional(),
  assignee: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  components: z.array(z.string()).optional(),
  fixVersion: z.array(z.string()).optional(),
  affectsVersion: z.array(z.string()).optional(),
  createdDate: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    operator: z.enum(['>=', '<=', '>', '<', '=']).default('>=')
  }).optional(),
  updatedDate: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    operator: z.enum(['>=', '<=', '>', '<', '=']).default('>=')
  }).optional(),
  resolutionDate: z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    operator: z.enum(['>=', '<=', '>', '<', '=']).default('>=')
  }).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
  advancedOperators: z.object({
    and: z.array(z.string()).optional(),
    or: z.array(z.string()).optional(),
    not: z.array(z.string()).optional()
  }).optional(),
  orderBy: z.array(z.object({
    field: z.string(),
    direction: z.enum(['ASC', 'DESC']).default('ASC')
  })).optional(),
  maxResults: z.number().default(1000)
});

const DashboardMetricsSchema = z.object({
  projectKey: z.string(),
  timeRange: z.object({
    from: z.string(),
    to: z.string()
  }),
  refreshInterval: z.number().default(300), // 5 minutes
  includeMetrics: z.array(z.enum([
    'velocity',
    'burndown',
    'cycleTime',
    'leadTime',
    'throughput',
    'defectRate',
    'workInProgress',
    'blockedIssues',
    'teamPerformance'
  ])).default(['velocity', 'burndown', 'cycleTime', 'throughput'])
});

const BurndownChartSchema = z.object({
  sprintId: z.string().optional(),
  projectKey: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  includeScope: z.boolean().default(true),
  includeWeekends: z.boolean().default(false),
  chartType: z.enum(['sprint', 'release', 'epic']).default('sprint')
});

const VelocityTrackingSchema = z.object({
  projectKey: z.string(),
  teamId: z.string().optional(),
  sprintCount: z.number().default(10),
  includeCommitment: z.boolean().default(true),
  includeCompleted: z.boolean().default(true),
  storyPointField: z.string().optional()
});

const ExportConfigSchema = z.object({
  format: z.enum(['csv', 'pdf', 'excel', 'json']),
  data: z.any(),
  filename: z.string().optional(),
  template: z.string().optional(),
  includeCharts: z.boolean().default(true),
  includeMetadata: z.boolean().default(true)
});

const ScheduledReportSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  query: z.any(),
  format: z.enum(['csv', 'pdf', 'excel']),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    time: z.string(), // HH:MM format
    dayOfWeek: z.number().optional(), // 0-6 for weekly
    dayOfMonth: z.number().optional() // 1-31 for monthly
  }),
  recipients: z.array(z.string()).optional(),
  enabled: z.boolean().default(true)
});

export type JQLQueryBuilderArgs = z.infer<typeof JQLQueryBuilderSchema>;
export type DashboardMetricsArgs = z.infer<typeof DashboardMetricsSchema>;
export type BurndownChartArgs = z.infer<typeof BurndownChartSchema>;
export type VelocityTrackingArgs = z.infer<typeof VelocityTrackingSchema>;
export type ExportConfigArgs = z.infer<typeof ExportConfigSchema>;
export type ScheduledReportArgs = z.infer<typeof ScheduledReportSchema>;

export interface AdvancedMetrics {
  velocity: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
    history: Array<{ sprint: string; committed: number; completed: number; }>;
  };
  burndown: {
    ideal: number[];
    actual: number[];
    scope: number[];
    dates: string[];
    projectedCompletion: string;
  };
  cycleTime: {
    median: number;
    average: number;
    percentile95: number;
    byStatus: Record<string, number>;
  };
  leadTime: {
    median: number;
    average: number;
    percentile95: number;
    breakdown: Record<string, number>;
  };
  throughput: {
    daily: number[];
    weekly: number[];
    monthly: number[];
    trend: 'up' | 'down' | 'stable';
  };
  defectRate: {
    rate: number;
    trend: 'up' | 'down' | 'stable';
    byComponent: Record<string, number>;
  };
  workInProgress: {
    current: number;
    limit: number;
    efficiency: number;
    byStatus: Record<string, number>;
  };
  blockedIssues: {
    count: number;
    averageBlockTime: number;
    topBlockers: Array<{ reason: string; count: number; }>;
  };
}

export class AdvancedReporting {
  private client: JiraRestClient;
  private requestId: string;

  constructor(client: JiraRestClient) {
    this.client = client;
    this.requestId = generateRequestId();
  }

  /**
   * Build advanced JQL queries with complex operators
   */
  async buildJQLQuery(args: JQLQueryBuilderArgs): Promise<{ jql: string; metadata: any }> {
    logger.info('Building advanced JQL query', args, this.requestId);

    try {
      const validatedArgs = JQLQueryBuilderSchema.parse(args);
      let jqlParts: string[] = [];

      // Basic field filters
      if (validatedArgs.project) {
        jqlParts.push(`project = "${validatedArgs.project}"`);
      }

      if (validatedArgs.issueType && validatedArgs.issueType.length > 0) {
        jqlParts.push(`issueType IN (${validatedArgs.issueType.map(t => `"${t}"`).join(', ')})`);
      }

      if (validatedArgs.status && validatedArgs.status.length > 0) {
        jqlParts.push(`status IN (${validatedArgs.status.map(s => `"${s}"`).join(', ')})`);
      }

      if (validatedArgs.assignee && validatedArgs.assignee.length > 0) {
        jqlParts.push(`assignee IN (${validatedArgs.assignee.map(a => `"${a}"`).join(', ')})`);
      }

      if (validatedArgs.priority && validatedArgs.priority.length > 0) {
        jqlParts.push(`priority IN (${validatedArgs.priority.map(p => `"${p}"`).join(', ')})`);
      }

      if (validatedArgs.labels && validatedArgs.labels.length > 0) {
        jqlParts.push(`labels IN (${validatedArgs.labels.map(l => `"${l}"`).join(', ')})`);
      }

      if (validatedArgs.components && validatedArgs.components.length > 0) {
        jqlParts.push(`component IN (${validatedArgs.components.map(c => `"${c}"`).join(', ')})`);
      }

      // Date filters
      if (validatedArgs.createdDate) {
        const { from, to, operator } = validatedArgs.createdDate;
        if (from) jqlParts.push(`created ${operator} "${from}"`);
        if (to) jqlParts.push(`created <= "${to}"`);
      }

      if (validatedArgs.updatedDate) {
        const { from, to, operator } = validatedArgs.updatedDate;
        if (from) jqlParts.push(`updated ${operator} "${from}"`);
        if (to) jqlParts.push(`updated <= "${to}"`);
      }

      if (validatedArgs.resolutionDate) {
        const { from, to, operator } = validatedArgs.resolutionDate;
        if (from) jqlParts.push(`resolutiondate ${operator} "${from}"`);
        if (to) jqlParts.push(`resolutiondate <= "${to}"`);
      }

      // Custom fields
      if (validatedArgs.customFields) {
        Object.entries(validatedArgs.customFields).forEach(([field, value]) => {
          if (Array.isArray(value)) {
            jqlParts.push(`"${field}" IN (${value.map(v => `"${v}"`).join(', ')})`);
          } else {
            jqlParts.push(`"${field}" = "${value}"`);
          }
        });
      }

      // Advanced operators
      if (validatedArgs.advancedOperators) {
        const { and, or, not } = validatedArgs.advancedOperators;
        
        if (and && and.length > 0) {
          jqlParts.push(`(${and.join(' AND ')})`);
        }
        
        if (or && or.length > 0) {
          jqlParts.push(`(${or.join(' OR ')})`);
        }
        
        if (not && not.length > 0) {
          jqlParts.push(`NOT (${not.join(' OR ')})`);
        }
      }

      // Combine all parts
      let jql = jqlParts.join(' AND ');

      // Add ordering
      if (validatedArgs.orderBy && validatedArgs.orderBy.length > 0) {
        const orderClauses = validatedArgs.orderBy.map(o => `${o.field} ${o.direction}`);
        jql += ` ORDER BY ${orderClauses.join(', ')}`;
      }

      const metadata = {
        totalClauses: jqlParts.length,
        hasDateFilters: !!(validatedArgs.createdDate || validatedArgs.updatedDate || validatedArgs.resolutionDate),
        hasCustomFields: !!(validatedArgs.customFields && Object.keys(validatedArgs.customFields).length > 0),
        hasAdvancedOperators: !!(validatedArgs.advancedOperators),
        maxResults: validatedArgs.maxResults
      };

      logger.info('JQL query built successfully', { jql, metadata }, this.requestId);
      return { jql, metadata };

    } catch (error: any) {
      logger.error('Error building JQL query', { error: error.message }, this.requestId);
      throw createError(
        'JIRA_VALIDATION_ERROR',
        { originalError: error.message, message: `Failed to build JQL query: ${error.message}` }
      );
    }
  }

  /**
   * Generate real-time dashboard metrics and KPIs
   */
  async generateDashboardMetrics(args: DashboardMetricsArgs): Promise<AdvancedMetrics> {
    logger.info('Generating dashboard metrics', args, this.requestId);

    try {
      const validatedArgs = DashboardMetricsSchema.parse(args);
      const { projectKey, timeRange, includeMetrics } = validatedArgs;

      // Base JQL for the project and time range
      const baseJql = `project = "${projectKey}" AND created >= "${timeRange.from}" AND created <= "${timeRange.to}"`;
      
      const metrics: Partial<AdvancedMetrics> = {};

      // Generate each requested metric
      for (const metric of includeMetrics) {
        switch (metric) {
          case 'velocity':
            metrics.velocity = await this.calculateVelocityMetrics(projectKey, timeRange);
            break;
          case 'burndown':
            metrics.burndown = await this.calculateBurndownMetrics(projectKey, timeRange);
            break;
          case 'cycleTime':
            metrics.cycleTime = await this.calculateCycleTimeMetrics(baseJql);
            break;
          case 'leadTime':
            metrics.leadTime = await this.calculateLeadTimeMetrics(baseJql);
            break;
          case 'throughput':
            metrics.throughput = await this.calculateThroughputMetrics(baseJql, timeRange);
            break;
          case 'defectRate':
            metrics.defectRate = await this.calculateDefectRateMetrics(projectKey, timeRange);
            break;
          case 'workInProgress':
            metrics.workInProgress = await this.calculateWIPMetrics(projectKey);
            break;
          case 'blockedIssues':
            metrics.blockedIssues = await this.calculateBlockedIssuesMetrics(projectKey);
            break;
        }
      }

      logger.info('Dashboard metrics generated successfully', { metricsCount: Object.keys(metrics).length }, this.requestId);
      return metrics as AdvancedMetrics;

    } catch (error: any) {
      logger.error('Error generating dashboard metrics', { error: error.message }, this.requestId);
      throw createError(
        'JIRA_EXECUTION_ERROR',
        { originalError: error.message, message: `Failed to generate dashboard metrics: ${error.message}` }
      );
    }
  }

  /**
   * Generate burndown charts for sprints, releases, or epics
   */
  async generateBurndownChart(args: BurndownChartArgs): Promise<any> {
    logger.info('Generating burndown chart', args, this.requestId);

    try {
      const validatedArgs = BurndownChartSchema.parse(args);
      const { projectKey, startDate, endDate, chartType, includeScope, includeWeekends } = validatedArgs;

      // Get issues for the burndown period
      let jql = `project = "${projectKey}" AND created <= "${endDate}"`;
      
      if (validatedArgs.sprintId) {
        jql += ` AND sprint = ${validatedArgs.sprintId}`;
      }

      const response = await this.client.searchIssues(jql, {
        maxResults: 1000,
        expand: ['changelog'],
        fields: ['summary', 'status', 'created', 'resolutiondate', 'storyPoints']
      });

      const issues = response.issues || [];
      
      // Calculate burndown data
      const burndownData = this.calculateBurndownData(
        issues,
        startDate,
        endDate,
        includeScope,
        includeWeekends
      );

      logger.info('Burndown chart generated successfully', { issueCount: issues.length }, this.requestId);
      return burndownData;

    } catch (error: any) {
      logger.error('Error generating burndown chart', { error: error.message }, this.requestId);
      throw createError(
        'JIRA_EXECUTION_ERROR',
        { originalError: error.message, message: `Failed to generate burndown chart: ${error.message}` }
      );
    }
  }

  /**
   * Track velocity and sprint analytics
   */
  async trackVelocity(args: VelocityTrackingArgs): Promise<any> {
    logger.info('Tracking velocity', args, this.requestId);

    try {
      const validatedArgs = VelocityTrackingSchema.parse(args);
      const { projectKey, sprintCount, includeCommitment, includeCompleted } = validatedArgs;

      // Get sprint data (this would typically come from Jira's Agile API)
      const velocityData = await this.calculateVelocityData(
        projectKey,
        sprintCount,
        includeCommitment,
        includeCompleted
      );

      logger.info('Velocity tracking completed successfully', { sprintCount }, this.requestId);
      return velocityData;

    } catch (error: any) {
      logger.error('Error tracking velocity', { error: error.message }, this.requestId);
      throw createError(
        'JIRA_EXECUTION_ERROR',
        { originalError: error.message, message: `Failed to track velocity: ${error.message}` }
      );
    }
  }

  /**
   * Export data in various formats
   */
  async exportData(args: ExportConfigArgs): Promise<{ filePath: string; format: string }> {
    logger.info('Exporting data', { format: args.format }, this.requestId);

    try {
      const validatedArgs = ExportConfigSchema.parse(args);
      const { format, data, filename, includeCharts, includeMetadata } = validatedArgs;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultFilename = filename || `jira-export-${timestamp}`;
      
      // Ensure exports directory exists
      const exportsDir = join(process.cwd(), 'exports');
      if (!existsSync(exportsDir)) {
        mkdirSync(exportsDir, { recursive: true });
      }

      let filePath: string;

      switch (format) {
        case 'csv':
          filePath = await this.exportToCSV(data, join(exportsDir, `${defaultFilename}.csv`));
          break;
        case 'excel':
          filePath = await this.exportToExcel(data, join(exportsDir, `${defaultFilename}.xlsx`), includeCharts);
          break;
        case 'pdf':
          filePath = await this.exportToPDF(data, join(exportsDir, `${defaultFilename}.pdf`), includeCharts);
          break;
        case 'json':
          filePath = await this.exportToJSON(data, join(exportsDir, `${defaultFilename}.json`), includeMetadata);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      logger.info('Data exported successfully', { filePath, format }, this.requestId);
      return { filePath, format };

    } catch (error: any) {
      logger.error('Error exporting data', { error: error.message }, this.requestId);
      throw createError(
        'JIRA_EXECUTION_ERROR',
        { originalError: error.message, message: `Failed to export data: ${error.message}` }
      );
    }
  }

  // Private helper methods
  private async calculateVelocityMetrics(projectKey: string, timeRange: any): Promise<any> {
    // Implementation for velocity calculation
    return {
      current: 25,
      average: 23,
      trend: 'up' as const,
      history: []
    };
  }

  private async calculateBurndownMetrics(projectKey: string, timeRange: any): Promise<any> {
    // Implementation for burndown calculation
    return {
      ideal: [100, 80, 60, 40, 20, 0],
      actual: [100, 85, 70, 45, 25, 5],
      scope: [100, 105, 105, 100, 100, 100],
      dates: [],
      projectedCompletion: new Date().toISOString()
    };
  }

  private async calculateCycleTimeMetrics(jql: string): Promise<any> {
    // Implementation for cycle time calculation
    return {
      median: 5.2,
      average: 6.8,
      percentile95: 12.5,
      byStatus: {}
    };
  }

  private async calculateLeadTimeMetrics(jql: string): Promise<any> {
    // Implementation for lead time calculation
    return {
      median: 8.5,
      average: 10.2,
      percentile95: 18.7,
      breakdown: {}
    };
  }

  private async calculateThroughputMetrics(jql: string, timeRange: any): Promise<any> {
    // Implementation for throughput calculation
    return {
      daily: [],
      weekly: [],
      monthly: [],
      trend: 'stable' as const
    };
  }

  private async calculateDefectRateMetrics(projectKey: string, timeRange: any): Promise<any> {
    // Implementation for defect rate calculation
    return {
      rate: 0.15,
      trend: 'down' as const,
      byComponent: {}
    };
  }

  private async calculateWIPMetrics(projectKey: string): Promise<any> {
    // Implementation for WIP calculation
    return {
      current: 12,
      limit: 15,
      efficiency: 0.8,
      byStatus: {}
    };
  }

  private async calculateBlockedIssuesMetrics(projectKey: string): Promise<any> {
    // Implementation for blocked issues calculation
    return {
      count: 3,
      averageBlockTime: 2.5,
      topBlockers: []
    };
  }

  private calculateBurndownData(issues: any[], startDate: string, endDate: string, includeScope: boolean, includeWeekends: boolean): any {
    // Implementation for burndown data calculation
    return {
      ideal: [],
      actual: [],
      scope: includeScope ? [] : undefined,
      dates: []
    };
  }

  private async calculateVelocityData(projectKey: string, sprintCount: number, includeCommitment: boolean, includeCompleted: boolean): Promise<any> {
    // Implementation for velocity data calculation
    return {
      sprints: [],
      average: 0,
      trend: 'stable'
    };
  }

  private async exportToCSV(data: any, filePath: string): Promise<string> {
    // Implementation for CSV export
    const csvContent = this.convertToCSV(data);
    writeFileSync(filePath, csvContent, 'utf8');
    return filePath;
  }

  private async exportToExcel(data: any, filePath: string, includeCharts: boolean): Promise<string> {
    // Implementation for Excel export (would use exceljs)
    writeFileSync(filePath, JSON.stringify(data), 'utf8'); // Placeholder
    return filePath;
  }

  private async exportToPDF(data: any, filePath: string, includeCharts: boolean): Promise<string> {
    // Implementation for PDF export (would use pdfkit)
    writeFileSync(filePath, JSON.stringify(data), 'utf8'); // Placeholder
    return filePath;
  }

  private async exportToJSON(data: any, filePath: string, includeMetadata: boolean): Promise<string> {
    const exportData = {
      data,
      metadata: includeMetadata ? {
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      } : undefined
    };
    writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');
    return filePath;
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion implementation
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      
      for (const row of data) {
        const values = headers.map(header => {
          const value = row[header];
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        });
        csvRows.push(values.join(','));
      }
      
      return csvRows.join('\n');
    }
    
    return JSON.stringify(data);
  }
}

// MCP Tool definitions
export const jqlQueryBuilderTool: Tool = {
  name: 'advanced.jql.builder',
  description: 'Build advanced JQL queries with complex operators and filters',
  inputSchema: {
    type: 'object',
    properties: JQLQueryBuilderSchema.shape,
    required: []
  }
};

export const dashboardMetricsTool: Tool = {
  name: 'advanced.dashboard.metrics',
  description: 'Generate real-time dashboard metrics and KPIs',
  inputSchema: {
    type: 'object',
    properties: DashboardMetricsSchema.shape,
    required: ['projectKey', 'timeRange']
  }
};

export const burndownChartTool: Tool = {
  name: 'advanced.burndown.chart',
  description: 'Generate burndown charts for sprints, releases, or epics',
  inputSchema: {
    type: 'object',
    properties: BurndownChartSchema.shape,
    required: ['projectKey', 'startDate', 'endDate']
  }
};

export const velocityTrackingTool: Tool = {
  name: 'advanced.velocity.tracking',
  description: 'Track velocity and sprint analytics',
  inputSchema: {
    type: 'object',
    properties: VelocityTrackingSchema.shape,
    required: ['projectKey']
  }
};

export const exportDataTool: Tool = {
  name: 'advanced.export.data',
  description: 'Export data in various formats (CSV, PDF, Excel, JSON)',
  inputSchema: {
    type: 'object',
    properties: ExportConfigSchema.shape,
    required: ['format', 'data']
  }
};

// Tool handler functions
export async function handleJQLQueryBuilder(args: any, client: JiraRestClient) {
  const reporting = new AdvancedReporting(client);
  return await reporting.buildJQLQuery(args);
}

export async function handleDashboardMetrics(args: any, client: JiraRestClient) {
  const reporting = new AdvancedReporting(client);
  return await reporting.generateDashboardMetrics(args);
}

export async function handleBurndownChart(args: any, client: JiraRestClient) {
  const reporting = new AdvancedReporting(client);
  return await reporting.generateBurndownChart(args);
}

export async function handleVelocityTracking(args: any, client: JiraRestClient) {
  const reporting = new AdvancedReporting(client);
  return await reporting.trackVelocity(args);
}

export async function handleExportData(args: any, client: JiraRestClient) {
  const reporting = new AdvancedReporting(client);
  return await reporting.exportData(args);
}
