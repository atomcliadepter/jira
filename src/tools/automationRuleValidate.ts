import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const AutomationRuleValidateSchema = z.object({
  ruleId: z.string().describe('Automation rule ID to validate')
});

export const validateAutomationRuleTool: Tool = {
  name: 'automation.rule.validate',
  description: 'Validate automation rule syntax and logic',
  inputSchema: {
    type: 'object',
    properties: {
      ruleId: { type: 'string', description: 'Automation rule ID to validate' }
    },
    required: ['ruleId']
  }
};

export async function executeValidateAutomationRule(args: unknown, client: JiraRestClient) {
  const validatedArgs = AutomationRuleValidateSchema.parse(args);
  
  try {
    // Get rule details for validation
    const rule = await client.get(`${client.config.baseUrl}/rest/cb-automation/latest/project/GLOBAL/rule/${validatedArgs.ruleId}`);
    
    // Basic validation checks
    const validationResults = {
      ruleId: validatedArgs.ruleId,
      ruleName: rule.name,
      isValid: true,
      validationMessages: [] as string[],
      state: rule.state,
      hasComponents: !!rule.components && rule.components.length > 0,
      componentCount: rule.components?.length || 0
    };
    
    // Check for potential issues
    if (!rule.components || rule.components.length === 0) {
      validationResults.isValid = false;
      validationResults.validationMessages.push('No components found in rule');
    }
    
    if (rule.state === 'DISABLED') {
      validationResults.validationMessages.push('Rule is currently disabled');
    }
    
    // Check for trigger component
    const hasTrigger = rule.components?.some((comp: any) => comp.component === 'TRIGGER');
    if (!hasTrigger) {
      validationResults.isValid = false;
      validationResults.validationMessages.push('No trigger component found');
    }
    
    // Check for action components
    const hasActions = rule.components?.some((comp: any) => comp.component !== 'TRIGGER');
    if (!hasActions) {
      validationResults.validationMessages.push('Warning: No action components found');
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
          ruleId: validatedArgs.ruleId,
          isValid: false,
          validationMessages: [`Validation failed: ${error.message}`],
          error: error.message
        }, null, 2)
      }]
    };
  }
}
