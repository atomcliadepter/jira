import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const FieldConfigAssignSchema = z.object({
  schemeId: z.number().describe('Field configuration scheme ID'),
  projectId: z.string().describe('Project ID to assign scheme to')
});

export const assignFieldConfigSchemeTool: Tool = {
  name: 'fieldconfig.scheme.assign.new',
  description: 'Assign schemes to projects',
  inputSchema: {
    type: 'object',
    properties: {
      schemeId: { type: 'number', description: 'Field configuration scheme ID' },
      projectId: { type: 'string', description: 'Project ID to assign scheme to' }
    },
    required: ['schemeId', 'projectId']
  }
};

export async function executeAssignFieldConfigScheme(args: unknown, client: JiraRestClient) {
  const validatedArgs = FieldConfigAssignSchema.parse(args);
  
  const assignData = {
    fieldConfigurationSchemeId: validatedArgs.schemeId.toString()
  };

  const response = await client.put(`/rest/api/3/fieldconfigurationscheme/project`, {
    fieldConfigurationSchemeId: validatedArgs.schemeId.toString(),
    projectId: validatedArgs.projectId
  });
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Field configuration scheme ${validatedArgs.schemeId} assigned to project ${validatedArgs.projectId}`,
        assignment: response
      }, null, 2)
    }]
  };
}
