import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const FieldConfigItemsSchema = z.object({
  id: z.number().describe('Field configuration ID'),
  fieldConfigurationItems: z.array(z.object({
    id: z.string().describe('Field ID'),
    isHidden: z.boolean().optional().describe('Whether field is hidden'),
    isRequired: z.boolean().optional().describe('Whether field is required'),
    description: z.string().optional().describe('Field description')
  })).describe('Field configuration items to update')
});

export const updateFieldConfigItemsTool: Tool = {
  name: 'fieldconfig.items.update.new',
  description: 'Update field configuration items and behaviors',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Field configuration ID' },
      fieldConfigurationItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Field ID' },
            isHidden: { type: 'boolean', description: 'Whether field is hidden' },
            isRequired: { type: 'boolean', description: 'Whether field is required' },
            description: { type: 'string', description: 'Field description' }
          },
          required: ['id']
        },
        description: 'Field configuration items to update'
      }
    },
    required: ['id', 'fieldConfigurationItems']
  }
};

export async function executeUpdateFieldConfigItems(args: unknown, client: JiraRestClient) {
  const validatedArgs = FieldConfigItemsSchema.parse(args);
  
  const updateData = {
    fieldConfigurationItems: validatedArgs.fieldConfigurationItems
  };

  const response = await client.put(`/rest/api/3/fieldconfiguration/${validatedArgs.id}/fields`, updateData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Field configuration items updated for configuration ${validatedArgs.id}`,
        items: response
      }, null, 2)
    }]
  };
}
