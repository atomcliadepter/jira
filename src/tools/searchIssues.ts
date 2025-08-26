
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { JqlSearchArgsSchema } from '../types/index.js';

export const searchIssuesTool: Tool = {
  name: 'jql.search',
  description: 'Search for Jira issues using JQL (Jira Query Language)',
  inputSchema: {
    type: 'object',
    properties: {
      jql: {
        type: 'string',
        description: 'JQL query string (e.g., "project = PROJ AND status = Open")'
      },
      startAt: {
        type: 'number',
        description: 'Starting index for pagination',
        default: 0
      },
      maxResults: {
        type: 'number',
        description: 'Maximum number of results to return',
        default: 50
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
      },
      fieldsByKeys: {
        type: 'boolean',
        description: 'Whether to return fields by their keys instead of IDs'
      }
    },
    required: ['jql']
  }
};

export async function executeSearchIssues(
  client: JiraRestClient,
  args: unknown
): Promise<any> {
  try {
    const validatedArgs = JqlSearchArgsSchema.parse(args);
    const result = await client.searchIssues(validatedArgs.jql, {
      startAt: validatedArgs.startAt,
      maxResults: validatedArgs.maxResults,
      fields: validatedArgs.fields,
      expand: validatedArgs.expand,
    });
    
    // Format the response for better readability
    const formattedResult = {
      total: result.total,
      startAt: result.startAt,
      maxResults: result.maxResults,
      issues: result.issues?.map((issue: any) => ({
        key: issue.key,
        id: issue.id,
        summary: issue.fields?.summary,
        status: issue.fields?.status?.name,
        issueType: issue.fields?.issuetype?.name,
        project: issue.fields?.project?.name,
        assignee: issue.fields?.assignee?.displayName || 'Unassigned',
        reporter: issue.fields?.reporter?.displayName,
        priority: issue.fields?.priority?.name,
        created: issue.fields?.created,
        updated: issue.fields?.updated,
        labels: issue.fields?.labels || [],
      })) || [],
    };
    
    return {
      content: [
        {
          type: 'text',
          text: `Search Results (${result.total} total):\n${JSON.stringify(formattedResult, null, 2)}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error searching issues: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
