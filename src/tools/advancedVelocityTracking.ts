import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const AdvancedVelocityTrackingSchema = z.object({
  projectKey: z.string().describe('Project key'),
  teamId: z.string().optional().describe('Team ID for velocity tracking'),
  sprintCount: z.number().optional().default(6).describe('Number of sprints to analyze')
});

export const advancedVelocityTrackingTool: Tool = {
  name: 'advanced.velocity.tracking',
  description: 'Track team velocity with trend analysis',
  inputSchema: {
    type: 'object',
    properties: {
      projectKey: { type: 'string', description: 'Project key' },
      teamId: { type: 'string', description: 'Team ID for velocity tracking' },
      sprintCount: { type: 'number', default: 6, description: 'Number of sprints to analyze' }
    },
    required: ['projectKey']
  }
};

export async function executeAdvancedVelocityTracking(args: unknown, client: JiraRestClient) {
  const validatedArgs = AdvancedVelocityTrackingSchema.parse(args);
  
  // Get resolved issues from recent sprints
  const jql = `project = ${validatedArgs.projectKey} AND resolved >= -${validatedArgs.sprintCount * 14}d ORDER BY resolved DESC`;
  const issues = await client.get(`${client.config.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=1000&fields=resolved,storyPoints,sprint`);
  
  // Calculate velocity data
  const velocityData = {
    projectKey: validatedArgs.projectKey,
    sprintCount: validatedArgs.sprintCount,
    sprints: [] as Array<{
      sprintNumber: number;
      startDate: string;
      endDate: string;
      completedStoryPoints: number;
      completedIssues: number;
    }>,
    averageVelocity: 0,
    velocityTrend: 'stable' as 'increasing' | 'decreasing' | 'stable',
    totalStoryPoints: 0
  };
  
  // Group issues by sprint/time period (simplified)
  const sprintDuration = 14; // days
  const sprintData = {};
  
  for (let i = 0; i < validatedArgs.sprintCount; i++) {
    const sprintEnd = new Date();
    sprintEnd.setDate(sprintEnd.getDate() - (i * sprintDuration));
    const sprintStart = new Date(sprintEnd);
    sprintStart.setDate(sprintStart.getDate() - sprintDuration);
    
    const sprintIssues = issues.issues.filter((issue: any) => {
      if (!issue.fields.resolved) return false;
      const resolvedDate = new Date(issue.fields.resolved);
      return resolvedDate >= sprintStart && resolvedDate <= sprintEnd;
    });
    
    const sprintPoints = sprintIssues.reduce((total: number, issue: any) => {
      const storyPoints = issue.fields.customfield_10016 || issue.fields.storyPoints || 1;
      return total + storyPoints;
    }, 0);
    
    velocityData.sprints.unshift({
      sprintNumber: validatedArgs.sprintCount - i,
      startDate: sprintStart.toISOString().split('T')[0],
      endDate: sprintEnd.toISOString().split('T')[0],
      completedStoryPoints: sprintPoints,
      completedIssues: sprintIssues.length
    });
    
    velocityData.totalStoryPoints += sprintPoints;
  }
  
  velocityData.averageVelocity = velocityData.totalStoryPoints / validatedArgs.sprintCount;
  
  // Calculate trend
  if (velocityData.sprints.length >= 2) {
    const recent = velocityData.sprints.slice(-2);
    const trend = recent[1].completedStoryPoints - recent[0].completedStoryPoints;
    velocityData.velocityTrend = trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable';
  }
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        velocityTracking: velocityData,
        generatedAt: new Date().toISOString()
      }, null, 2)
    }]
  };
}
