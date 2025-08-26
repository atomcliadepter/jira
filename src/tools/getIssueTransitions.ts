
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const GetIssueTransitionsArgsSchema = z.object({
  issueIdOrKey: z.string(),
  expand: z.array(z.string()).optional(),
});

export const getIssueTransitionsTool: Tool = {
  name: 'issue.transitions.list',
  description: 'Get available transitions for a Jira issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: {
        type: 'string',
        description: 'Issue ID or key (e.g., "PROJ-123" or "10001")'
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional data to expand (e.g., ["transitions.fields"])'
      }
    },
    required: ['issueIdOrKey']
  }
};

export async function executeGetIssueTransitions(
  client: JiraRestClient,
  args: unknown
): Promise<any> {
  const validatedArgs = GetIssueTransitionsArgsSchema.parse(args);
  
  try {
    const params = new URLSearchParams();
    if (validatedArgs.expand) {
      params.append('expand', validatedArgs.expand.join(','));
    }
    
    const queryString = params.toString();
    const url = `/rest/api/3/issue/${validatedArgs.issueIdOrKey}/transitions${queryString ? `?${queryString}` : ''}`;
    
    const result = await client.get(url);
    
    // Format transitions for better readability
    const formattedTransitions = result.transitions?.map((transition: any) => ({
      id: transition.id,
      name: transition.name,
      to: {
        id: transition.to?.id,
        name: transition.to?.name,
        statusCategory: transition.to?.statusCategory?.name,
      },
      hasScreen: transition.hasScreen,
      isGlobal: transition.isGlobal,
      isInitial: transition.isInitial,
      isAvailable: transition.isAvailable,
      isConditional: transition.isConditional,
    })) || [];
    
    return {
      content: [
        {
          type: 'text',
          text: `Available transitions for ${validatedArgs.issueIdOrKey}:\n${JSON.stringify(formattedTransitions, null, 2)}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving transitions: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
