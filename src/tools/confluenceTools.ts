
/**
 * Confluence MCP Tools Registry
 * Exports all Confluence-related MCP tools for registration
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConfluenceService } from '../services/ConfluenceService.js';
import { JiraRestClient } from '../http/JiraRestClient.js';

// Import all tool definitions
import { confluenceCreatePageTool, executeConfluenceCreatePage } from './confluenceCreatePage.js';
import { confluenceUpdatePageTool, executeConfluenceUpdatePage } from './confluenceUpdatePage.js';
import { confluenceGetPageTool, executeConfluenceGetPage } from './confluenceGetPage.js';
import { confluenceCreateSpaceTool, executeConfluenceCreateSpace } from './confluenceCreateSpace.js';
import { confluenceLinkJiraIssueTool, executeConfluenceLinkJiraIssue } from './confluenceLinkJiraIssue.js';
import { confluenceCreateDocumentationTool, executeConfluenceCreateDocumentation } from './confluenceCreateDocumentation.js';
import { confluenceSearchPagesTool, executeConfluenceSearchPages } from './confluenceSearchPages.js';
import { confluenceGetSpacesTool, executeConfluenceGetSpaces } from './confluenceGetSpaces.js';
import { confluenceGetSpacePermissionsTool, executeConfluenceGetSpacePermissions } from './confluenceGetSpacePermissions.js';

// Export all tool definitions
export const confluenceTools: Tool[] = [
  confluenceCreatePageTool,
  confluenceUpdatePageTool,
  confluenceGetPageTool,
  confluenceCreateSpaceTool,
  confluenceLinkJiraIssueTool,
  confluenceCreateDocumentationTool,
  confluenceSearchPagesTool,
  confluenceGetSpacesTool,
  confluenceGetSpacePermissionsTool
];

// Tool execution mapping
export const confluenceToolExecutors = {
  'confluence.page.create': executeConfluenceCreatePage,
  'confluence.page.update': executeConfluenceUpdatePage,
  'confluence.page.get': executeConfluenceGetPage,
  'confluence.space.create': executeConfluenceCreateSpace,
  'confluence.jira.link': executeConfluenceLinkJiraIssue,
  'confluence.documentation.create': executeConfluenceCreateDocumentation,
  'confluence.pages.search': executeConfluenceSearchPages,
  'confluence.spaces.get': executeConfluenceGetSpaces,
  'confluence.space.permissions.get': executeConfluenceGetSpacePermissions
};

// Tool execution handler
export async function executeConfluenceTool(
  toolName: string,
  args: unknown,
  confluenceService: ConfluenceService,
  jiraClient?: JiraRestClient
): Promise<any> {
  const executor = confluenceToolExecutors[toolName as keyof typeof confluenceToolExecutors];
  
  if (!executor) {
    throw new Error(`Unknown Confluence tool: ${toolName}`);
  }

  // Handle tools that need both services
  if (toolName === 'confluence.documentation.create') {
    if (!jiraClient) {
      throw new Error('Jira client is required for documentation creation');
    }
    return await (executor as any)(confluenceService, jiraClient, args);
  }

  // Handle regular Confluence tools
  return await (executor as any)(confluenceService, args);
}
