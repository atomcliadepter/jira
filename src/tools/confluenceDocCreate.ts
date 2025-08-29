import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const ConfluenceDocCreateSchema = z.object({
  spaceKey: z.string().describe('Confluence space key'),
  projectKey: z.string().describe('Jira project key to document'),
  title: z.string().optional().describe('Documentation page title'),
  includeIssues: z.boolean().optional().default(true).describe('Include issue details'),
  jql: z.string().optional().describe('Custom JQL to filter issues')
});

export const createConfluenceDocTool: Tool = {
  name: 'confluence.documentation.create',
  description: 'Auto-generate documentation from Jira data',
  inputSchema: {
    type: 'object',
    properties: {
      spaceKey: { type: 'string', description: 'Confluence space key' },
      projectKey: { type: 'string', description: 'Jira project key to document' },
      title: { type: 'string', description: 'Documentation page title' },
      includeIssues: { type: 'boolean', default: true, description: 'Include issue details' },
      jql: { type: 'string', description: 'Custom JQL to filter issues' }
    },
    required: ['spaceKey', 'projectKey']
  }
};

export async function executeCreateConfluenceDoc(args: unknown, client: JiraRestClient) {
  const validatedArgs = ConfluenceDocCreateSchema.parse(args);
  
  try {
    // Get project information
    const project = await client.get(`${client.config.baseUrl}/rest/api/3/project/${validatedArgs.projectKey}`);
    
    // Get issues for documentation
    const jql = validatedArgs.jql || `project = ${validatedArgs.projectKey} ORDER BY created DESC`;
    const issues = await client.get(`${client.config.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,status,assignee,created,priority`);
    
    // Generate documentation content
    const title = validatedArgs.title || `${project.name} Project Documentation`;
    let content = `<h1>${project.name} Documentation</h1>`;
    content += `<p><strong>Project Key:</strong> ${project.key}</p>`;
    content += `<p><strong>Description:</strong> ${project.description || 'No description available'}</p>`;
    content += `<p><strong>Lead:</strong> ${project.lead?.displayName || 'Not assigned'}</p>`;
    content += `<p><strong>Generated:</strong> ${new Date().toISOString()}</p>`;
    
    if (validatedArgs.includeIssues && issues.issues?.length > 0) {
      content += `<h2>Recent Issues (${issues.total})</h2>`;
      content += '<table><tr><th>Key</th><th>Summary</th><th>Status</th><th>Assignee</th><th>Priority</th></tr>';
      
      issues.issues.forEach((issue: any) => {
        content += `<tr>`;
        content += `<td><a href="${client.config.baseUrl}/browse/${issue.key}">${issue.key}</a></td>`;
        content += `<td>${issue.fields.summary}</td>`;
        content += `<td>${issue.fields.status?.name || 'Unknown'}</td>`;
        content += `<td>${issue.fields.assignee?.displayName || 'Unassigned'}</td>`;
        content += `<td>${issue.fields.priority?.name || 'None'}</td>`;
        content += `</tr>`;
      });
      
      content += '</table>';
    }
    
    // Create Confluence page
    const pageData = {
      type: 'page',
      title: title,
      space: { key: validatedArgs.spaceKey },
      body: {
        storage: {
          value: content,
          representation: 'storage'
        }
      }
    };

    const confluenceUrl = client.config.baseUrl.replace('/jira/', '/wiki/') + '/rest/api/content';
    const response = await client.post(confluenceUrl, pageData);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Documentation created for project ${validatedArgs.projectKey}`,
          page: response,
          issuesIncluded: issues.issues?.length || 0
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
          message: 'Failed to create documentation'
        }, null, 2)
      }]
    };
  }
}
