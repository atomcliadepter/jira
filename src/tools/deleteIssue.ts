
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { IssueDeleteArgsSchema } from '../types/index.js';

export const deleteIssueTool: Tool = {
  name: 'issue.delete',
  description: 'Delete a Jira issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'Issue ID or key (e.g., "PROJ-123" or "10001")'
      },
      deleteSubtasks: {
        type: 'boolean',
        description: 'Whether to delete subtasks if they exist',
        default: false
      }
    },
    required: ['issueIdOrKey']
  }
};

export async function executeDeleteIssue(
  client: JiraRestClient,
  args: unknown
): Promise<any> {
  const validatedArgs = IssueDeleteArgsSchema.parse(args);
  
  try {
    await client.deleteIssue(validatedArgs.issueIdOrKey, validatedArgs.deleteSubtasks);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully deleted issue: ${validatedArgs.issueIdOrKey}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error deleting issue: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
