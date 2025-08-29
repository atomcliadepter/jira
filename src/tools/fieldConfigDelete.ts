import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const FieldConfigDeleteSchema = z.object({
  id: z.number().describe('Field configuration ID to delete')
});

export const deleteFieldConfigTool: Tool = {
  name: 'fieldconfig.delete.new',
  description: 'Delete field configurations with validation',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Field configuration ID to delete' }
    },
    required: ['id']
  }
};

export async function executeDeleteFieldConfig(args: unknown, client: JiraRestClient) {
  const validatedArgs = FieldConfigDeleteSchema.parse(args);
  
  await client.delete(`/rest/api/3/fieldconfiguration/${validatedArgs.id}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Field configuration ${validatedArgs.id} deleted successfully`
      }, null, 2)
    }]
  };
}
