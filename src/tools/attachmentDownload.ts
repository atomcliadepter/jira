import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';
import { writeFileSync } from 'fs';

const AttachmentDownloadSchema = z.object({
  attachmentId: z.string().describe('ID of the attachment to download'),
  outputPath: z.string().describe('Local path to save the downloaded file')
});

export const downloadAttachmentTool: Tool = {
  name: 'attachment.download',
  description: 'Download attachment content to local file',
  inputSchema: {
    type: 'object',
    properties: {
      attachmentId: { type: 'string', description: 'ID of the attachment to download' },
      outputPath: { type: 'string', description: 'Local path to save the downloaded file' }
    },
    required: ['attachmentId', 'outputPath']
  }
};

export async function executeDownloadAttachment(args: unknown, client: JiraRestClient) {
  const validatedArgs = AttachmentDownloadSchema.parse(args);
  
  try {
    const response = await client.request({
      method: 'GET',
      url: `/rest/api/3/attachment/content/${validatedArgs.attachmentId}`,
      responseType: 'arraybuffer'
    });
    
    writeFileSync(validatedArgs.outputPath, Buffer.from(response.data));
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Attachment downloaded successfully to ${validatedArgs.outputPath}`,
          size: response.data.byteLength
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
          message: `Failed to download attachment ${validatedArgs.attachmentId}`
        }, null, 2)
      }]
    };
  }
}
