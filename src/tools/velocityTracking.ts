import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const VelocityTrackingSchema = z.object({
  projectKey: z.string().describe('Project key'),
  periods: z.number().optional().default(6).describe('Number of periods to analyze'),
  periodType: z.enum(['week', 'sprint', 'month']).optional().default('week'),
  storyPointField: z.string().optional().describe('Custom field ID for story points')
});

export const velocityTrackingTool: Tool = {
  name: 'advanced.velocity.tracking.new',
  description: 'Track team velocity with trend analysis',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: { type: 'string', description: 'Project key' },
      periods: { type: 'number', default: 6, description: 'Number of periods to analyze' },
      periodType: { type: 'string', enum: ['week', 'sprint', 'month'], default: 'week', description: 'Period type' },
      storyPointField: { type: 'string', description: 'Custom field ID for story points' }
    },
    required: ['projectKey']
  }
};

export async function executeVelocityTracking(args: unknown, client: JiraRestClient) {
  const validatedArgs = VelocityTrackingSchema.parse(args);
  
  try {
    // Calculate date ranges for periods
    const periods: Array<{start: string, end: string, name: string}> = [];
    const now = new Date();
    
    for (let i = 0; i < validatedArgs.periods; i++) {
      const periodEnd = new Date(now);
      const periodStart = new Date(now);
      
      if (validatedArgs.periodType === 'week') {
        periodEnd.setDate(now.getDate() - (i * 7));
        periodStart.setDate(periodEnd.getDate() - 6);
      } else if (validatedArgs.periodType === 'month') {
        periodEnd.setMonth(now.getMonth() - i);
        periodStart.setMonth(periodEnd.getMonth());
        periodStart.setDate(1);
      } else { // sprint - approximate as 2 weeks
        periodEnd.setDate(now.getDate() - (i * 14));
        periodStart.setDate(periodEnd.getDate() - 13);
      }
      
      periods.unshift({
        start: periodStart.toISOString().split('T')[0],
        end: periodEnd.toISOString().split('T')[0],
        name: `${validatedArgs.periodType} ${validatedArgs.periods - i}`
      });
    }
    
    // Analyze each period
    const velocityData = await Promise.all(periods.map(async (period) => {
      const jql = `project = "${validatedArgs.projectKey}" AND resolved >= "${period.start}" AND resolved <= "${period.end}"`;
      const issues = await client.get(`/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=1000&fields=summary,issuetype,${validatedArgs.storyPointField || 'customfield_10016'}`);
      
      let totalStoryPoints = 0;
      let issuesWithPoints = 0;
      
      issues.issues.forEach((issue: any) => {
        const storyPoints = validatedArgs.storyPointField 
          ? issue.fields[validatedArgs.storyPointField]
          : issue.fields.customfield_10016; // Common story points field
          
        if (storyPoints && typeof storyPoints === 'number') {
          totalStoryPoints += storyPoints;
          issuesWithPoints++;
        }
      });
      
      return {
        period: period.name,
        startDate: period.start,
        endDate: period.end,
        issuesCompleted: issues.total,
        issuesWithStoryPoints: issuesWithPoints,
        totalStoryPoints,
        averageStoryPointsPerIssue: issuesWithPoints > 0 ? (totalStoryPoints / issuesWithPoints).toFixed(2) : 0
      };
    }));
    
    // Calculate trends
    const storyPointsArray = velocityData.map(d => d.totalStoryPoints);
    const issuesArray = velocityData.map(d => d.issuesCompleted);
    
    const avgStoryPoints = storyPointsArray.reduce((a, b) => a + b, 0) / storyPointsArray.length;
    const avgIssues = issuesArray.reduce((a, b) => a + b, 0) / issuesArray.length;
    
    // Simple trend calculation (last 3 vs first 3 periods)
    const recentAvg = storyPointsArray.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const earlierAvg = storyPointsArray.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const trend = recentAvg > earlierAvg ? 'increasing' : recentAvg < earlierAvg ? 'decreasing' : 'stable';
    
    const velocityReport = {
      projectKey: validatedArgs.projectKey,
      analysis: {
        periodType: validatedArgs.periodType,
        periodsAnalyzed: validatedArgs.periods,
        averageVelocity: {
          storyPoints: avgStoryPoints.toFixed(2),
          issues: avgIssues.toFixed(2)
        },
        trend: {
          direction: trend,
          recentAverage: recentAvg.toFixed(2),
          earlierAverage: earlierAvg.toFixed(2)
        }
      },
      periodData: velocityData,
      generatedAt: new Date().toISOString()
    };
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(velocityReport, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message,
          message: 'Failed to generate velocity tracking report'
        }, null, 2)
      }]
    };
  }
}
