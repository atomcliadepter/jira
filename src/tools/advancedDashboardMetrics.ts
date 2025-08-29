import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const AdvancedDashboardMetricsSchema = z.object({
  projectKeys: z.array(z.string()).describe('Project keys to analyze'),
  timeRange: z.string().optional().default('30d').describe('Time range (e.g., 30d, 90d)'),
  metrics: z.array(z.string()).optional().describe('Specific metrics to calculate')
});

export const advancedDashboardMetricsTool: Tool = {
  name: 'advanced.dashboard.metrics',
  description: 'Generate dashboard metrics with KPIs',
  inputSchema: {
    type: 'object',
    properties: {
      projectKeys: { type: 'array', items: { type: 'string' }, description: 'Project keys to analyze' },
      timeRange: { type: 'string', default: '30d', description: 'Time range (e.g., 30d, 90d)' },
      metrics: { type: 'array', items: { type: 'string' }, description: 'Specific metrics to calculate' }
    },
    required: ['projectKeys']
  }
};

export async function executeAdvancedDashboardMetrics(args: unknown, client: JiraRestClient) {
  const validatedArgs = AdvancedDashboardMetricsSchema.parse(args);
  
  const projectList = validatedArgs.projectKeys.join(',');
  const jql = `project in (${projectList}) AND created >= -${validatedArgs.timeRange}`;
  
  // Get issues for analysis
  const issues = await client.get(`${client.config.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=1000&fields=created,resolved,status,priority,assignee`);
  
  // Calculate metrics
  const metrics = {
    totalIssues: issues.total,
    resolvedIssues: issues.issues.filter((i: any) => i.fields.resolved).length,
    openIssues: issues.issues.filter((i: any) => !i.fields.resolved).length,
    resolutionRate: 0,
    avgResolutionTime: 0,
    priorityBreakdown: {} as Record<string, number>,
    statusBreakdown: {} as Record<string, number>
  };
  
  metrics.resolutionRate = metrics.totalIssues > 0 ? (metrics.resolvedIssues / metrics.totalIssues) * 100 : 0;
  
  // Calculate priority and status breakdowns
  issues.issues.forEach((issue: any) => {
    const priority = issue.fields.priority?.name || 'None';
    const status = issue.fields.status?.name || 'Unknown';
    
    metrics.priorityBreakdown[priority] = (metrics.priorityBreakdown[priority] || 0) + 1;
    metrics.statusBreakdown[status] = (metrics.statusBreakdown[status] || 0) + 1;
  });
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        timeRange: validatedArgs.timeRange,
        projects: validatedArgs.projectKeys,
        metrics: metrics,
        generatedAt: new Date().toISOString()
      }, null, 2)
    }]
  };
}
