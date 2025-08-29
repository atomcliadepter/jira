import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const FieldConfigCopySchema = z.object({
  sourceId: z.number().describe('Source field configuration ID'),
  name: z.string().describe('Name for the copied configuration'),
  description: z.string().optional().describe('Description for the copied configuration')
});

export const copyFieldConfigTool: Tool = {
  name: 'fieldconfig.copy.new',
  description: 'Copy field configurations between projects',
  inputSchema: {
    type: 'object',
    properties: {
      sourceId: { type: 'number', description: 'Source field configuration ID' },
      name: { type: 'string', description: 'Name for the copied configuration' },
      description: { type: 'string', description: 'Description for the copied configuration' }
    },
    required: ['sourceId', 'name']
  }
};

export async function executeCopyFieldConfig(args: unknown, client: JiraRestClient) {
  const validatedArgs = FieldConfigCopySchema.parse(args);
  
  try {
    // Get source configuration
    const sourceConfig = await client.get(`/rest/api/3/fieldconfiguration/${validatedArgs.sourceId}`);
    
    // Create new configuration
    const newConfigData = {
      name: validatedArgs.name,
      description: validatedArgs.description || `Copy of ${sourceConfig.name}`
    };
    
    const newConfig = await client.post('/rest/api/3/fieldconfiguration', newConfigData);
    
    // Get source configuration items
    const sourceItems = await client.get(`/rest/api/3/fieldconfiguration/${validatedArgs.sourceId}/fields`);
    
    // Copy items to new configuration if any exist
    if (sourceItems.values && sourceItems.values.length > 0) {
      const itemsData = {
        fieldConfigurationItems: sourceItems.values.map((item: any) => ({
          id: item.id,
          isHidden: item.isHidden,
          isRequired: item.isRequired,
          description: item.description
        }))
      };
      
      await client.put(`/rest/api/3/fieldconfiguration/${newConfig.id}/fields`, itemsData);
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Field configuration copied successfully`,
          sourceConfiguration: {
            id: validatedArgs.sourceId,
            name: sourceConfig.name
          },
          newConfiguration: {
            id: newConfig.id,
            name: newConfig.name
          },
          copiedItems: sourceItems.values?.length || 0
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message,
          message: 'Failed to copy field configuration'
        }, null, 2)
      }]
    };
  }
}
