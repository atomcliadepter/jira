
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { UserSearchArgsSchema } from '../types/index.js';

export const searchUsersTool: Tool = {
  name: 'user.search',
  description: 'Search for Jira users',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Query string to search for users (name, email, etc.)'
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
      property: {
        type: 'string',
        description: 'Property to search by (e.g., "displayName", "emailAddress")'
      }
    },
    required: ['query']
  }
};

export async function executeSearchUsers(
  client: JiraRestClient,
  args: unknown
): Promise<any> {
  const validatedArgs = UserSearchArgsSchema.parse(args);
  
  try {
    const users = await client.searchUsers(validatedArgs.query, {
      startAt: validatedArgs.startAt,
      maxResults: validatedArgs.maxResults,
      property: validatedArgs.property,
    });
    
    // Format the response for better readability
    const formattedUsers = users.map((user: any) => ({
      accountId: user.accountId,
      accountType: user.accountType,
      displayName: user.displayName,
      emailAddress: user.emailAddress,
      active: user.active,
      timeZone: user.timeZone,
      locale: user.locale,
      avatarUrls: user.avatarUrls,
    }));
    
    return {
      content: [
        {
          type: 'text',
          text: `User Search Results (${users.length} found):\n${JSON.stringify(formattedUsers, null, 2)}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error searching users: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
