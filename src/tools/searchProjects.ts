
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { ProjectSearchArgsSchema } from '../types/index.js';

export const searchProjectsTool: Tool = {
  name: 'project.search',
  description: 'Search for Jira projects',
  inputSchema: {
    type: 'object',
    properties: {
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
        description: 'Order results by field (e.g., "name", "key", "-name")'
      },
      query: {
        type: 'string',
        description: 'Text query to search project names and keys'
      },
      typeKey: {
        type: 'string',
        description: 'Project type key to filter by (e.g., "software", "service_desk")'
      },
      categoryId: {
        type: 'number',
        description: 'Project category ID to filter by'
      },
      action: {
        type: 'string',
        description: 'Action to filter projects by (e.g., "view", "browse", "edit")'
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional data to expand (e.g., ["description", "lead", "issueTypes"])'
      }
    }
  }
};

export async function executeSearchProjects(
  client: JiraRestClient,
  args: unknown
): Promise<any> {
  const validatedArgs = ProjectSearchArgsSchema.parse(args);
  
  try {
    const result = await client.searchProjects({
      startAt: validatedArgs.startAt,
      maxResults: validatedArgs.maxResults,
      orderBy: validatedArgs.orderBy,
      query: validatedArgs.query,
      typeKey: validatedArgs.typeKey,
      categoryId: validatedArgs.categoryId,
      action: validatedArgs.action,
      expand: validatedArgs.expand,
    });
    
    // Format the response for better readability
    const formattedResult = {
      total: result.total,
      startAt: result.startAt,
      maxResults: result.maxResults,
      isLast: result.isLast,
      projects: result.values?.map((project: any) => ({
        id: project.id,
        key: project.key,
        name: project.name,
        description: project.description,
        lead: project.lead?.displayName,
        projectTypeKey: project.projectTypeKey,
        simplified: project.simplified,
        style: project.style,
        isPrivate: project.isPrivate,
        projectCategory: project.projectCategory?.name,
      })) || [],
    };
    
    return {
      content: [
        {
          type: 'text',
          text: `Project Search Results (${result.total} total):\n${JSON.stringify(formattedResult, null, 2)}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error searching projects: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
