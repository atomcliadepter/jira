import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const VersionUpdateSchema = z.object({
  id: z.string().describe('Version ID'),
  name: z.string().optional().describe('Version name'),
  description: z.string().optional().describe('Version description'),
  archived: z.boolean().optional().describe('Whether version is archived'),
  released: z.boolean().optional().describe('Whether version is released'),
  releaseDate: z.string().optional().describe('Release date (YYYY-MM-DD)'),
  startDate: z.string().optional().describe('Start date (YYYY-MM-DD)')
});

export const updateVersionTool: Tool = {
  name: 'version.update',
  description: 'Update an existing version',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Version ID' },
      name: { type: 'string', description: 'Version name' },
      description: { type: 'string', description: 'Version description' },
      archived: { type: 'boolean', description: 'Whether version is archived' },
      released: { type: 'boolean', description: 'Whether version is released' },
      releaseDate: { type: 'string', description: 'Release date (YYYY-MM-DD)' },
      startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' }
    },
    required: ['id']
  }
};

export async function executeUpdateVersion(args: unknown, client: JiraRestClient) {
  const validatedArgs = VersionUpdateSchema.parse(args);
  
  const updateData: any = {};
  if (validatedArgs.name) updateData.name = validatedArgs.name;
  if (validatedArgs.description) updateData.description = validatedArgs.description;
  if (validatedArgs.archived !== undefined) updateData.archived = validatedArgs.archived;
  if (validatedArgs.released !== undefined) updateData.released = validatedArgs.released;
  if (validatedArgs.releaseDate) updateData.releaseDate = validatedArgs.releaseDate;
  if (validatedArgs.startDate) updateData.startDate = validatedArgs.startDate;

  const response = await client.put(`/rest/api/3/version/${validatedArgs.id}`, updateData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Version ${validatedArgs.id} updated successfully`,
        version: response
      }, null, 2)
    }]
  };
}
