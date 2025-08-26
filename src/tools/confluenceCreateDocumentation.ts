
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConfluenceService } from '../services/ConfluenceService.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { logger } from '../utils/logger.js';

export const confluenceCreateDocumentationTool: Tool = {
  name: 'confluence.documentation.create',
  description: 'Create documentation page from Jira issue',
  inputSchema: {
    type: 'object',
    properties: {
      issueKey: {
        type: 'string',
        description: 'Jira issue key (e.g., PROJ-123)'
      },
      spaceKey: {
        type: 'string',
        description: 'Confluence space key where documentation will be created'
      },
      parentPageId: {
        type: 'string',
        description: 'Optional parent page ID to create as child page'
      },
      includeComments: {
        type: 'boolean',
        description: 'Include issue comments in documentation',
        default: false
      },
      includeAttachments: {
        type: 'boolean',
        description: 'Include issue attachments in documentation',
        default: false
      }
    },
    required: ['issueKey', 'spaceKey']
  }
};

export async function executeConfluenceCreateDocumentation(
  confluenceService: ConfluenceService,
  jiraClient: JiraRestClient,
  args: unknown
): Promise<any> {
  try {
    logger.info('Executing confluence.documentation.create', { args });
    
    const { issueKey, spaceKey, parentPageId, includeComments, includeAttachments } = args as {
      issueKey: string;
      spaceKey: string;
      parentPageId?: string;
      includeComments?: boolean;
      includeAttachments?: boolean;
    };

    // Fetch issue data from Jira
    const issueData = await jiraClient.get(`/rest/api/3/issue/${issueKey}`, {
      params: {
        expand: 'names,schema,operations,editmeta,changelog,renderedFields'
      }
    });

    // Fetch comments if requested
    let comments = [];
    if (includeComments) {
      const commentsResponse = await jiraClient.get(`/rest/api/3/issue/${issueKey}/comment`);
      comments = commentsResponse.comments || [];
    }

    // Fetch attachments if requested
    let attachments = [];
    if (includeAttachments) {
      attachments = issueData.fields.attachment || [];
    }

    // Create enhanced documentation
    const page = await confluenceService.createDocumentationFromJiraIssue(
      issueKey,
      { ...issueData, comments, attachments },
      spaceKey,
      parentPageId
    );
    
    logger.info('Successfully created documentation from Jira issue', { 
      issueKey,
      pageId: page.id, 
      title: page.title 
    });

    return {
      success: true,
      documentation: {
        issueKey,
        pageId: page.id,
        title: page.title,
        spaceKey: page.space?.key,
        webUrl: page._links.webui,
        editUrl: page._links.edit
      }
    };
  } catch (error) {
    logger.error('Failed to create documentation from Jira issue:', error);
    throw error;
  }
}
