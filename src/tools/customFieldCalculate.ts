import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const CustomFieldCalculateSchema = z.object({
  fieldId: z.string().describe('Custom field ID'),
  expression: z.string().describe('Calculation expression'),
  issueId: z.string().describe('Issue ID for context'),
  variables: z.record(z.any()).optional().describe('Variables for calculation')
});

export const calculateCustomFieldTool: Tool = {
  name: 'customfield.calculate.new',
  description: 'Calculate computed field values using expressions',
  inputSchema: {
    type: 'object',
    properties: {
      fieldId: { type: 'string', description: 'Custom field ID' },
      expression: { type: 'string', description: 'Calculation expression' },
      issueId: { type: 'string', description: 'Issue ID for context' },
      variables: { type: 'object', description: 'Variables for calculation' }
    },
    required: ['fieldId', 'expression', 'issueId']
  }
};

export async function executeCalculateCustomField(args: unknown, client: JiraRestClient) {
  const validatedArgs = CustomFieldCalculateSchema.parse(args);
  
  try {
    // Get issue data for calculation context
    const issue = await client.get(`/rest/api/3/issue/${validatedArgs.issueId}`);
    
    // Simple expression evaluation (in real implementation, use a safe expression evaluator)
    let calculatedValue: any;
    let calculationDetails = '';
    
    // Basic calculation examples
    if (validatedArgs.expression.includes('storyPoints')) {
      const storyPoints = issue.fields.customfield_10016 || 0; // Common story points field
      calculatedValue = storyPoints;
      calculationDetails = `Story points value: ${storyPoints}`;
    } else if (validatedArgs.expression.includes('daysOpen')) {
      const created = new Date(issue.fields.created);
      const now = new Date();
      const daysOpen = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      calculatedValue = daysOpen;
      calculationDetails = `Days since creation: ${daysOpen}`;
    } else if (validatedArgs.expression.includes('priority')) {
      const priorityValue = issue.fields.priority?.name || 'None';
      calculatedValue = priorityValue;
      calculationDetails = `Priority value: ${priorityValue}`;
    } else {
      calculatedValue = validatedArgs.expression;
      calculationDetails = 'Expression returned as-is';
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          fieldId: validatedArgs.fieldId,
          issueId: validatedArgs.issueId,
          expression: validatedArgs.expression,
          calculatedValue,
          calculationDetails,
          variables: validatedArgs.variables || {},
          calculatedAt: new Date().toISOString()
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          fieldId: validatedArgs.fieldId,
          issueId: validatedArgs.issueId,
          expression: validatedArgs.expression,
          error: error.message,
          calculatedValue: null,
          success: false
        }, null, 2)
      }]
    };
  }
}
