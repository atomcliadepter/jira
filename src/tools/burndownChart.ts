import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const BurndownChartSchema = z.object({
  projectKey: z.string().describe('Project key'),
  sprintId: z.string().optional().describe('Sprint ID (if available)'),
  startDate: z.string().describe('Start date (YYYY-MM-DD)'),
  endDate: z.string().describe('End date (YYYY-MM-DD)'),
  groupBy: z.enum(['day', 'week']).optional().default('day')
});

export const burndownChartTool: Tool = {
  name: 'advanced.burndown.chart.new',
  description: 'Create burndown charts with sprint analysis',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: { type: 'string', description: 'Project key' },
      sprintId: { type: 'string', description: 'Sprint ID (if available)' },
      startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
      groupBy: { type: 'string', enum: ['day', 'week'], default: 'day', description: 'Group by day or week' }
    },
    required: ['projectKey', 'startDate', 'endDate']
  }
};

export async function executeBurndownChart(args: unknown, client: JiraRestClient) {
  const validatedArgs = BurndownChartSchema.parse(args);
  
  try {
    // Get all issues in scope
    let scopeJQL = `project = "${validatedArgs.projectKey}" AND created <= "${validatedArgs.endDate}"`;
    if (validatedArgs.sprintId) {
      scopeJQL += ` AND sprint = ${validatedArgs.sprintId}`;
    }
    
    const scopeIssues = await client.get(`/rest/api/3/search?jql=${encodeURIComponent(scopeJQL)}&maxResults=1000&fields=created,resolved,status,summary`);
    
    // Generate date range
    const startDate = new Date(validatedArgs.startDate);
    const endDate = new Date(validatedArgs.endDate);
    const dates: string[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      if (validatedArgs.groupBy === 'week') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    // Calculate burndown data
    const burndownData = dates.map(date => {
      const dateObj = new Date(date);
      
      // Count issues created by this date
      const createdByDate = scopeIssues.issues.filter((issue: any) => 
        new Date(issue.fields.created) <= dateObj
      ).length;
      
      // Count issues resolved by this date
      const resolvedByDate = scopeIssues.issues.filter((issue: any) => 
        issue.fields.resolved && new Date(issue.fields.resolved) <= dateObj
      ).length;
      
      const remaining = createdByDate - resolvedByDate;
      
      return {
        date,
        totalScope: createdByDate,
        resolved: resolvedByDate,
        remaining: remaining,
        idealRemaining: Math.max(0, scopeIssues.total - (scopeIssues.total * (dateObj.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())))
      };
    });
    
    const chartData = {
      projectKey: validatedArgs.projectKey,
      sprintId: validatedArgs.sprintId,
      period: {
        startDate: validatedArgs.startDate,
        endDate: validatedArgs.endDate,
        groupBy: validatedArgs.groupBy
      },
      summary: {
        totalIssues: scopeIssues.total,
        resolvedIssues: scopeIssues.issues.filter((issue: any) => issue.fields.resolved).length,
        remainingIssues: scopeIssues.issues.filter((issue: any) => !issue.fields.resolved).length
      },
      burndownData,
      generatedAt: new Date().toISOString()
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(chartData, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message,
          message: 'Failed to generate burndown chart'
        }, null, 2)
      }]
    };
  }
}
