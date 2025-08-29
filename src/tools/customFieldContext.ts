import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const CustomFieldContextSchema = z.object({
  fieldId: z.string().describe('Custom field ID'),
  name: z.string().describe('Context name'),
  description: z.string().optional().describe('Context description'),
  projectIds: z.array(z.string()).optional().describe('Project IDs for context scope'),
  issueTypeIds: z.array(z.string()).optional().describe('Issue type IDs for context scope')
});

export const createCustomFieldContextTool: Tool = {
  name: 'customfield.context.create.new',
  description: 'Create field contexts with project and issue type scoping',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: { type: 'string', description: 'Custom field ID' },
      name: { type: 'string', description: 'Context name' },
      description: { type: 'string', description: 'Context description' },
      projectIds: { type: 'array', items: { type: 'string' }, description: 'Project IDs for context scope' },
      issueTypeIds: { type: 'array', items: { type: 'string' }, description: 'Issue type IDs for context scope' }
    },
    required: ['fieldId', 'name']
  }
};

export async function executeCreateCustomFieldContext(args: unknown, client: JiraRestClient) {
  const validatedArgs = CustomFieldContextSchema.parse(args);
  
  const contextData = {
    name: validatedArgs.name,
    ...(validatedArgs.description && { description: validatedArgs.description }),
    ...(validatedArgs.projectIds?.length && { projectIds: validatedArgs.projectIds }),
    ...(validatedArgs.issueTypeIds?.length && { issueTypeIds: validatedArgs.issueTypeIds })
  };

  const response = await client.post(`/rest/api/3/field/${validatedArgs.fieldId}/context`, contextData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Context '${validatedArgs.name}' created for field ${validatedArgs.fieldId}`,
        context: response
      }, null, 2)
    }]
  };
}
