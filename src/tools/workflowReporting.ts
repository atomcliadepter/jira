
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';
import { logger, generateRequestId } from '../utils/logger.js';
import { createError, ErrorCodes, McpJiraError, ErrorCategory } from '../utils/errorCodes.js';
import { WorkflowAnalytics, WorkflowMetrics, IssueMetrics } from './workflowAnalytics.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Schema definitions for reporting
const ReportArgsSchema = z.object({
  jql: z.string(),
  format: z.enum(['json', 'csv', 'markdown', 'html']).default('json'),
  outputPath: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: z.enum(['assignee', 'issueType', 'priority', 'component']).optional(),
  includeCharts: z.boolean().default(false),
  includeRecommendations: z.boolean().default(true),
  templateName: z.string().optional()
});

const DashboardArgsSchema = z.object({
  projects: z.array(z.string()),
  timeRange: z.enum(['7d', '30d', '90d', '180d', '1y']).default('30d'),
  metrics: z.array(z.enum(['cycleTime', 'leadTime', 'throughput', 'defectRate', 'flowEfficiency'])).default(['cycleTime', 'leadTime', 'throughput']),
  groupBy: z.enum(['assignee', 'issueType', 'priority', 'component']).optional(),
  outputPath: z.string().optional()
});

export type ReportArgs = z.infer<typeof ReportArgsSchema>;
export type DashboardArgs = z.infer<typeof DashboardArgsSchema>;

export interface ReportData {
  metadata: {
    generatedAt: string;
    jql: string;
    dateRange: {
      start?: string;
      end?: string;
    };
    totalIssues: number;
  };
  summary: WorkflowMetrics;
  detailedAnalysis: {
    cycleTime: any;
    leadTime: any;
    throughput: any;
  };
  recommendations: string[];
  issues: IssueMetrics[];
}

export class WorkflowReporting {
  private client: JiraRestClient;
  private analytics: WorkflowAnalytics;
  private requestId: string;

  constructor(client: JiraRestClient) {
    this.client = client;
    this.analytics = new WorkflowAnalytics(client);
    this.requestId = generateRequestId();
  }

  /**
   * Generate a comprehensive workflow report
   */
  async generateReport(args: ReportArgs): Promise<{
    reportPath?: string;
    data: ReportData;
    format: string;
  }> {
    logger.info('Generating workflow report', args, this.requestId);

    try {
      // Generate analytics data
      const analyticsResult = await this.analytics.generateWorkflowAnalytics({
        jql: args.jql,
        startDate: args.startDate,
        endDate: args.endDate,
        groupBy: args.groupBy,
        includeSubtasks: false,
        maxResults: 1000
      });

      const reportData: ReportData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          jql: args.jql,
          dateRange: {
            start: args.startDate,
            end: args.endDate
          },
          totalIssues: analyticsResult.cycleTimeAnalysis.issues.length
        },
        summary: analyticsResult.summary,
        detailedAnalysis: {
          cycleTime: analyticsResult.cycleTimeAnalysis,
          leadTime: analyticsResult.leadTimeAnalysis,
          throughput: analyticsResult.throughputAnalysis
        },
        recommendations: args.includeRecommendations ? analyticsResult.recommendations : [],
        issues: analyticsResult.cycleTimeAnalysis.issues
      };

      let reportPath: string | undefined;

      if (args.outputPath) {
        reportPath = await this.saveReport(reportData, args.format, args.outputPath, args.templateName);
      }

      return {
        reportPath,
        data: reportData,
        format: args.format
      };
    } catch (error: any) {
      logger.error('Error generating report', { error: error.message }, this.requestId);
      throw new McpJiraError(
        ErrorCodes.JIRA_EXECUTION_ERROR.code,
        `Failed to generate report: ${error.message}`,
        ErrorCategory.EXECUTION,
        args,
        this.requestId
      );
    }
  }

  /**
   * Generate a workflow dashboard
   */
  async generateDashboard(args: DashboardArgs): Promise<{
    dashboardPath?: string;
    data: Record<string, ReportData>;
  }> {
    logger.info('Generating workflow dashboard', args, this.requestId);

    try {
      const dashboardData: Record<string, ReportData> = {};
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = this.calculateStartDate(args.timeRange);

      // Generate reports for each project
      for (const projectKey of args.projects) {
        const jql = `project = "${projectKey}" AND resolved >= "${startDate}" AND resolved <= "${endDate}"`;
        
        const reportResult = await this.generateReport({
          jql,
          format: 'json',
          startDate,
          endDate,
          groupBy: args.groupBy,
          includeCharts: false,
          includeRecommendations: true
        });

        dashboardData[projectKey] = reportResult.data;
      }

      let dashboardPath: string | undefined;

      if (args.outputPath) {
        dashboardPath = await this.saveDashboard(dashboardData, args);
      }

      return {
        dashboardPath,
        data: dashboardData
      };
    } catch (error: any) {
      logger.error('Error generating dashboard', { error: error.message }, this.requestId);
      throw new McpJiraError(
        ErrorCodes.JIRA_EXECUTION_ERROR.code,
        `Failed to generate dashboard: ${error.message}`,
        ErrorCategory.EXECUTION,
        args,
        this.requestId
      );
    }
  }

  /**
   * Export issues with analytics data
   */
  async exportIssuesWithAnalytics(args: {
    jql: string;
    format: 'csv' | 'json';
    outputPath?: string;
    includeStatusHistory?: boolean;
  }): Promise<{
    exportPath?: string;
    data: IssueMetrics[];
  }> {
    logger.info('Exporting issues with analytics', args, this.requestId);

    try {
      const cycleTimeResult = await this.analytics.calculateCycleTime({
        jql: args.jql,
        startStatus: 'In Progress',
        endStatus: 'Done'
      });

      const issues = cycleTimeResult.issues;

      let exportPath: string | undefined;

      if (args.outputPath) {
        exportPath = await this.saveIssuesExport(issues, args.format, args.outputPath, args.includeStatusHistory);
      }

      return {
        exportPath,
        data: issues
      };
    } catch (error: any) {
      logger.error('Error exporting issues', { error: error.message }, this.requestId);
      throw new McpJiraError(
        ErrorCodes.JIRA_EXECUTION_ERROR.code,
        `Failed to export issues: ${error.message}`,
        ErrorCategory.EXECUTION,
        args,
        this.requestId
      );
    }
  }

  private async saveReport(data: ReportData, format: string, outputPath: string, templateName?: string): Promise<string> {
    // Ensure output directory exists
    const outputDir = outputPath.includes('/') ? outputPath.substring(0, outputPath.lastIndexOf('/')) : '.';
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFileName = `workflow-report-${timestamp}`;
    
    let filePath: string;
    let content: string;

    switch (format) {
      case 'json':
        filePath = join(outputDir, `${baseFileName}.json`);
        content = JSON.stringify(data, null, 2);
        break;

      case 'csv':
        filePath = join(outputDir, `${baseFileName}.csv`);
        content = this.convertToCSV(data.issues);
        break;

      case 'markdown':
        filePath = join(outputDir, `${baseFileName}.md`);
        content = this.convertToMarkdown(data, templateName);
        break;

      case 'html':
        filePath = join(outputDir, `${baseFileName}.html`);
        content = this.convertToHTML(data, templateName);
        break;

      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    writeFileSync(filePath, content, 'utf8');
    logger.info('Report saved', { filePath, format }, this.requestId);

    return filePath;
  }

  private async saveDashboard(data: Record<string, ReportData>, args: DashboardArgs): Promise<string> {
    const outputDir = args.outputPath || './reports';
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = join(outputDir, `workflow-dashboard-${timestamp}.html`);
    
    const content = this.generateDashboardHTML(data, args);
    writeFileSync(filePath, content, 'utf8');

    logger.info('Dashboard saved', { filePath }, this.requestId);
    return filePath;
  }

  private async saveIssuesExport(
    issues: IssueMetrics[], 
    format: 'csv' | 'json', 
    outputPath: string,
    includeStatusHistory?: boolean
  ): Promise<string> {
    const outputDir = outputPath.includes('/') ? outputPath.substring(0, outputPath.lastIndexOf('/')) : '.';
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFileName = `issues-export-${timestamp}`;
    
    let filePath: string;
    let content: string;

    if (format === 'json') {
      filePath = join(outputDir, `${baseFileName}.json`);
      content = JSON.stringify(issues, null, 2);
    } else {
      filePath = join(outputDir, `${baseFileName}.csv`);
      content = this.convertToCSV(issues, includeStatusHistory);
    }

    writeFileSync(filePath, content, 'utf8');
    return filePath;
  }

  private convertToCSV(issues: IssueMetrics[], includeStatusHistory = false): string {
    const headers = [
      'Key',
      'Summary',
      'Issue Type',
      'Priority',
      'Assignee',
      'Created',
      'Resolved',
      'Cycle Time (days)',
      'Lead Time (days)'
    ];

    if (includeStatusHistory) {
      headers.push('Status History');
    }

    const rows = issues.map(issue => {
      const row = [
        issue.key,
        `"${issue.summary.replace(/"/g, '""')}"`,
        issue.issueType,
        issue.priority,
        issue.assignee || 'Unassigned',
        issue.created,
        issue.resolved || 'Not resolved',
        issue.cycleTime?.toString() || 'N/A',
        issue.leadTime?.toString() || 'N/A'
      ];

      if (includeStatusHistory) {
        const statusHistory = issue.statusHistory
          .map(s => `${s.status}:${s.duration}d`)
          .join(';');
        row.push(`"${statusHistory}"`);
      }

      return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  private convertToMarkdown(data: ReportData, templateName?: string): string {
    const template = this.getMarkdownTemplate(templateName);
    
    return template
      .replace('{{GENERATED_AT}}', data.metadata.generatedAt)
      .replace('{{JQL}}', data.metadata.jql)
      .replace('{{TOTAL_ISSUES}}', data.metadata.totalIssues.toString())
      .replace('{{DATE_RANGE}}', this.formatDateRange(data.metadata.dateRange))
      .replace('{{CYCLE_TIME_METRICS}}', this.formatMetricsTable(data.summary.cycleTime, 'Cycle Time'))
      .replace('{{LEAD_TIME_METRICS}}', this.formatMetricsTable(data.summary.leadTime, 'Lead Time'))
      .replace('{{THROUGHPUT_METRICS}}', this.formatThroughputTable(data.summary.throughput))
      .replace('{{RECOMMENDATIONS}}', this.formatRecommendations(data.recommendations))
      .replace('{{ISSUES_TABLE}}', this.formatIssuesTable(data.issues.slice(0, 20))); // Limit to first 20 issues
  }

  private convertToHTML(data: ReportData, templateName?: string): string {
    const template = this.getHTMLTemplate(templateName);
    
    return template
      .replace('{{GENERATED_AT}}', data.metadata.generatedAt)
      .replace('{{JQL}}', data.metadata.jql)
      .replace('{{TOTAL_ISSUES}}', data.metadata.totalIssues.toString())
      .replace('{{DATE_RANGE}}', this.formatDateRange(data.metadata.dateRange))
      .replace('{{CYCLE_TIME_METRICS}}', this.formatMetricsHTML(data.summary.cycleTime, 'Cycle Time'))
      .replace('{{LEAD_TIME_METRICS}}', this.formatMetricsHTML(data.summary.leadTime, 'Lead Time'))
      .replace('{{THROUGHPUT_METRICS}}', this.formatThroughputHTML(data.summary.throughput))
      .replace('{{RECOMMENDATIONS}}', this.formatRecommendationsHTML(data.recommendations))
      .replace('{{ISSUES_TABLE}}', this.formatIssuesHTML(data.issues.slice(0, 50))); // Limit to first 50 issues
  }

  private generateDashboardHTML(data: Record<string, ReportData>, args: DashboardArgs): string {
    const projects = Object.keys(data);
    const projectCards = projects.map(project => {
      const reportData = data[project];
      return `
        <div class="project-card">
          <h3>${project}</h3>
          <div class="metrics-grid">
            <div class="metric">
              <h4>Cycle Time</h4>
              <p class="metric-value">${reportData.summary.cycleTime.median}d</p>
              <p class="metric-label">Median</p>
            </div>
            <div class="metric">
              <h4>Lead Time</h4>
              <p class="metric-value">${reportData.summary.leadTime.median}d</p>
              <p class="metric-label">Median</p>
            </div>
            <div class="metric">
              <h4>Throughput</h4>
              <p class="metric-value">${reportData.summary.throughput.total}</p>
              <p class="metric-label">Total Issues</p>
            </div>
            <div class="metric">
              <h4>Flow Efficiency</h4>
              <p class="metric-value">${reportData.summary.flowEfficiency}%</p>
              <p class="metric-label">Efficiency</p>
            </div>
          </div>
          <div class="recommendations">
            <h4>Top Recommendations</h4>
            <ul>
              ${reportData.recommendations.slice(0, 3).map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workflow Analytics Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .header { text-align: center; margin-bottom: 30px; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
        .project-card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
        .metric { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 6px; }
        .metric-value { font-size: 24px; font-weight: bold; margin: 5px 0; color: #007bff; }
        .metric-label { font-size: 12px; color: #666; margin: 0; }
        .recommendations ul { margin: 10px 0; padding-left: 20px; }
        .recommendations li { margin: 5px 0; font-size: 14px; }
        h3 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        h4 { color: #555; margin: 15px 0 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Workflow Analytics Dashboard</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>Time Range: ${args.timeRange} | Projects: ${projects.join(', ')}</p>
    </div>
    <div class="dashboard">
        ${projectCards}
    </div>
</body>
</html>
    `;
  }

  private calculateStartDate(timeRange: string): string {
    const now = new Date();
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '180d': 180,
      '1y': 365
    }[timeRange] || 30;

    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    return startDate.toISOString().split('T')[0];
  }

  private getMarkdownTemplate(templateName?: string): string {
    // Default markdown template
    return `# Workflow Analytics Report

**Generated:** {{GENERATED_AT}}  
**JQL Query:** \`{{JQL}}\`  
**Total Issues:** {{TOTAL_ISSUES}}  
**Date Range:** {{DATE_RANGE}}

## Summary

### Cycle Time Metrics
{{CYCLE_TIME_METRICS}}

### Lead Time Metrics
{{LEAD_TIME_METRICS}}

### Throughput Metrics
{{THROUGHPUT_METRICS}}

## Recommendations

{{RECOMMENDATIONS}}

## Issue Details (Top 20)

{{ISSUES_TABLE}}

---
*Report generated by JIRA Workflow Analytics*
`;
  }

  private getHTMLTemplate(templateName?: string): string {
    // Default HTML template
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workflow Analytics Report</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .recommendations { background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .recommendations ul { margin: 10px 0; }
        h1, h2, h3 { color: #333; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Workflow Analytics Report</h1>
        <p><strong>Generated:</strong> {{GENERATED_AT}}</p>
        <p><strong>JQL Query:</strong> <code>{{JQL}}</code></p>
        <p><strong>Total Issues:</strong> {{TOTAL_ISSUES}}</p>
        <p><strong>Date Range:</strong> {{DATE_RANGE}}</p>
    </div>

    <h2>Summary</h2>
    <div class="metrics">
        <div class="metric-card">
            <h3>Cycle Time</h3>
            {{CYCLE_TIME_METRICS}}
        </div>
        <div class="metric-card">
            <h3>Lead Time</h3>
            {{LEAD_TIME_METRICS}}
        </div>
        <div class="metric-card">
            <h3>Throughput</h3>
            {{THROUGHPUT_METRICS}}
        </div>
    </div>

    <div class="recommendations">
        <h2>Recommendations</h2>
        {{RECOMMENDATIONS}}
    </div>

    <h2>Issue Details (Top 50)</h2>
    {{ISSUES_TABLE}}
</body>
</html>`;
  }

  private formatDateRange(dateRange: { start?: string; end?: string }): string {
    if (dateRange.start && dateRange.end) {
      return `${dateRange.start} to ${dateRange.end}`;
    } else if (dateRange.start) {
      return `From ${dateRange.start}`;
    } else if (dateRange.end) {
      return `Until ${dateRange.end}`;
    }
    return 'All time';
  }

  private formatMetricsTable(metrics: WorkflowMetrics['cycleTime'], title: string): string {
    return `
| Metric | Value |
|--------|-------|
| Median | ${metrics.median} days |
| Average | ${metrics.average} days |
| 85th Percentile | ${metrics.percentile85} days |
| 95th Percentile | ${metrics.percentile95} days |
| Min | ${metrics.min} days |
| Max | ${metrics.max} days |
| Count | ${metrics.count} issues |
`;
  }

  private formatThroughputTable(metrics: WorkflowMetrics['throughput']): string {
    return `
| Metric | Value |
|--------|-------|
| Total Issues | ${metrics.total} |
| Average per Period | ${metrics.average.toFixed(1)} |
| Trend | ${metrics.trend} |
`;
  }

  private formatRecommendations(recommendations: string[]): string {
    return recommendations.map(rec => `- ${rec}`).join('\n');
  }

  private formatIssuesTable(issues: IssueMetrics[]): string {
    const header = '| Key | Summary | Type | Priority | Assignee | Cycle Time | Lead Time |';
    const separator = '|-----|---------|------|----------|----------|------------|-----------|';
    
    const rows = issues.map(issue => 
      `| ${issue.key} | ${issue.summary.substring(0, 50)}... | ${issue.issueType} | ${issue.priority} | ${issue.assignee || 'Unassigned'} | ${issue.cycleTime || 'N/A'} | ${issue.leadTime || 'N/A'} |`
    );

    return [header, separator, ...rows].join('\n');
  }

  private formatMetricsHTML(metrics: WorkflowMetrics['cycleTime'], title: string): string {
    return `
<table>
    <tr><td><strong>Median</strong></td><td>${metrics.median} days</td></tr>
    <tr><td><strong>Average</strong></td><td>${metrics.average} days</td></tr>
    <tr><td><strong>85th Percentile</strong></td><td>${metrics.percentile85} days</td></tr>
    <tr><td><strong>95th Percentile</strong></td><td>${metrics.percentile95} days</td></tr>
    <tr><td><strong>Min</strong></td><td>${metrics.min} days</td></tr>
    <tr><td><strong>Max</strong></td><td>${metrics.max} days</td></tr>
    <tr><td><strong>Count</strong></td><td>${metrics.count} issues</td></tr>
</table>
`;
  }

  private formatThroughputHTML(metrics: WorkflowMetrics['throughput']): string {
    return `
<table>
    <tr><td><strong>Total Issues</strong></td><td>${metrics.total}</td></tr>
    <tr><td><strong>Average per Period</strong></td><td>${metrics.average.toFixed(1)}</td></tr>
    <tr><td><strong>Trend</strong></td><td>${metrics.trend}</td></tr>
</table>
`;
  }

  private formatRecommendationsHTML(recommendations: string[]): string {
    return `<ul>${recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>`;
  }

  private formatIssuesHTML(issues: IssueMetrics[]): string {
    const rows = issues.map(issue => `
<tr>
    <td>${issue.key}</td>
    <td>${issue.summary}</td>
    <td>${issue.issueType}</td>
    <td>${issue.priority}</td>
    <td>${issue.assignee || 'Unassigned'}</td>
    <td>${issue.cycleTime || 'N/A'}</td>
    <td>${issue.leadTime || 'N/A'}</td>
</tr>
    `).join('');

    return `
<table>
    <thead>
        <tr>
            <th>Key</th>
            <th>Summary</th>
            <th>Type</th>
            <th>Priority</th>
            <th>Assignee</th>
            <th>Cycle Time</th>
            <th>Lead Time</th>
        </tr>
    </thead>
    <tbody>
        ${rows}
    </tbody>
</table>
`;
  }
}

// Tool definitions
export const workflowReportTool: Tool = {
  name: 'workflow.report',
  description: 'Generate comprehensive workflow reports in various formats',
  inputSchema: {
    type: 'object',
    properties: {
      jql: {
        type: 'string',
        description: 'JQL query to filter issues for the report'
      },
      format: {
        type: 'string',
        enum: ['json', 'csv', 'markdown', 'html'],
        description: 'Output format for the report',
        default: 'json'
      },
      outputPath: {
        type: 'string',
        description: 'Path where the report should be saved'
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
      includeCharts: {
        type: 'boolean',
        description: 'Include charts in the report (HTML format only)',
        default: false
      },
      includeRecommendations: {
        type: 'boolean',
        description: 'Include recommendations in the report',
        default: true
      },
      templateName: {
        type: 'string',
        description: 'Template name for custom formatting'
      }
    },
    required: ['jql']
  }
};

export const workflowDashboardTool: Tool = {
  name: 'workflow.dashboard',
  description: 'Generate a workflow analytics dashboard for multiple projects',
  inputSchema: {
    type: 'object',
    properties: {
      projects: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of project keys to include in the dashboard'
      },
      timeRange: {
        type: 'string',
        enum: ['7d', '30d', '90d', '180d', '1y'],
        description: 'Time range for the dashboard',
        default: '30d'
      },
      metrics: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['cycleTime', 'leadTime', 'throughput', 'defectRate', 'flowEfficiency']
        },
        description: 'Metrics to include in the dashboard',
        default: ['cycleTime', 'leadTime', 'throughput']
      },
      groupBy: {
        type: 'string',
        enum: ['assignee', 'issueType', 'priority', 'component'],
        description: 'Group metrics by field'
      },
      outputPath: {
        type: 'string',
        description: 'Path where the dashboard should be saved'
      }
    },
    required: ['projects']
  }
};

export const issuesExportTool: Tool = {
  name: 'workflow.export_issues',
  description: 'Export issues with analytics data',
  inputSchema: {
    type: 'object',
    properties: {
      jql: {
        type: 'string',
        description: 'JQL query to filter issues'
      },
      format: {
        type: 'string',
        enum: ['csv', 'json'],
        description: 'Export format',
        default: 'csv'
      },
      outputPath: {
        type: 'string',
        description: 'Path where the export should be saved'
      },
      includeStatusHistory: {
        type: 'boolean',
        description: 'Include detailed status history in the export',
        default: false
      }
    },
    required: ['jql']
  }
};

// Execution functions
export async function executeWorkflowReport(client: JiraRestClient, args: any) {
  const validatedArgs = ReportArgsSchema.parse(args);
  const reporting = new WorkflowReporting(client);
  return await reporting.generateReport(validatedArgs);
}

export async function executeWorkflowDashboard(client: JiraRestClient, args: any) {
  const validatedArgs = DashboardArgsSchema.parse(args);
  const reporting = new WorkflowReporting(client);
  return await reporting.generateDashboard(validatedArgs);
}

export async function executeIssuesExport(client: JiraRestClient, args: any) {
  const validatedArgs = z.object({
    jql: z.string(),
    format: z.enum(['csv', 'json']).default('csv'),
    outputPath: z.string().optional(),
    includeStatusHistory: z.boolean().default(false)
  }).parse(args);
  
  const reporting = new WorkflowReporting(client);
  return await reporting.exportIssuesWithAnalytics(validatedArgs);
}
