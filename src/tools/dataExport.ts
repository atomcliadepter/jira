import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';
import { writeFileSync } from 'fs';

const DataExportSchema = z.object({
  jql: z.string().describe('JQL query to export'),
  format: z.enum(['json', 'csv']).default('json'),
  outputPath: z.string().optional().describe('Output file path'),
  fields: z.array(z.string()).optional().describe('Specific fields to export'),
  maxResults: z.number().optional().default(1000).describe('Maximum results to export')
});

export const dataExportTool: Tool = {
  name: 'advanced.export.data.new',
  description: 'Export data in multiple formats with custom templates',
  inputSchema: {
    type: 'object',
    properties: {
      jql: { type: 'string', description: 'JQL query to export' },
      format: { type: 'string', enum: ['json', 'csv'], default: 'json', description: 'Export format' },
      outputPath: { type: 'string', description: 'Output file path' },
      fields: { type: 'array', items: { type: 'string' }, description: 'Specific fields to export' },
      maxResults: { type: 'number', default: 1000, description: 'Maximum results to export' }
    },
    required: ['jql']
  }
};

export async function executeDataExport(args: unknown, client: JiraRestClient) {
  const validatedArgs = DataExportSchema.parse(args);
  
  try {
    const fields = validatedArgs.fields || ['key', 'summary', 'status', 'assignee', 'reporter', 'created', 'updated', 'priority', 'issuetype'];
    const fieldsParam = fields.join(',');
    
    const response = await client.get(`/rest/api/3/search?jql=${encodeURIComponent(validatedArgs.jql)}&maxResults=${validatedArgs.maxResults}&fields=${fieldsParam}`);
    
    let exportData: any;
    let content: string;
    
    if (validatedArgs.format === 'csv') {
      // Convert to CSV
      const csvHeaders = ['Key', 'Summary', 'Status', 'Assignee', 'Reporter', 'Created', 'Updated', 'Priority', 'Issue Type'];
      const csvRows = response.issues.map((issue: any) => [
        issue.key,
        `"${(issue.fields.summary || '').replace(/"/g, '""')}"`,
        issue.fields.status?.name || '',
        issue.fields.assignee?.displayName || '',
        issue.fields.reporter?.displayName || '',
        issue.fields.created || '',
        issue.fields.updated || '',
        issue.fields.priority?.name || '',
        issue.fields.issuetype?.name || ''
      ]);
      
      content = [csvHeaders.join(','), ...csvRows.map((row: any[]) => row.join(','))].join('\n');
      exportData = {
        format: 'csv',
        totalIssues: response.total,
        exportedIssues: response.issues.length,
        headers: csvHeaders
      };
    } else {
      // JSON format
      exportData = {
        query: validatedArgs.jql,
        totalIssues: response.total,
        exportedIssues: response.issues.length,
        maxResults: validatedArgs.maxResults,
        fields: fields,
        issues: response.issues.map((issue: any) => ({
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status?.name,
          assignee: issue.fields.assignee?.displayName,
          reporter: issue.fields.reporter?.displayName,
          created: issue.fields.created,
          updated: issue.fields.updated,
          priority: issue.fields.priority?.name,
          issueType: issue.fields.issuetype?.name,
          url: `${client['config']?.baseUrl || process.env.JIRA_BASE_URL}/browse/${issue.key}`
        })),
        exportedAt: new Date().toISOString()
      };
      content = JSON.stringify(exportData, null, 2);
    }
    
    // Save to file if path provided
    if (validatedArgs.outputPath) {
      writeFileSync(validatedArgs.outputPath, content);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Data exported to ${validatedArgs.outputPath}`,
            format: validatedArgs.format,
            totalIssues: response.total,
            exportedIssues: response.issues.length,
            filePath: validatedArgs.outputPath
          }, null, 2)
        }]
      };
    } else {
      // Return data directly
      return {
        content: [{
          type: 'text',
          text: validatedArgs.format === 'csv' ? content : JSON.stringify(exportData, null, 2)
        }]
      };
    }
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message,
          message: 'Failed to export data'
        }, null, 2)
      }]
    };
  }
}
