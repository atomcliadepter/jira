
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { IssueTransitionArgsSchema } from '../types/index.js';

export const transitionIssueTool: Tool = {
  name: 'issue.transition',
  description: 'Transition a Jira issue to a different status',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'Issue ID or key (e.g., "PROJ-123" or "10001")'
      },
      transition: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Transition ID'
          }
        },
        required: ['id']
      },
      fields: {
        type: 'object',
        description: 'Fields to update during the transition'
      },
      update: {
        type: 'object',
        description: 'Update operations to perform during the transition'
      },
      historyMetadata: {
        type: 'object',
        description: 'Additional metadata for the transition'
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
        description: 'Issue properties to set during transition'
      }
    },
    required: ['issueIdOrKey', 'transition']
  }
};

export async function executeTransitionIssue(
  client: JiraRestClient,
  args: unknown
): Promise<any> {
  const validatedArgs = IssueTransitionArgsSchema.parse(args);
  
  try {
    await client.transitionIssue(validatedArgs.issueIdOrKey, {
      transition: validatedArgs.transition,
      fields: validatedArgs.fields,
      update: validatedArgs.update,
      historyMetadata: validatedArgs.historyMetadata,
      properties: validatedArgs.properties,
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully transitioned issue: ${validatedArgs.issueIdOrKey} using transition ID: ${validatedArgs.transition.id}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error transitioning issue: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
