import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const AutomationRuleExecuteSchema = z.object({
  ruleId: z.string().describe('Automation rule ID'),
  issueKey: z.string().optional().describe('Issue key to execute rule against'),
  context: z.record(z.any()).optional().describe('Additional context for rule execution')
});

export const executeAutomationRuleTool: Tool = {
  name: 'automation.rule.execute',
  description: 'Execute automation rules manually',
  inputSchema: {
    type: 'object',
    properties: {
      ruleId: { type: 'string', description: 'Automation rule ID' },
      issueKey: { type: 'string', description: 'Issue key to execute rule against' },
      context: { type: 'object', description: 'Additional context for rule execution' }
    },
    required: ['ruleId']
  }
};

export async function executeAutomationRuleExecution(args: unknown, client: JiraRestClient) {
  const validatedArgs = AutomationRuleExecuteSchema.parse(args);
  
  const executionData = {
    ruleId: validatedArgs.ruleId,
    ...(validatedArgs.issueKey && { issueKey: validatedArgs.issueKey }),
    ...(validatedArgs.context && { context: validatedArgs.context })
  };

  const response = await client.post(`${client.config.baseUrl}/rest/cb-automation/latest/project/GLOBAL/rule/${validatedArgs.ruleId}/execute`, executionData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Automation rule ${validatedArgs.ruleId} executed successfully`,
        execution: response
      }, null, 2)
    }]
  };
}
