import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

const AdvancedExportDataEnhancedSchema = z.object({
  jql: z.string().describe('JQL query for data export'),
  format: z.enum(['json', 'csv', 'xlsx']).describe('Export format'),
  outputPath: z.string().describe('Output file path'),
  fields: z.array(z.string()).optional().describe('Specific fields to export'),
  maxResults: z.number().optional().default(1000).describe('Maximum results to export'),
  template: z.string().optional().describe('Custom export template')
});

export const advancedExportDataEnhancedTool: Tool = {
  name: 'advanced.export.data.enhanced',
  description: 'Enhanced export data in multiple formats with custom templates',
  inputSchema: {
    type: 'object',
    properties: {
      jql: { type: 'string', description: 'JQL query for data export' },
      format: { type: 'string', enum: ['json', 'csv', 'xlsx'], description: 'Export format' },
      outputPath: { type: 'string', description: 'Output file path' },
      fields: { type: 'array', items: { type: 'string' }, description: 'Specific fields to export' },
      maxResults: { type: 'number', default: 1000, description: 'Maximum results to export' },
      template: { type: 'string', description: 'Custom export template' }
    },
    required: ['jql', 'format', 'outputPath']
  }
};

export async function executeAdvancedExportDataEnhanced(args: unknown, client: JiraRestClient) {
  const validatedArgs = AdvancedExportDataEnhancedSchema.parse(args);
  
  // Get issues based on JQL
  const fieldsParam = validatedArgs.fields?.join(',') || 'summary,status,assignee,created,updated,priority';
  const issues = await client.get(`${client.config.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(validatedArgs.jql)}&maxResults=${validatedArgs.maxResults}&fields=${fieldsParam}`);
  
  // Prepare export data
  const exportData = issues.issues.map((issue: any) => {
    const flatIssue: any = {
      key: issue.key,
      id: issue.id,
      self: issue.self
    };
    
    // Flatten fields
    Object.entries(issue.fields).forEach(([key, value]: [string, any]) => {
      if (value && typeof value === 'object') {
        if (value.name) flatIssue[key] = value.name;
        else if (value.displayName) flatIssue[key] = value.displayName;
        else if (value.value) flatIssue[key] = value.value;
        else flatIssue[key] = JSON.stringify(value);
      } else {
        flatIssue[key] = value;
      }
    });
    
    return flatIssue;
  });
  
  // Ensure output directory exists
  const outputDir = path.dirname(validatedArgs.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Export based on format
  let exportResult;
  
  switch (validatedArgs.format) {
    case 'json':
      fs.writeFileSync(validatedArgs.outputPath, JSON.stringify(exportData, null, 2));
      exportResult = { format: 'JSON', records: exportData.length };
      break;
      
    case 'csv':
      if (exportData.length > 0) {
        const headers = Object.keys(exportData[0]);
        const csvContent = [
          headers.join(','),
          ...exportData.map((row: any) => 
            headers.map(header => {
              const value = row[header] || '';
              return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',')
          )
        ].join('\n');
        
        fs.writeFileSync(validatedArgs.outputPath, csvContent);
        exportResult = { format: 'CSV', records: exportData.length, headers: headers.length };
      } else {
        fs.writeFileSync(validatedArgs.outputPath, 'No data to export');
        exportResult = { format: 'CSV', records: 0 };
      }
      break;
      
    case 'xlsx':
      // For XLSX, we'll export as JSON with a note about Excel format
      fs.writeFileSync(validatedArgs.outputPath.replace('.xlsx', '.json'), JSON.stringify(exportData, null, 2));
      exportResult = { format: 'XLSX (exported as JSON)', records: exportData.length, note: 'XLSX format requires additional library' };
      break;
      
    default:
      throw new Error(`Unsupported format: ${validatedArgs.format}`);
  }
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Data exported successfully to ${validatedArgs.outputPath}`,
        export: exportResult,
        query: validatedArgs.jql,
        totalIssues: issues.total,
        exportedRecords: exportData.length,
        generatedAt: new Date().toISOString()
      }, null, 2)
    }]
  };
}
