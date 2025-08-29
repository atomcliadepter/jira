import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const AttachmentGetSchema = z.object({
  attachmentId: z.string().describe('ID of the attachment to retrieve')
});

export const getAttachmentTool: Tool = {
  name: 'attachment.get',
  description: 'Get attachment metadata',
  inputSchema: {
    type: 'object',
    properties: {
      attachmentId: { type: 'string', description: 'ID of the attachment to retrieve' }
    },
    required: ['attachmentId']
  }
};

export async function executeGetAttachment(args: unknown, client: JiraRestClient) {
  const validatedArgs = AttachmentGetSchema.parse(args);
  
  const response = await client.get(`/rest/api/3/attachment/${validatedArgs.attachmentId}`);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(response, null, 2)
    }]
  };
}
