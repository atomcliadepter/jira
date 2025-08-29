import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const IssueLinkCreateSchema = z.object({
  type: z.object({
    name: z.string().describe('Link type name (e.g., "Blocks", "Relates")')
  }),
  inwardIssue: z.object({
    key: z.string().describe('Key of the inward issue (e.g., "PROJ-123")')
  }),
  outwardIssue: z.object({
    key: z.string().describe('Key of the outward issue (e.g., "PROJ-456")')
  }),
  comment: z.object({
    body: z.string().optional().describe('Optional comment for the link')
  }).optional()
});

export const createIssueLinkTool: Tool = {
  name: 'issuelink.create',
  description: 'Create a link between two issues',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Link type name (e.g., "Blocks", "Relates")' }
        },
        required: ['name']
      },
      inwardIssue: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Key of the inward issue (e.g., "PROJ-123")' }
        },
        required: ['key']
      },
      outwardIssue: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Key of the outward issue (e.g., "PROJ-456")' }
        },
        required: ['key']
      },
      comment: {
        type: 'object',
        properties: {
          body: { type: 'string', description: 'Optional comment for the link' }
        },
        optional: true
      }
    },
    required: ['type', 'inwardIssue', 'outwardIssue']
  }
};

export async function executeCreateIssueLink(args: unknown, client: JiraRestClient) {
  const validatedArgs = IssueLinkCreateSchema.parse(args);
  
  const linkData = {
    type: validatedArgs.type,
    inwardIssue: validatedArgs.inwardIssue,
    outwardIssue: validatedArgs.outwardIssue,
    ...(validatedArgs.comment && { comment: validatedArgs.comment })
  };

  const response = await client.post('/rest/api/3/issueLink', linkData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Issue link created between ${validatedArgs.inwardIssue.key} and ${validatedArgs.outwardIssue.key}`,
        linkType: validatedArgs.type.name,
        response
      }, null, 2)
    }]
  };
}
