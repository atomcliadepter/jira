import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const RemoteIssueLinkCreateSchema = z.object({
  issueIdOrKey: z.string().describe('Issue ID or key'),
  object: z.object({
    url: z.string().describe('URL of the remote object'),
    title: z.string().describe('Title of the remote object'),
    summary: z.string().optional().describe('Summary of the remote object'),
    icon: z.object({
      url16x16: z.string().optional(),
      title: z.string().optional()
    }).optional()
  }),
  globalId: z.string().optional().describe('Global ID for the remote link'),
  application: z.object({
    type: z.string().optional(),
    name: z.string().optional()
  }).optional(),
  relationship: z.string().optional().describe('Relationship description')
});

export const createRemoteIssueLinkTool: Tool = {
  name: 'issuelink.remote.create',
  description: 'Create a remote issue link',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: { type: 'string', description: 'Issue ID or key' },
      object: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL of the remote object' },
          title: { type: 'string', description: 'Title of the remote object' },
          summary: { type: 'string', description: 'Summary of the remote object' },
          icon: {
            type: 'object',
            properties: {
              url16x16: { type: 'string' },
              title: { type: 'string' }
            }
          }
        },
        required: ['url', 'title']
      },
      globalId: { type: 'string', description: 'Global ID for the remote link' },
      application: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          name: { type: 'string' }
        }
      },
      relationship: { type: 'string', description: 'Relationship description' }
    },
    required: ['issueIdOrKey', 'object']
  }
};

export async function executeCreateRemoteIssueLink(args: unknown, client: JiraRestClient) {
  const validatedArgs = RemoteIssueLinkCreateSchema.parse(args);
  
  const linkData = {
    object: validatedArgs.object,
    ...(validatedArgs.globalId && { globalId: validatedArgs.globalId }),
    ...(validatedArgs.application && { application: validatedArgs.application }),
    ...(validatedArgs.relationship && { relationship: validatedArgs.relationship })
  };

  const response = await client.post(`/rest/api/3/issue/${validatedArgs.issueIdOrKey}/remotelink`, linkData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Remote issue link created for ${validatedArgs.issueIdOrKey}`,
        response
      }, null, 2)
    }]
  };
}
