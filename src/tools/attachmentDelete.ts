import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const AttachmentDeleteSchema = z.object({
  attachmentId: z.string().describe('ID of the attachment to delete')
});

export const deleteAttachmentTool: Tool = {
  name: 'attachment.delete',
  description: 'Delete an attachment',
  inputSchema: {
    type: 'object',
    properties: {
      attachmentId: { type: 'string', description: 'ID of the attachment to delete' }
    },
    required: ['attachmentId']
  }
};

export async function executeDeleteAttachment(args: unknown, client: JiraRestClient) {
  const validatedArgs = AttachmentDeleteSchema.parse(args);
  
  await client.delete(`/rest/api/3/attachment/${validatedArgs.attachmentId}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Attachment ${validatedArgs.attachmentId} deleted successfully`
      }, null, 2)
    }]
  };
}
