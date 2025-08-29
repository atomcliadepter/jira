import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const CustomFieldGetSchema = z.object({
  fieldId: z.string().describe('Custom field ID')
});

export const getCustomFieldTool: Tool = {
  name: 'customfield.get.new',
  description: 'Retrieve custom field details and configurations',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: { type: 'string', description: 'Custom field ID' }
    },
    required: ['fieldId']
  }
};

export async function executeGetCustomField(args: unknown, client: JiraRestClient) {
  const validatedArgs = CustomFieldGetSchema.parse(args);
  
  const response = await client.get(`/rest/api/3/field/${validatedArgs.fieldId}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
