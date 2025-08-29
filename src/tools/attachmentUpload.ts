import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';
import { readFileSync } from 'fs';
import FormData from 'form-data';

const AttachmentUploadSchema = z.object({
  issueIdOrKey: z.string().describe('Issue ID or key to attach file to'),
  filePath: z.string().describe('Local file path to upload'),
  filename: z.string().optional().describe('Custom filename (optional)')
});

export const uploadAttachmentTool: Tool = {
  name: 'attachment.upload',
  description: 'Upload an attachment to an issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: { type: 'string', description: 'Issue ID or key to attach file to' },
      filePath: { type: 'string', description: 'Local file path to upload' },
      filename: { type: 'string', description: 'Custom filename (optional)' }
    },
    required: ['issueIdOrKey', 'filePath']
  }
};

export async function executeUploadAttachment(args: unknown, client: JiraRestClient) {
  const validatedArgs = AttachmentUploadSchema.parse(args);
  
  try {
    const fileBuffer = readFileSync(validatedArgs.filePath);
    const form = new FormData();
    
    const filename = validatedArgs.filename || validatedArgs.filePath.split('/').pop() || 'attachment';
    form.append('file', fileBuffer, filename);
    
    const response = await client.post(`/rest/api/3/issue/${validatedArgs.issueIdOrKey}/attachments`, form, {
      headers: {
        ...form.getHeaders(),
        'X-Atlassian-Token': 'no-check'
      }
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `File uploaded successfully to ${validatedArgs.issueIdOrKey}`,
          attachments: response
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
          message: `Failed to upload attachment to ${validatedArgs.issueIdOrKey}`
        }, null, 2)
      }]
    };
  }
}
