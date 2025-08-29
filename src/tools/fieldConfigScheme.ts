import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const FieldConfigSchemeSchema = z.object({
  name: z.string().describe('Field configuration scheme name'),
  description: z.string().optional().describe('Field configuration scheme description')
});

export const createFieldConfigSchemeTool: Tool = {
  name: 'fieldconfig.scheme.create.new',
  description: 'Create field configuration schemes',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Field configuration scheme name' },
      description: { type: 'string', description: 'Field configuration scheme description' }
    },
    required: ['name']
  }
};

export async function executeCreateFieldConfigScheme(args: unknown, client: JiraRestClient) {
  const validatedArgs = FieldConfigSchemeSchema.parse(args);
  
  const schemeData = {
    name: validatedArgs.name,
    ...(validatedArgs.description && { description: validatedArgs.description })
  };

  const response = await client.post('/rest/api/3/fieldconfigurationscheme', schemeData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Field configuration scheme '${validatedArgs.name}' created successfully`,
        scheme: response
      }, null, 2)
    }]
  };
}
