import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const AdvancedBurndownChartSchema = z.object({
  projectKey: z.string().describe('Project key'),
  sprintId: z.string().optional().describe('Sprint ID for sprint burndown'),
  startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  endDate: z.string().optional().describe('End date (YYYY-MM-DD)')
});

export const advancedBurndownChartTool: Tool = {
  name: 'advanced.burndown.chart',
  description: 'Create burndown charts with sprint analysis',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: { type: 'string', description: 'Project key' },
      sprintId: { type: 'string', description: 'Sprint ID for sprint burndown' },
      startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' }
    },
    required: ['projectKey']
  }
};

export async function executeAdvancedBurndownChart(args: unknown, client: JiraRestClient) {
  const validatedArgs = AdvancedBurndownChartSchema.parse(args);
  
  let jql = `project = ${validatedArgs.projectKey}`;
  if (validatedArgs.startDate && validatedArgs.endDate) {
    jql += ` AND created >= "${validatedArgs.startDate}" AND created <= "${validatedArgs.endDate}"`;
  }
  
  // Get issues for burndown analysis
  const issues = await client.get(`${client.config.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=1000&fields=created,resolved,status,storyPoints`);
  
  // Calculate burndown data
  const burndownData = {
    projectKey: validatedArgs.projectKey,
    totalIssues: issues.total,
    totalStoryPoints: 0,
    dailyBurndown: [] as any[],
    idealBurndown: [] as Array<{date: string, remaining: number}>,
    actualBurndown: [] as Array<{date: string, remaining: number}>
  };
  
  // Calculate total story points
  issues.issues.forEach((issue: any) => {
    const storyPoints = issue.fields.customfield_10016 || issue.fields.storyPoints || 0;
    burndownData.totalStoryPoints += storyPoints;
  });
  
  // Generate daily burndown (simplified for demo)
  const days = 14; // 2 week sprint
  for (let i = 0; i <= days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    // Ideal burndown (linear)
    const idealRemaining = burndownData.totalStoryPoints * (1 - i / days);
    burndownData.idealBurndown.push({
      date: date.toISOString().split('T')[0],
      remaining: Math.max(0, idealRemaining)
    });
    
    // Actual burndown (simulated based on resolved issues)
    const resolvedByDate = issues.issues.filter((issue: any) => 
      issue.fields.resolved && new Date(issue.fields.resolved) <= date
    ).length;
    
    const actualRemaining = Math.max(0, burndownData.totalIssues - resolvedByDate);
    burndownData.actualBurndown.push({
      date: date.toISOString().split('T')[0],
      remaining: actualRemaining
    });
  }
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        burndownChart: burndownData,
        generatedAt: new Date().toISOString()
      }, null, 2)
    }]
  };
}
