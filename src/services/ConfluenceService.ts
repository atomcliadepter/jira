
import { ConfluenceRestClient } from '../http/ConfluenceRestClient.js';
import { logger } from '../utils/logger.js';
import {
  ConfluencePage,
  ConfluenceSpace,
  ConfluenceUser,
  CreatePageRequest,
  UpdatePageRequest,
  CreateSpaceRequest,
  SpacePermission,
  JiraIssueLink,
  ConfluencePageSchema,
  ConfluenceSpaceSchema,
  ConfluenceUserSchema,
  SpacePermissionSchema
} from '../types/confluence.js';

export class ConfluenceService {
  constructor(private client: ConfluenceRestClient) {}

  // Page operations
  async createPage(request: CreatePageRequest): Promise<ConfluencePage> {
    logger.info('Creating Confluence page', { title: request.title, spaceKey: request.space.key });
    
    const response = await this.client.post('/wiki/rest/api/content', request);
    return ConfluencePageSchema.parse(response);
  }

  async getPage(pageId: string, expand?: string[]): Promise<ConfluencePage> {
    logger.info('Fetching Confluence page', { pageId });
    
    const params = expand ? { expand: expand.join(',') } : {};
    const response = await this.client.get(`/wiki/rest/api/content/${pageId}`, { params });
    return ConfluencePageSchema.parse(response);
  }

  async updatePage(pageId: string, request: UpdatePageRequest): Promise<ConfluencePage> {
    logger.info('Updating Confluence page', { pageId, title: request.title });
    
    const response = await this.client.put(`/wiki/rest/api/content/${pageId}`, request);
    return ConfluencePageSchema.parse(response);
  }

  async deletePage(pageId: string): Promise<void> {
    logger.info('Deleting Confluence page', { pageId });
    
    await this.client.delete(`/wiki/rest/api/content/${pageId}`);
  }

  async getPageChildren(pageId: string, limit = 25, start = 0): Promise<ConfluencePage[]> {
    logger.info('Fetching page children', { pageId, limit, start });
    
    const response = await this.client.get(`/wiki/rest/api/content/${pageId}/child/page`, {
      params: { limit, start }
    });
    
    return response.results.map((page: any) => ConfluencePageSchema.parse(page));
  }

  async searchPages(cql: string, limit = 25, start = 0): Promise<ConfluencePage[]> {
    logger.info('Searching pages', { cql, limit, start });
    
    const response = await this.client.get('/wiki/rest/api/content/search', {
      params: { cql, limit, start }
    });
    
    return response.results.map((page: any) => ConfluencePageSchema.parse(page));
  }

  // Space operations
  async createSpace(request: CreateSpaceRequest): Promise<ConfluenceSpace> {
    logger.info('Creating Confluence space', { key: request.key, name: request.name });
    
    const response = await this.client.post('/wiki/rest/api/space', request);
    return ConfluenceSpaceSchema.parse(response);
  }

  async getSpace(spaceKey: string, expand?: string[]): Promise<ConfluenceSpace> {
    logger.info('Fetching Confluence space', { spaceKey });
    
    const params = expand ? { expand: expand.join(',') } : {};
    const response = await this.client.get(`/wiki/rest/api/space/${spaceKey}`, { params });
    return ConfluenceSpaceSchema.parse(response);
  }

  async getSpaces(limit = 25, start = 0, type?: 'global' | 'personal'): Promise<ConfluenceSpace[]> {
    logger.info('Fetching Confluence spaces', { limit, start, type });
    
    const params: any = { limit, start };
    if (type) params.type = type;
    
    const response = await this.client.get('/wiki/rest/api/space', { params });
    return response.results.map((space: any) => ConfluenceSpaceSchema.parse(space));
  }

  async deleteSpace(spaceKey: string): Promise<void> {
    logger.info('Deleting Confluence space', { spaceKey });
    
    await this.client.delete(`/wiki/rest/api/space/${spaceKey}`);
  }

  // Permission operations
  async getSpacePermissions(spaceId: string, limit = 25, cursor?: string): Promise<SpacePermission[]> {
    logger.info('Fetching space permissions', { spaceId });
    
    const params: any = { limit };
    if (cursor) params.cursor = cursor;
    
    const response = await this.client.get(`/wiki/api/v2/spaces/${spaceId}/permissions`, { params });
    return response.results.map((permission: any) => SpacePermissionSchema.parse(permission));
  }

  async addSpacePermission(spaceKey: string, accountId: string, operation: string): Promise<void> {
    logger.info('Adding space permission', { spaceKey, accountId, operation });
    
    // Note: This would typically be done during space creation or via space settings
    // The v2 API doesn't have a direct endpoint for adding permissions
    logger.warn('Space permission addition requires space update or creation');
  }

  // User operations
  async getCurrentUser(): Promise<ConfluenceUser> {
    logger.info('Fetching current user');
    
    const response = await this.client.get('/wiki/rest/api/user/current');
    return ConfluenceUserSchema.parse(response);
  }

  async getUser(accountId: string): Promise<ConfluenceUser> {
    logger.info('Fetching user', { accountId });
    
    const response = await this.client.get('/wiki/rest/api/user', {
      params: { accountId }
    });
    return ConfluenceUserSchema.parse(response);
  }

  // Jira-Confluence linking operations
  async linkJiraIssueToPage(pageId: string, issueKey: string, serverId?: string): Promise<void> {
    logger.info('Linking Jira issue to Confluence page', { pageId, issueKey });
    
    // Get current page content
    const page = await this.getPage(pageId, ['body.storage', 'version']);
    
    // Create Jira issue macro
    const jiraMacro = this.createJiraIssueMacro(issueKey, serverId);
    
    // Append macro to page content
    const currentContent = page.body?.storage?.value || '';
    const updatedContent = `${currentContent}\n${jiraMacro}`;
    
    // Update page
    await this.updatePage(pageId, {
      version: {
        number: page.version.number + 1
      },
      body: {
        storage: {
          value: updatedContent,
          representation: 'storage'
        }
      }
    });
  }

  async createDocumentationFromJiraIssue(
    issueKey: string,
    issueData: any,
    spaceKey: string,
    parentPageId?: string
  ): Promise<ConfluencePage> {
    logger.info('Creating documentation from Jira issue', { issueKey, spaceKey });
    
    const title = `${issueKey}: ${issueData.fields.summary}`;
    const content = this.generateDocumentationContent(issueData);
    
    const request: CreatePageRequest = {
      type: 'page',
      title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: content,
          representation: 'storage'
        }
      }
    };
    
    if (parentPageId) {
      request.ancestors = [{ id: parentPageId }];
    }
    
    return this.createPage(request);
  }

  private createJiraIssueMacro(issueKey: string, serverId = 'System JIRA'): string {
    return `<ac:structured-macro ac:name="jira" ac:schema-version="1" ac:macro-id="${this.generateMacroId()}">
      <ac:parameter ac:name="server">${serverId}</ac:parameter>
      <ac:parameter ac:name="serverId">${serverId}</ac:parameter>
      <ac:parameter ac:name="key">${issueKey}</ac:parameter>
    </ac:structured-macro>`;
  }

  private generateDocumentationContent(issueData: any): string {
    const { fields } = issueData;
    
    return `<h1>Issue Overview</h1>
    <p><strong>Type:</strong> ${fields.issuetype?.name || 'Unknown'}</p>
    <p><strong>Status:</strong> ${fields.status?.name || 'Unknown'}</p>
    <p><strong>Priority:</strong> ${fields.priority?.name || 'Unknown'}</p>
    <p><strong>Assignee:</strong> ${fields.assignee?.displayName || 'Unassigned'}</p>
    <p><strong>Reporter:</strong> ${fields.reporter?.displayName || 'Unknown'}</p>
    
    <h2>Description</h2>
    <p>${fields.description || 'No description provided'}</p>
    
    <h2>Acceptance Criteria</h2>
    <p><em>To be defined based on issue requirements</em></p>
    
    <h2>Technical Notes</h2>
    <p><em>Add technical implementation details here</em></p>
    
    <h2>Related Issues</h2>
    ${this.createJiraIssueMacro(issueData.key)}`;
  }

  private generateMacroId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
