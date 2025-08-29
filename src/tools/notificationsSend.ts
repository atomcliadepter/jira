import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const NotificationsSendSchema = z.object({
  issueIdOrKey: z.string().describe('Issue ID or key'),
  subject: z.string().describe('Email subject'),
  textBody: z.string().optional().describe('Plain text body'),
  htmlBody: z.string().optional().describe('HTML body'),
  to: z.object({
    reporter: z.boolean().optional(),
    assignee: z.boolean().optional(),
    watchers: z.boolean().optional(),
    voters: z.boolean().optional(),
    users: z.array(z.object({
      accountId: z.string()
    })).optional(),
    groups: z.array(z.object({
      name: z.string()
    })).optional()
  }).describe('Notification recipients')
});

export const sendNotificationTool: Tool = {
  name: 'notifications.send',
  description: 'Send custom notification for an issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueIdOrKey: { type: 'string', description: 'Issue ID or key' },
      subject: { type: 'string', description: 'Email subject' },
      textBody: { type: 'string', description: 'Plain text body' },
      htmlBody: { type: 'string', description: 'HTML body' },
      to: {
        type: 'object',
        properties: {
          reporter: { type: 'boolean' },
          assignee: { type: 'boolean' },
          watchers: { type: 'boolean' },
          voters: { type: 'boolean' },
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                accountId: { type: 'string' }
              },
              required: ['accountId']
            }
          },
          groups: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            }
          }
        },
        description: 'Notification recipients'
      }
    },
    required: ['issueIdOrKey', 'subject', 'to']
  }
};

export async function executeSendNotification(args: unknown, client: JiraRestClient) {
  const validatedArgs = NotificationsSendSchema.parse(args);
  
  const notificationData = {
    subject: validatedArgs.subject,
    ...(validatedArgs.textBody && { textBody: validatedArgs.textBody }),
    ...(validatedArgs.htmlBody && { htmlBody: validatedArgs.htmlBody }),
    to: validatedArgs.to
  };

  await client.post(`/rest/api/3/issue/${validatedArgs.issueIdOrKey}/notify`, notificationData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Notification sent for issue ${validatedArgs.issueIdOrKey}`
      }, null, 2)
    }]
  };
}
