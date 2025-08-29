import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { z } from 'zod';

const ConfluenceJiraLinkSchema = z.object({
  issueKey: z.string().describe('Jira issue key'),
  pageId: z.string().describe('Confluence page ID'),
  linkType: z.string().optional().default('mentions').describe('Link type (mentions, relates, etc.)')
});

export const linkJiraConfluenceTool: Tool = {
  name: 'confluence.jira.link',
  description: 'Link Jira issues to Confluence pages',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: { type: 'string', description: 'Jira issue key' },
      pageId: { type: 'string', description: 'Confluence page ID' },
      linkType: { type: 'string', default: 'mentions', description: 'Link type (mentions, relates, etc.)' }
    },
    required: ['issueKey', 'pageId']
  }
};

export async function executeLinkJiraConfluence(args: unknown, client: JiraRestClient) {
  const validatedArgs = ConfluenceJiraLinkSchema.parse(args);
  
  // Create remote issue link from Jira to Confluence
  const linkData = {
    object: {
      url: `${client.config.baseUrl.replace('/jira/', '/wiki/')}/pages/viewpage.action?pageId=${validatedArgs.pageId}`,
      title: `Confluence Page ${validatedArgs.pageId}`,
      icon: {
        url16x16: `${client.config.baseUrl}/images/icons/confluence_16.png`,
        title: 'Confluence'
      }
    }
  };

  const response = await client.post(`${client.config.baseUrl}/rest/api/3/issue/${validatedArgs.issueKey}/remotelink`, linkData);
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: `Linked Jira issue ${validatedArgs.issueKey} to Confluence page ${validatedArgs.pageId}`,
        link: response
      }, null, 2)
    }]
  };
}
