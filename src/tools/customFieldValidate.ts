import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const CustomFieldValidateSchema = z.object({
  fieldId: z.string().describe('Custom field ID'),
  value: z.any().describe('Value to validate'),
  issueId: z.string().optional().describe('Issue ID for context validation')
});

export const validateCustomFieldTool: Tool = {
  name: 'customfield.validate.new',
  description: 'Validate field values against field configurations',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: { type: 'string', description: 'Custom field ID' },
      value: { description: 'Value to validate' },
      issueId: { type: 'string', description: 'Issue ID for context validation' }
    },
    required: ['fieldId', 'value']
  }
};

export async function executeValidateCustomField(args: unknown, client: JiraRestClient) {
  const validatedArgs = CustomFieldValidateSchema.parse(args);
  
  try {
    // Get field configuration
    const field = await client.get(`/rest/api/3/field/${validatedArgs.fieldId}`);
    
    // Basic validation based on field type
    let isValid = true;
    let validationMessage = 'Value is valid';
    
    // Simple validation logic based on field type
    if (field.schema?.type === 'string' && typeof validatedArgs.value !== 'string') {
      isValid = false;
      validationMessage = 'Value must be a string';
    } else if (field.schema?.type === 'number' && typeof validatedArgs.value !== 'number') {
      isValid = false;
      validationMessage = 'Value must be a number';
    } else if (field.schema?.type === 'array' && !Array.isArray(validatedArgs.value)) {
      isValid = false;
      validationMessage = 'Value must be an array';
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          fieldId: validatedArgs.fieldId,
          value: validatedArgs.value,
          isValid,
          validationMessage,
          fieldType: field.schema?.type || 'unknown',
          fieldName: field.name
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          fieldId: validatedArgs.fieldId,
          value: validatedArgs.value,
          isValid: false,
          validationMessage: `Validation failed: ${error.message}`,
          error: error.message
        }, null, 2)
      }]
    };
  }
}
