import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const AdvancedJqlBuilderEnhancedSchema = z.object({
  project: z.string().optional().describe('Project key'),
  issueType: z.string().optional().describe('Issue type'),
  status: z.string().optional().describe('Status'),
  assignee: z.string().optional().describe('Assignee'),
  priority: z.string().optional().describe('Priority'),
  labels: z.array(z.string()).optional().describe('Labels'),
  components: z.array(z.string()).optional().describe('Components'),
  fixVersions: z.array(z.string()).optional().describe('Fix versions'),
  createdAfter: z.string().optional().describe('Created after date'),
  createdBefore: z.string().optional().describe('Created before date'),
  customFields: z.record(z.any()).optional().describe('Custom field filters'),
  orderBy: z.string().optional().describe('Order by clause'),
  validate: z.boolean().optional().default(true).describe('Validate JQL syntax')
});

export const advancedJqlBuilderEnhancedTool: Tool = {
  name: 'advanced.jql.builder.enhanced',
  description: 'Enhanced interactive JQL query builder with syntax validation',
  inputSchema: {
    type: 'object',
    properties: {
      project: { type: 'string', description: 'Project key' },
      issueType: { type: 'string', description: 'Issue type' },
      status: { type: 'string', description: 'Status' },
      assignee: { type: 'string', description: 'Assignee' },
      priority: { type: 'string', description: 'Priority' },
      labels: { type: 'array', items: { type: 'string' }, description: 'Labels' },
      components: { type: 'array', items: { type: 'string' }, description: 'Components' },
      fixVersions: { type: 'array', items: { type: 'string' }, description: 'Fix versions' },
      createdAfter: { type: 'string', description: 'Created after date' },
      createdBefore: { type: 'string', description: 'Created before date' },
      customFields: { type: 'object', description: 'Custom field filters' },
      orderBy: { type: 'string', description: 'Order by clause' },
      validate: { type: 'boolean', default: true, description: 'Validate JQL syntax' }
    }
  }
};

export async function executeAdvancedJqlBuilderEnhanced(args: unknown, client: JiraRestClient) {
  const validatedArgs = AdvancedJqlBuilderEnhancedSchema.parse(args);
  
  const jqlParts = [];
  
  // Build JQL query
  if (validatedArgs.project) {
    jqlParts.push(`project = "${validatedArgs.project}"`);
  }
  
  if (validatedArgs.issueType) {
    jqlParts.push(`issuetype = "${validatedArgs.issueType}"`);
  }
  
  if (validatedArgs.status) {
    jqlParts.push(`status = "${validatedArgs.status}"`);
  }
  
  if (validatedArgs.assignee) {
    jqlParts.push(`assignee = "${validatedArgs.assignee}"`);
  }
  
  if (validatedArgs.priority) {
    jqlParts.push(`priority = "${validatedArgs.priority}"`);
  }
  
  if (validatedArgs.labels?.length) {
    const labelClause = validatedArgs.labels.map(label => `"${label}"`).join(', ');
    jqlParts.push(`labels in (${labelClause})`);
  }
  
  if (validatedArgs.components?.length) {
    const componentClause = validatedArgs.components.map(comp => `"${comp}"`).join(', ');
    jqlParts.push(`component in (${componentClause})`);
  }
  
  if (validatedArgs.fixVersions?.length) {
    const versionClause = validatedArgs.fixVersions.map(ver => `"${ver}"`).join(', ');
    jqlParts.push(`fixVersion in (${versionClause})`);
  }
  
  if (validatedArgs.createdAfter) {
    jqlParts.push(`created >= "${validatedArgs.createdAfter}"`);
  }
  
  if (validatedArgs.createdBefore) {
    jqlParts.push(`created <= "${validatedArgs.createdBefore}"`);
  }
  
  // Add custom fields
  if (validatedArgs.customFields) {
    Object.entries(validatedArgs.customFields).forEach(([field, value]) => {
      jqlParts.push(`"${field}" = "${value}"`);
    });
  }
  
  let jql = jqlParts.join(' AND ');
  
  // Add order by
  if (validatedArgs.orderBy) {
    jql += ` ORDER BY ${validatedArgs.orderBy}`;
  }
  
  // Validate JQL if requested
  let validationResult: { valid: boolean; errors: string[] } = { valid: true, errors: [] };
  if (validatedArgs.validate && jql) {
    try {
      await client.get(`${client.config.baseUrl}/rest/api/3/jql/parse?query=${encodeURIComponent(jql)}`);
    } catch (error: any) {
      validationResult = {
        valid: false,
        errors: [error.message]
      };
    }
  }
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        jql: jql || 'No filters specified',
        validation: validationResult,
        filters: {
          project: validatedArgs.project,
          issueType: validatedArgs.issueType,
          status: validatedArgs.status,
          assignee: validatedArgs.assignee,
          priority: validatedArgs.priority,
          labels: validatedArgs.labels,
          components: validatedArgs.components,
          fixVersions: validatedArgs.fixVersions,
          dateRange: {
            after: validatedArgs.createdAfter,
            before: validatedArgs.createdBefore
          },
          customFields: validatedArgs.customFields
        },
        generatedAt: new Date().toISOString()
      }, null, 2)
    }]
  };
}
