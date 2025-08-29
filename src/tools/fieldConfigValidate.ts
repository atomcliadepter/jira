import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const FieldConfigValidateSchema = z.object({
  id: z.number().describe('Field configuration ID to validate')
});

export const validateFieldConfigTool: Tool = {
  name: 'fieldconfig.validate.new',
  description: 'Validate field configuration integrity',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'number', description: 'Field configuration ID to validate' }
    },
    required: ['id']
  }
};

export async function executeValidateFieldConfig(args: unknown, client: JiraRestClient) {
  const validatedArgs = FieldConfigValidateSchema.parse(args);
  
  try {
    // Get field configuration details
    const config = await client.get(`/rest/api/3/fieldconfiguration/${validatedArgs.id}`);
    
    // Get field configuration items
    const items = await client.get(`/rest/api/3/fieldconfiguration/${validatedArgs.id}/fields`);
    
    // Basic validation checks
    const validationResults = {
      configurationId: validatedArgs.id,
      configurationName: config.name,
      isValid: true,
      validationMessages: [] as string[],
      itemCount: items.values?.length || 0,
      requiredFields: items.values?.filter((item: any) => item.isRequired).length || 0,
      hiddenFields: items.values?.filter((item: any) => item.isHidden).length || 0
    };
    
    // Check for potential issues
    if (validationResults.itemCount === 0) {
      validationResults.isValid = false;
      validationResults.validationMessages.push('No field configuration items found');
    }
    
    if (validationResults.requiredFields === 0) {
      validationResults.validationMessages.push('Warning: No required fields configured');
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(validationResults, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          configurationId: validatedArgs.id,
          isValid: false,
          validationMessages: [`Validation failed: ${error.message}`],
          error: error.message
        }, null, 2)
      }]
    };
  }
}
