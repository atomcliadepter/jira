import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const CustomFieldOptionsSchema = z.object({
  fieldId: z.string().describe('Custom field ID'),
  contextId: z.string().describe('Context ID'),
  options: z.array(z.object({
    value: z.string().describe('Option value'),
    disabled: z.boolean().optional().describe('Whether option is disabled')
  })).describe('Field options to set')
});

export const setCustomFieldOptionsTool: Tool = {
  name: 'customfield.options.set.new',
  description: 'Set field options for select lists and multi-select fields',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: { type: 'string', description: 'Custom field ID' },
      contextId: { type: 'string', description: 'Context ID' },
      options: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            value: { type: 'string', description: 'Option value' },
            disabled: { type: 'boolean', description: 'Whether option is disabled' }
          },
          required: ['value']
        },
        description: 'Field options to set'
      }
    },
    required: ['fieldId', 'contextId', 'options']
  }
};

export async function executeSetCustomFieldOptions(args: unknown, client: JiraRestClient) {
  const validatedArgs = CustomFieldOptionsSchema.parse(args);
  
  const optionsData = {
    options: validatedArgs.options
  };

  const response = await client.put(`/rest/api/3/field/${validatedArgs.fieldId}/context/${validatedArgs.contextId}/option`, optionsData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Options set for field ${validatedArgs.fieldId} context ${validatedArgs.contextId}`,
        options: response
      }, null, 2)
    }]
  };
}
