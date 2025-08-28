
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConfluenceService } from '../../src/services/ConfluenceService.js';
import { JiraRestClient } from '../../src/http/JiraRestClient.js';
import {
  executeConfluenceCreatePage,
  executeConfluenceUpdatePage,
  executeConfluenceGetPage,
  executeConfluenceCreateSpace,
  executeConfluenceLinkJiraIssue,
  executeConfluenceSearchPages,
  executeConfluenceGetSpaces
} from '../../src/tools/confluenceTools.js';

// Mock dependencies
jest.mock('../../src/services/ConfluenceService.js');
jest.mock('../../src/http/JiraRestClient.js');
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Confluence MCP Tools', () => {
  let mockConfluenceService: jest.Mocked<ConfluenceService>;
  let mockJiraClient: jest.Mocked<JiraRestClient>;

  beforeEach(() => {
    mockConfluenceService = {
      createPage: jest.fn(),
      updatePage: jest.fn(),
      getPage: jest.fn(),
      createSpace: jest.fn(),
      linkJiraIssueToPage: jest.fn(),
      searchPages: jest.fn(),
      getSpaces: jest.fn(),
      getSpacePermissions: jest.fn(),
      deletePage: jest.fn(),
      deleteSpace: jest.fn(),
      getPageChildren: jest.fn(),
      getSpace: jest.fn(),
      addSpacePermission: jest.fn(),
      getCurrentUser: jest.fn(),
      getUser: jest.fn(),
      createDocumentationFromJiraIssue: jest.fn()
    } as any;

    mockJiraClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      request: jest.fn()
    } as any;
  });

  describe('executeConfluenceCreatePage', () => {
    it('should create a page successfully', async () => {
      const args = {
        title: 'Test Page',
        spaceKey: 'TEST',
        content: '<p>Test content</p>'
      };

      const mockPage = {
        id: '123456',
        title: 'Test Page',
        space: { key: 'TEST' },
        _links: {
          webui: '/spaces/TEST/pages/123456',
          edit: '/pages/resumedraft.action?draftId=123456'
        }
      };

      mockConfluenceService.createPage.mockResolvedValue(mockPage as any);

      const result = await executeConfluenceCreatePage(mockConfluenceService, args);

      expect(mockConfluenceService.createPage).toHaveBeenCalledWith({
        type: 'page',
        title: 'Test Page',
        space: { key: 'TEST' },
        body: {
          storage: {
            value: '<p>Test content</p>',
            representation: 'storage'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.page.id).toBe('123456');
      expect(result.page.title).toBe('Test Page');
    });

    it('should create a page with parent successfully', async () => {
      const args = {
        title: 'Child Page',
        spaceKey: 'TEST',
        content: '<p>Child content</p>',
        parentPageId: '789012'
      };

      const mockPage = {
        id: '123456',
        title: 'Child Page',
        space: { key: 'TEST' },
        _links: {
          webui: '/spaces/TEST/pages/123456',
          edit: '/pages/resumedraft.action?draftId=123456'
        }
      };

      mockConfluenceService.createPage.mockResolvedValue(mockPage as any);

      const result = await executeConfluenceCreatePage(mockConfluenceService, args);

      expect(mockConfluenceService.createPage).toHaveBeenCalledWith({
        type: 'page',
        title: 'Child Page',
        space: { key: 'TEST' },
        body: {
          storage: {
            value: '<p>Child content</p>',
            representation: 'storage'
          }
        },
        ancestors: [{ id: '789012' }]
      });

      expect(result.success).toBe(true);
    });
  });

  describe('executeConfluenceUpdatePage', () => {
    it('should update a page successfully', async () => {
      const args = {
        pageId: '123456',
        title: 'Updated Page',
        content: '<p>Updated content</p>',
        versionNumber: 1
      };

      const mockPage = {
        id: '123456',
        title: 'Updated Page',
        version: { number: 2 },
        _links: {
          webui: '/spaces/TEST/pages/123456',
          edit: '/pages/resumedraft.action?draftId=123456'
        }
      };

      mockConfluenceService.updatePage.mockResolvedValue(mockPage as any);

      const result = await executeConfluenceUpdatePage(mockConfluenceService, args);

      expect(mockConfluenceService.updatePage).toHaveBeenCalledWith('123456', {
        version: { number: 2 },
        title: 'Updated Page',
        body: {
          storage: {
            value: '<p>Updated content</p>',
            representation: 'storage'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.page.version).toBe(2);
    });
  });

  describe('executeConfluenceGetPage', () => {
    it('should get a page successfully', async () => {
      const args = {
        pageId: '123456',
        expand: ['body.storage', 'version']
      };

      const mockPage = {
        id: '123456',
        type: 'page',
        status: 'current',
        title: 'Test Page',
        space: {
          id: '789',
          key: 'TEST',
          name: 'Test Space'
        },
        version: { number: 1 },
        body: {
          storage: {
            value: '<p>Test content</p>',
            representation: 'storage'
          }
        },
        _links: {
          webui: '/spaces/TEST/pages/123456',
          edit: '/pages/resumedraft.action?draftId=123456'
        }
      };

      mockConfluenceService.getPage.mockResolvedValue(mockPage as any);

      const result = await executeConfluenceGetPage(mockConfluenceService, args);

      expect(mockConfluenceService.getPage).toHaveBeenCalledWith('123456', ['body.storage', 'version']);
      expect(result.success).toBe(true);
      expect(result.page.id).toBe('123456');
      expect(result.page.title).toBe('Test Page');
    });
  });

  describe('executeConfluenceCreateSpace', () => {
    it('should create a space successfully', async () => {
      const args = {
        key: 'NEWSPACE',
        name: 'New Test Space',
        description: 'A test space'
      };

      const mockSpace = {
        id: '789',
        key: 'NEWSPACE',
        name: 'New Test Space',
        type: 'global',
        _links: {
          webui: '/spaces/NEWSPACE'
        }
      };

      mockConfluenceService.createSpace.mockResolvedValue(mockSpace as any);

      const result = await executeConfluenceCreateSpace(mockConfluenceService, args);

      expect(mockConfluenceService.createSpace).toHaveBeenCalledWith({
        key: 'NEWSPACE',
        name: 'New Test Space',
        description: {
          plain: {
            value: 'A test space',
            representation: 'plain'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.space.key).toBe('NEWSPACE');
    });
  });

  describe('executeConfluenceLinkJiraIssue', () => {
    it('should link a Jira issue successfully', async () => {
      const args = {
        pageId: '123456',
        issueKey: 'TEST-123',
        serverId: 'System JIRA'
      };

      mockConfluenceService.linkJiraIssueToPage.mockResolvedValue(undefined);

      const result = await executeConfluenceLinkJiraIssue(mockConfluenceService, args);

      expect(mockConfluenceService.linkJiraIssueToPage).toHaveBeenCalledWith(
        '123456',
        'TEST-123',
        'System JIRA'
      );

      expect(result.success).toBe(true);
      expect(result.link.pageId).toBe('123456');
      expect(result.link.issueKey).toBe('TEST-123');
    });
  });

  describe('executeConfluenceSearchPages', () => {
    it('should search pages successfully', async () => {
      const args = {
        cql: 'type=page AND space=TEST',
        limit: 10,
        start: 0
      };

      const mockPages = [
        {
          id: '123456',
          type: 'page',
          status: 'current',
          title: 'Test Page 1',
          space: {
            id: '789',
            key: 'TEST',
            name: 'Test Space'
          },
          _links: {
            webui: '/spaces/TEST/pages/123456'
          }
        }
      ];

      mockConfluenceService.searchPages.mockResolvedValue(mockPages as any);

      const result = await executeConfluenceSearchPages(mockConfluenceService, args);

      expect(mockConfluenceService.searchPages).toHaveBeenCalledWith(
        'type=page AND space=TEST',
        10,
        0
      );

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe('Test Page 1');
    });
  });

  describe('executeConfluenceGetSpaces', () => {
    it('should get spaces successfully', async () => {
      const args = {
        limit: 25,
        start: 0,
        type: 'global' as const
      };

      const mockSpaces = [
        {
          id: '789',
          key: 'TEST',
          name: 'Test Space',
          type: 'global' as const,
          status: 'current',
          description: {
            plain: {
              value: 'A test space',
              representation: 'plain'
            }
          },
          _links: {
            webui: '/spaces/TEST'
          }
        }
      ];

      mockConfluenceService.getSpaces.mockResolvedValue(mockSpaces as any);

      const result = await executeConfluenceGetSpaces(mockConfluenceService, args);

      expect(mockConfluenceService.getSpaces).toHaveBeenCalledWith(25, 0, 'global');
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].key).toBe('TEST');
    });
  });
});
