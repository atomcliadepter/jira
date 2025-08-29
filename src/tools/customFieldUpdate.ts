import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const CustomFieldUpdateSchema = z.object({
  fieldId: z.string().describe('Custom field ID'),
  name: z.string().optional().describe('New field name'),
  description: z.string().optional().describe('New field description'),
  searcherKey: z.string().optional().describe('New searcher key')
});

export const updateCustomFieldTool: Tool = {
  name: 'customfield.update.new',
  description: 'Update custom field properties and configurations',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: { type: 'string', description: 'Custom field ID' },
      name: { type: 'string', description: 'New field name' },
      description: { type: 'string', description: 'New field description' },
      searcherKey: { type: 'string', description: 'New searcher key' }
    },
    required: ['fieldId']
  }
};

export async function executeUpdateCustomField(args: unknown, client: JiraRestClient) {
  const validatedArgs = CustomFieldUpdateSchema.parse(args);
  
  const updateData: any = {};
  if (validatedArgs.name) updateData.name = validatedArgs.name;
  if (validatedArgs.description) updateData.description = validatedArgs.description;
  if (validatedArgs.searcherKey) updateData.searcherKey = validatedArgs.searcherKey;

  const response = await client.put(`/rest/api/3/field/${validatedArgs.fieldId}`, updateData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Custom field ${validatedArgs.fieldId} updated successfully`,
        field: response
      }, null, 2)
    }]
  };
}
