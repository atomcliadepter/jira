
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { IssueUpdateArgsSchema } from '../types/index.js';

export const updateIssueTool: Tool = {
  name: 'issue.update',
  description: 'Update an existing Jira issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'Issue ID or key (e.g., "PROJ-123" or "10001")'
      },
      fields: {
        type: 'object',
        description: 'Fields to update with their new values'
      },
      update: {
        type: 'object',
        description: 'Update operations to perform on the issue fields'
      },
      historyMetadata: {
        type: 'object',
        description: 'Additional metadata for the update operation'
      },
      properties: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            value: {}
          },
          required: ['key', 'value']
        },
        description: 'Issue properties to set'
      }
    },
    required: ['issueIdOrKey']
  }
};

export async function executeUpdateIssue(
  client: JiraRestClient,
  args: unknown
): Promise<any> {
  const validatedArgs = IssueUpdateArgsSchema.parse(args);
  
  try {
    // Convert description to ADF if it's a plain string in fields
    if (validatedArgs.fields?.description && typeof validatedArgs.fields.description === 'string') {
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

    await client.updateIssue(validatedArgs.issueIdOrKey, {
      fields: validatedArgs.fields,
      update: validatedArgs.update,
      historyMetadata: validatedArgs.historyMetadata,
      properties: validatedArgs.properties,
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully updated issue: ${validatedArgs.issueIdOrKey}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error updating issue: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
