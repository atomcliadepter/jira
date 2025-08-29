import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const FieldConfigCreateSchema = z.object({
  name: z.string().describe('Field configuration name'),
  description: z.string().optional().describe('Field configuration description')
});

export const createFieldConfigTool: Tool = {
  name: 'fieldconfig.create.new',
  description: 'Create new field configurations',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Field configuration name' },
      description: { type: 'string', description: 'Field configuration description' }
    },
    required: ['name']
  }
};

export async function executeCreateFieldConfig(args: unknown, client: JiraRestClient) {
  const validatedArgs = FieldConfigCreateSchema.parse(args);
  
  const configData = {
    name: validatedArgs.name,
    ...(validatedArgs.description && { description: validatedArgs.description })
  };

  const response = await client.post('/rest/api/3/fieldconfiguration', configData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Field configuration '${validatedArgs.name}' created successfully`,
        configuration: response
      }, null, 2)
    }]
  };
}
