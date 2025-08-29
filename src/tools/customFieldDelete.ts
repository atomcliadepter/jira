import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const CustomFieldDeleteSchema = z.object({
  fieldId: z.string().describe('Custom field ID to delete')
});

export const deleteCustomFieldTool: Tool = {
  name: 'customfield.delete.new',
  description: 'Delete custom fields with dependency checking',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: { type: 'string', description: 'Custom field ID to delete' }
    },
    required: ['fieldId']
  }
};

export async function executeDeleteCustomField(args: unknown, client: JiraRestClient) {
  const validatedArgs = CustomFieldDeleteSchema.parse(args);
  
  await client.delete(`/rest/api/3/field/${validatedArgs.fieldId}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Custom field ${validatedArgs.fieldId} deleted successfully`
      }, null, 2)
    }]
  };
}
