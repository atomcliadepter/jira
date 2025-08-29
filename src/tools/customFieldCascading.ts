import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const CustomFieldCascadingSchema = z.object({
  fieldId: z.string().describe('Custom field ID'),
  contextId: z.string().describe('Context ID'),
  cascadingOptions: z.array(z.object({
    value: z.string().describe('Parent option value'),
    children: z.array(z.object({
      value: z.string().describe('Child option value'),
      disabled: z.boolean().optional().describe('Whether child option is disabled')
    })).optional().describe('Child options')
  })).describe('Cascading field options')
});

export const setCascadingCustomFieldTool: Tool = {
  name: 'customfield.cascading.set.new',
  description: 'Configure cascading select field options',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: { type: 'string', description: 'Custom field ID' },
      contextId: { type: 'string', description: 'Context ID' },
      cascadingOptions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            value: { type: 'string', description: 'Parent option value' },
            children: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: { type: 'string', description: 'Child option value' },
                  disabled: { type: 'boolean', description: 'Whether child option is disabled' }
                },
                required: ['value']
              },
              description: 'Child options'
            }
          },
          required: ['value']
        },
        description: 'Cascading field options'
      }
    },
    required: ['fieldId', 'contextId', 'cascadingOptions']
  }
};

export async function executeSetCascadingCustomField(args: unknown, client: JiraRestClient) {
  const validatedArgs = CustomFieldCascadingSchema.parse(args);
  
  const cascadingData = {
    options: validatedArgs.cascadingOptions
  };

  const response = await client.put(`/rest/api/3/field/${validatedArgs.fieldId}/context/${validatedArgs.contextId}/option`, cascadingData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Cascading options set for field ${validatedArgs.fieldId}`,
        options: response
      }, null, 2)
    }]
  };
}
