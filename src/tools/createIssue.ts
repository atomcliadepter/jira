
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { IssueCreateArgsSchema } from '../types/index.js';

export const createIssueTool: Tool = {
  name: 'issue.create',
  description: 'Create a new Jira issue',
  inputSchema: {
    type: 'object',
    properties: {
      fields: {
        type: 'object',
        properties: {
          project: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Project key (e.g., "PROJ")' }
            },
            required: ['key']
          },
          summary: {
            type: 'string',
            description: 'Issue summary/title'
          },
          description: {
            description: 'Issue description in Atlassian Document Format (ADF) or plain text'
          },
          issuetype: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Issue type name (e.g., "Task", "Bug", "Story")' }
            },
            required: ['name']
          },
          assignee: {
            type: 'object',
            properties: {
              accountId: { type: 'string', description: 'Assignee account ID' }
            },
            required: ['accountId']
          },
          priority: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Priority name (e.g., "High", "Medium", "Low")' }
            },
            required: ['name']
          },
          labels: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of labels'
          },
          components: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            },
            description: 'Array of component names'
          },
          fixVersions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            },
            description: 'Array of fix version names'
          },
          parent: {
            type: 'object',
            properties: {
              key: { type: 'string', description: 'Parent issue key (for subtasks)' }
            },
            required: ['key']
          }
        },
        required: ['project', 'summary', 'issuetype']
      },
      update: {
        type: 'object',
        description: 'Update operations to perform on the issue fields'
      }
    },
    required: ['fields']
  }
};

export async function executeCreateIssue(
  client: JiraRestClient,
  args: unknown
): Promise<any> {
  try {
    const validatedArgs = IssueCreateArgsSchema.parse(args);
    
    // Convert description to ADF if it's a plain string
    if (validatedArgs.fields.description && typeof validatedArgs.fields.description === 'string') {
      validatedArgs.fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: validatedArgs.fields.description
              }
            ]
          }
        ]
      };
    }

    const result = await client.createIssue(validatedArgs);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully created issue: ${result.key}\nIssue ID: ${result.id}\nSelf URL: ${result.self}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error creating issue: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
