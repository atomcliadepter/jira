import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const DashboardMetricsSchema = z.object({
  projectKeys: z.array(z.string()).describe('Project keys to analyze'),
  timeframe: z.string().optional().describe('Timeframe (e.g., "30d", "3m", "1y")').default('30d'),
  includeSubtasks: z.boolean().optional().default(false)
});

export const dashboardMetricsTool: Tool = {
  name: 'advanced.dashboard.metrics.new',
  description: 'Generate dashboard metrics with KPIs',
  inputSchema: {
    type: 'object',
    properties: {
      projectKeys: { type: 'array', items: { type: 'string' }, description: 'Project keys to analyze' },
      timeframe: { type: 'string', description: 'Timeframe (e.g., "30d", "3m", "1y")', default: '30d' },
      includeSubtasks: { type: 'boolean', description: 'Include subtasks in metrics', default: false }
    },
    required: ['projectKeys']
  }
};

export async function executeDashboardMetrics(args: unknown, client: JiraRestClient) {
  const validatedArgs = DashboardMetricsSchema.parse(args);
  
  const projectFilter = validatedArgs.projectKeys.map(key => `"${key}"`).join(', ');
  const timeframeFilter = `created >= -${validatedArgs.timeframe}`;
  const subtaskFilter = validatedArgs.includeSubtasks ? '' : ' AND issuetype != Sub-task';
  
  const baseJQL = `project IN (${projectFilter}) AND ${timeframeFilter}${subtaskFilter}`;
  
  try {
    // Get total issues
    const totalIssues = await client.get(`/rest/api/3/search?jql=${encodeURIComponent(baseJQL)}&maxResults=0`);
    
    // Get issues by status
    const statusMetrics = await client.get(`/rest/api/3/search?jql=${encodeURIComponent(baseJQL)}&maxResults=1000&fields=status`);
    
    // Get issues by priority
    const priorityMetrics = await client.get(`/rest/api/3/search?jql=${encodeURIComponent(baseJQL)}&maxResults=1000&fields=priority`);
    
    // Get resolved issues
    const resolvedJQL = `${baseJQL} AND resolved >= -${validatedArgs.timeframe}`;
    const resolvedIssues = await client.get(`/rest/api/3/search?jql=${encodeURIComponent(resolvedJQL)}&maxResults=0`);
    
    // Calculate metrics
    const statusCounts = statusMetrics.issues.reduce((acc: any, issue: any) => {
      const status = issue.fields.status.name;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    const priorityCounts = priorityMetrics.issues.reduce((acc: any, issue: any) => {
      const priority = issue.fields.priority?.name || 'None';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});
    
    const metrics = {
      summary: {
        totalIssues: totalIssues.total,
        resolvedIssues: resolvedIssues.total,
        resolutionRate: totalIssues.total > 0 ? (resolvedIssues.total / totalIssues.total * 100).toFixed(2) + '%' : '0%',
        timeframe: validatedArgs.timeframe,
        projects: validatedArgs.projectKeys
      },
      statusBreakdown: statusCounts,
      priorityBreakdown: priorityCounts,
      generatedAt: new Date().toISOString()
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(metrics, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message,
          message: 'Failed to generate dashboard metrics'
        }, null, 2)
      }]
    };
  }
}
