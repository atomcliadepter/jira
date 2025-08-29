import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const JQLBuilderSchema = z.object({
  project: z.string().optional().describe('Project key'),
  issueType: z.string().optional().describe('Issue type'),
  status: z.string().optional().describe('Status'),
  assignee: z.string().optional().describe('Assignee'),
  reporter: z.string().optional().describe('Reporter'),
  priority: z.string().optional().describe('Priority'),
  labels: z.array(z.string()).optional().describe('Labels'),
  components: z.array(z.string()).optional().describe('Components'),
  fixVersions: z.array(z.string()).optional().describe('Fix versions'),
  createdAfter: z.string().optional().describe('Created after date (YYYY-MM-DD)'),
  createdBefore: z.string().optional().describe('Created before date (YYYY-MM-DD)'),
  updatedAfter: z.string().optional().describe('Updated after date (YYYY-MM-DD)'),
  updatedBefore: z.string().optional().describe('Updated before date (YYYY-MM-DD)'),
  customJQL: z.string().optional().describe('Additional custom JQL')
});

export const jqlBuilderTool: Tool = {
  name: 'advanced.jql.builder.new',
  description: 'Interactive JQL query builder with syntax validation',
  inputSchema: {
    type: 'object',
    properties: {
      project: { type: 'string', description: 'Project key' },
      issueType: { type: 'string', description: 'Issue type' },
      status: { type: 'string', description: 'Status' },
      assignee: { type: 'string', description: 'Assignee' },
      reporter: { type: 'string', description: 'Reporter' },
      priority: { type: 'string', description: 'Priority' },
      labels: { type: 'array', items: { type: 'string' }, description: 'Labels' },
      components: { type: 'array', items: { type: 'string' }, description: 'Components' },
      fixVersions: { type: 'array', items: { type: 'string' }, description: 'Fix versions' },
      createdAfter: { type: 'string', description: 'Created after date (YYYY-MM-DD)' },
      createdBefore: { type: 'string', description: 'Created before date (YYYY-MM-DD)' },
      updatedAfter: { type: 'string', description: 'Updated after date (YYYY-MM-DD)' },
      updatedBefore: { type: 'string', description: 'Updated before date (YYYY-MM-DD)' },
      customJQL: { type: 'string', description: 'Additional custom JQL' }
    }
  }
};

export async function executeJQLBuilder(args: unknown, client: JiraRestClient) {
  const validatedArgs = JQLBuilderSchema.parse(args);
  
  const jqlParts: string[] = [];
  
  if (validatedArgs.project) jqlParts.push(`project = "${validatedArgs.project}"`);
  if (validatedArgs.issueType) jqlParts.push(`issuetype = "${validatedArgs.issueType}"`);
  if (validatedArgs.status) jqlParts.push(`status = "${validatedArgs.status}"`);
  if (validatedArgs.assignee) jqlParts.push(`assignee = "${validatedArgs.assignee}"`);
  if (validatedArgs.reporter) jqlParts.push(`reporter = "${validatedArgs.reporter}"`);
  if (validatedArgs.priority) jqlParts.push(`priority = "${validatedArgs.priority}"`);
  if (validatedArgs.labels?.length) jqlParts.push(`labels IN (${validatedArgs.labels.map(l => `"${l}"`).join(', ')})`);
  if (validatedArgs.components?.length) jqlParts.push(`component IN (${validatedArgs.components.map(c => `"${c}"`).join(', ')})`);
  if (validatedArgs.fixVersions?.length) jqlParts.push(`fixVersion IN (${validatedArgs.fixVersions.map(v => `"${v}"`).join(', ')})`);
  if (validatedArgs.createdAfter) jqlParts.push(`created >= "${validatedArgs.createdAfter}"`);
  if (validatedArgs.createdBefore) jqlParts.push(`created <= "${validatedArgs.createdBefore}"`);
  if (validatedArgs.updatedAfter) jqlParts.push(`updated >= "${validatedArgs.updatedAfter}"`);
  if (validatedArgs.updatedBefore) jqlParts.push(`updated <= "${validatedArgs.updatedBefore}"`);
  if (validatedArgs.customJQL) jqlParts.push(validatedArgs.customJQL);
  
  const jql = jqlParts.join(' AND ');
  
  // Validate JQL by testing it
  try {
    await client.get(`/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=1`);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          jql: jql,
          valid: true,
          message: 'JQL query built and validated successfully'
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          jql: jql,
          valid: false,
          error: error.message,
          message: 'JQL query built but validation failed'
        }, null, 2)
      }]
    };
  }
}
