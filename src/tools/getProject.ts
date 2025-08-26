
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { ProjectGetArgsSchema } from '../types/index.js';

export const getProjectTool: Tool = {
  name: 'project.get',
  description: 'Get details of a specific Jira project',
  inputSchema: {
    type: 'object',
    properties: {
      projectIdOrKey: {
        type: 'string',
        description: 'Project ID or key (e.g., "PROJ" or "10001")'
      },
      expand: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional data to expand (e.g., ["description", "lead", "issueTypes"])'
      },
      properties: {
        type: 'array',
        items: { type: 'string' },
        description: 'Project properties to retrieve'
      }
    },
    required: ['projectIdOrKey']
  }
};

export async function executeGetProject(
  client: JiraRestClient,
  args: unknown
): Promise<any> {
  const validatedArgs = ProjectGetArgsSchema.parse(args);
  
  try {
    const project = await client.getProject(validatedArgs.projectIdOrKey, {
      expand: validatedArgs.expand,
      properties: validatedArgs.properties,
    });
    
    // Format the response for better readability
    const formattedProject = {
      id: project.id,
      key: project.key,
      name: project.name,
      description: project.description,
      lead: project.lead?.displayName,
      projectTypeKey: project.projectTypeKey,
      simplified: project.simplified,
      style: project.style,
      isPrivate: project.isPrivate,
      url: project.self,
      avatarUrls: project.avatarUrls,
      projectCategory: project.projectCategory?.name,
      issueTypes: project.issueTypes?.map((type: any) => ({
        id: type.id,
        name: type.name,
        description: type.description,
        subtask: type.subtask,
      })),
      versions: project.versions?.map((version: any) => ({
        id: version.id,
        name: version.name,
        description: version.description,
        released: version.released,
        releaseDate: version.releaseDate,
      })),
      components: project.components?.map((component: any) => ({
        id: component.id,
        name: component.name,
        description: component.description,
        lead: component.lead?.displayName,
      })),
    };
    
    return {
      content: [
        {
          type: 'text',
          text: `Project Details:\n${JSON.stringify(formattedProject, null, 2)}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving project: ${error.message}`
        }
      ],
      isError: true
    };
  }
}
