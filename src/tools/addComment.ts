
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { CommentAddArgsSchema } from '../types/index.js';

export const addCommentTool: Tool = {
  name: 'issue.comment.add',
  description: 'Add a comment to a Jira issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'Issue ID or key (e.g., "PROJ-123" or "10001")'
      },
      body: {
        description: 'Comment body in Atlassian Document Format (ADF) or plain text'
      },
      visibility: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['group', 'role'],
            description: 'Visibility type'
          },
          value: {
            type: 'string',
            description: 'Group name or role name'
          },
          identifier: {
            type: 'string',
            description: 'Group ID or role ID'
          }
        },
        required: ['type', 'value'],
        description: 'Comment visibility restrictions'
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
        description: 'Comment properties'
      }
    },
    required: ['issueIdOrKey', 'body']
  }
};

export async function executeAddComment(
  client: JiraRestClient,
  args: unknown
): Promise<any> {
  const validatedArgs = CommentAddArgsSchema.parse(args);
  
  try {
    // Convert body to ADF if it's a plain string
    let body = validatedArgs.body;
    if (typeof body === 'string') {
      body = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: body
              }
            ]
          }
        ]
      };
    }

    const result = await client.addComment(validatedArgs.issueIdOrKey, {
      body,
      visibility: validatedArgs.visibility,
      properties: validatedArgs.properties,
    });
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully added comment to issue: ${validatedArgs.issueIdOrKey}\nComment ID: ${result.id}\nCreated: ${result.created}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error adding comment: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
