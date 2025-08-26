
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { IssueGetArgsSchema } from '../types/index.js';

export const getIssueTool: Tool = {
  name: 'issue.get',
  description: 'Get details of a specific Jira issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'Issue ID or key (e.g., "PROJ-123" or "10001")'
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific fields to retrieve (e.g., ["summary", "status", "assignee"])'
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional data to expand (e.g., ["changelog", "renderedFields"])'
      },
      properties: {
        type: 'array',
        items: { type: 'string' },
        description: 'Issue properties to retrieve'
      }
    },
    required: ['issueIdOrKey']
  }
};

export async function executeGetIssue(
  client: JiraRestClient,
  args: unknown
): Promise<any> {
  const validatedArgs = IssueGetArgsSchema.parse(args);
  
  try {
    const issue = await client.getIssue(validatedArgs.issueIdOrKey, {
      fields: validatedArgs.fields,
      expand: validatedArgs.expand,
      properties: validatedArgs.properties,
    });
    
    // Format the response for better readability
    const formattedIssue = {
      key: issue.key,
      id: issue.id,
      summary: issue.fields.summary,
      status: issue.fields.status?.name,
      issueType: issue.fields.issuetype?.name,
      project: issue.fields.project?.name,
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      reporter: issue.fields.reporter?.displayName,
      priority: issue.fields.priority?.name,
      created: issue.fields.created,
      updated: issue.fields.updated,
      description: issue.fields.description,
      labels: issue.fields.labels || [],
      components: issue.fields.components?.map((c: any) => c.name) || [],
      fixVersions: issue.fields.fixVersions?.map((v: any) => v.name) || [],
    };
    
    return {
      content: [
        {
          type: 'text',
          text: `Issue Details:\n${JSON.stringify(formattedIssue, null, 2)}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving issue: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
