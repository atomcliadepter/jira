import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const CustomFieldCreateSchema = z.object({
  name: z.string().describe('Field name'),
  description: z.string().optional().describe('Field description'),
  type: z.string().describe('Field type (e.g., "com.atlassian.jira.plugin.system.customfieldtypes:textfield")'),
  searcherKey: z.string().optional().describe('Searcher key for the field')
});

export const createCustomFieldTool: Tool = {
  name: 'customfield.create.new',
  description: 'Create custom fields with advanced configuration options',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Field name' },
      description: { type: 'string', description: 'Field description' },
      type: { type: 'string', description: 'Field type (e.g., "com.atlassian.jira.plugin.system.customfieldtypes:textfield")' },
      searcherKey: { type: 'string', description: 'Searcher key for the field' }
    },
    required: ['name', 'type']
  }
};

export async function executeCreateCustomField(args: unknown, client: JiraRestClient) {
  const validatedArgs = CustomFieldCreateSchema.parse(args);
  
  const fieldData = {
    name: validatedArgs.name,
    type: validatedArgs.type,
    ...(validatedArgs.description && { description: validatedArgs.description }),
    ...(validatedArgs.searcherKey && { searcherKey: validatedArgs.searcherKey })
  };

  const response = await client.post('/rest/api/3/field', fieldData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Custom field '${validatedArgs.name}' created successfully`,
        field: response
      }, null, 2)
    }]
  };
}
