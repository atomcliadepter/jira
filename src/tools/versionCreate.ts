import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const VersionCreateSchema = z.object({
  name: z.string().describe('Version name'),
  projectId: z.string().describe('Project ID'),
  description: z.string().optional().describe('Version description'),
  archived: z.boolean().optional().describe('Whether version is archived'),
  released: z.boolean().optional().describe('Whether version is released'),
  releaseDate: z.string().optional().describe('Release date (YYYY-MM-DD)'),
  startDate: z.string().optional().describe('Start date (YYYY-MM-DD)')
});

export const createVersionTool: Tool = {
  name: 'version.create',
  description: 'Create a new project version',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Version name' },
      projectId: { type: 'string', description: 'Project ID' },
      description: { type: 'string', description: 'Version description' },
      archived: { type: 'boolean', description: 'Whether version is archived' },
      released: { type: 'boolean', description: 'Whether version is released' },
      releaseDate: { type: 'string', description: 'Release date (YYYY-MM-DD)' },
      startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' }
    },
    required: ['name', 'projectId']
  }
};

export async function executeCreateVersion(args: unknown, client: JiraRestClient) {
  const validatedArgs = VersionCreateSchema.parse(args);
  
  const versionData = {
    name: validatedArgs.name,
    projectId: parseInt(validatedArgs.projectId),
    ...(validatedArgs.description && { description: validatedArgs.description }),
    ...(validatedArgs.archived !== undefined && { archived: validatedArgs.archived }),
    ...(validatedArgs.released !== undefined && { released: validatedArgs.released }),
    ...(validatedArgs.releaseDate && { releaseDate: validatedArgs.releaseDate }),
    ...(validatedArgs.startDate && { startDate: validatedArgs.startDate })
  };

  const response = await client.post('/rest/api/3/version', versionData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Version ${validatedArgs.name} created successfully`,
        version: response
      }, null, 2)
    }]
  };
}
