import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const FieldConfigUpdateSchema = z.object({
  id: z.number().describe('Field configuration ID'),
  name: z.string().optional().describe('New field configuration name'),
  description: z.string().optional().describe('New field configuration description')
});

export const updateFieldConfigTool: Tool = {
  name: 'fieldconfig.update.new',
  description: 'Update field configuration properties',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Field configuration ID' },
      name: { type: 'string', description: 'New field configuration name' },
      description: { type: 'string', description: 'New field configuration description' }
    },
    required: ['id']
  }
};

export async function executeUpdateFieldConfig(args: unknown, client: JiraRestClient) {
  const validatedArgs = FieldConfigUpdateSchema.parse(args);
  
  const updateData: any = {};
  if (validatedArgs.name) updateData.name = validatedArgs.name;
  if (validatedArgs.description) updateData.description = validatedArgs.description;

  const response = await client.put(`/rest/api/3/fieldconfiguration/${validatedArgs.id}`, updateData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Field configuration ${validatedArgs.id} updated successfully`,
        configuration: response
      }, null, 2)
    }]
  };
}
