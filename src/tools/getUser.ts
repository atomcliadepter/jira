
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { UserGetArgsSchema } from '../types/index.js';

export const getUserTool: Tool = {
  name: 'user.get',
  description: 'Get details of a specific Jira user',
  inputSchema: {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description: 'User account ID'
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional data to expand (e.g., ["groups", "applicationRoles"])'
      }
    },
    required: ['accountId']
  }
};

export async function executeGetUser(
  client: JiraRestClient,
  args: unknown
): Promise<any> {
  const validatedArgs = UserGetArgsSchema.parse(args);
  
  try {
    const user = await client.getUser(validatedArgs.accountId, {
      expand: validatedArgs.expand,
    });
    
    // Format the response for better readability
    const formattedUser = {
      accountId: user.accountId,
      accountType: user.accountType,
      displayName: user.displayName,
      emailAddress: user.emailAddress,
      active: user.active,
      timeZone: user.timeZone,
      locale: user.locale,
      groups: user.groups?.items?.map((group: any) => ({
        name: group.name,
        groupId: group.groupId,
      })) || [],
      applicationRoles: user.applicationRoles?.items?.map((role: any) => ({
        key: role.key,
        name: role.name,
        defaultGroups: role.defaultGroups,
        selectedByDefault: role.selectedByDefault,
        defined: role.defined,
        numberOfSeats: role.numberOfSeats,
        remainingSeats: role.remainingSeats,
        userCount: role.userCount,
        userCountDescription: role.userCountDescription,
        hasUnlimitedSeats: role.hasUnlimitedSeats,
        platform: role.platform,
      })) || [],
      avatarUrls: user.avatarUrls,
    };
    
    return {
      content: [
        {
          type: 'text',
          text: `User Details:\n${JSON.stringify(formattedUser, null, 2)}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving user: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
