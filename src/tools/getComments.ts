
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { CommentGetArgsSchema } from '../types/index.js';

export const getCommentsTool: Tool = {
  name: 'issue.comments.get',
  description: 'Get comments for a Jira issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'Issue ID or key (e.g., "PROJ-123" or "10001")'
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
      orderBy: {
        type: 'string',
        description: 'Order comments by field (e.g., "created", "-created", "updated")'
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional data to expand (e.g., ["renderedBody", "properties"])'
      }
    },
    required: ['issueIdOrKey']
  }
};

export async function executeGetComments(
  client: JiraRestClient,
  args: unknown
): Promise<any> {
  const validatedArgs = CommentGetArgsSchema.parse(args);
  
  try {
    const result = await client.getComments(validatedArgs.issueIdOrKey, {
      startAt: validatedArgs.startAt,
      maxResults: validatedArgs.maxResults,
      orderBy: validatedArgs.orderBy,
      expand: validatedArgs.expand,
    });
    
    // Format comments for better readability
    const formattedComments = {
      total: result.total,
      startAt: result.startAt,
      maxResults: result.maxResults,
      comments: result.comments?.map((comment: any) => ({
        id: comment.id,
        author: comment.author?.displayName,
        body: comment.body, // ADF content
        created: comment.created,
        updated: comment.updated,
        updateAuthor: comment.updateAuthor?.displayName,
        visibility: comment.visibility,
      })) || [],
    };
    
    return {
      content: [
        {
          type: 'text',
          text: `Comments for ${validatedArgs.issueIdOrKey} (${result.total} total):\n${JSON.stringify(formattedComments, null, 2)}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving comments: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
