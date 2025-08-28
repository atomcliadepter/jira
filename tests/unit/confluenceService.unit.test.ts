
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ConfluenceService } from '../src/services/ConfluenceService.js';
import { ConfluenceRestClient } from '../src/http/ConfluenceRestClient.js';
import { CreatePageRequest, UpdatePageRequest, CreateSpaceRequest } from '../src/types/confluence.js';

// Mock the ConfluenceRestClient
jest.mock('../../src/http/ConfluenceRestClient.js');
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('ConfluenceService', () => {
  let confluenceService: ConfluenceService;
  let mockClient: jest.Mocked<ConfluenceRestClient>;

  beforeEach(() => {
    mockClient = new ConfluenceRestClient({
      baseUrl: 'https://test.atlassian.net',
      email: 'test@example.com',
      apiToken: 'test-token'
    }) as jest.Mocked<ConfluenceRestClient>;

    confluenceService = new ConfluenceService(mockClient);
  });

  describe('createPage', () => {
    it('should create a page successfully', async () => {
      const request: CreatePageRequest = {
        type: 'page',
        title: 'Test Page',
        space: { key: 'TEST' },
        body: {
          storage: {
            value: '<p>Test content</p>',
            representation: 'storage'
          }
        }
      };

      const mockResponse = {
        id: '123456',
        type: 'page',
        status: 'current',
        title: 'Test Page',
        space: {
          id: '789',
          key: 'TEST',
          name: 'Test Space',
          type: 'global',
          status: 'current',
          _links: {
            webui: '/spaces/TEST',
            self: '/rest/api/space/TEST'
          }
        },
        version: {
          number: 1,
          minorEdit: false
        },
        _links: {
          webui: '/spaces/TEST/pages/123456',
          edit: '/pages/resumedraft.action?draftId=123456',
          tinyui: '/x/123456',
          self: '/rest/api/content/123456'
        }
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await confluenceService.createPage(request);

      expect(mockClient.post).toHaveBeenCalledWith('/wiki/rest/api/content', request);
      expect(result.id).toBe('123456');
      expect(result.title).toBe('Test Page');
      expect(result.space?.key).toBe('TEST');
    });

    it('should handle page creation errors', async () => {
      const request: CreatePageRequest = {
        type: 'page',
        title: 'Test Page',
        space: { key: 'TEST' },
        body: {
          storage: {
            value: '<p>Test content</p>',
            representation: 'storage'
          }
        }
      };

      mockClient.post.mockRejectedValue(new Error('Space not found'));

      await expect(confluenceService.createPage(request)).rejects.toThrow('Space not found');
    });
  });

  describe('getPage', () => {
    it('should retrieve a page successfully', async () => {
      const pageId = '123456';
      const expand = ['body.storage', 'version'];

      const mockResponse = {
        id: '123456',
        type: 'page',
        status: 'current',
        title: 'Test Page',
        version: {
          number: 1,
          minorEdit: false
        },
        body: {
          storage: {
            value: '<p>Test content</p>',
            representation: 'storage'
          }
        },
        _links: {
          webui: '/spaces/TEST/pages/123456',
          edit: '/pages/resumedraft.action?draftId=123456',
          tinyui: '/x/123456',
          self: '/rest/api/content/123456'
        }
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await confluenceService.getPage(pageId, expand);

      expect(mockClient.get).toHaveBeenCalledWith(`/wiki/rest/api/content/${pageId}`, {
        params: { expand: 'body.storage,version' }
      });
      expect(result.id).toBe('123456');
      expect(result.title).toBe('Test Page');
    });
  });

  describe('updatePage', () => {
    it('should update a page successfully', async () => {
      const pageId = '123456';
      const request: UpdatePageRequest = {
        version: { number: 2 },
        title: 'Updated Test Page',
        body: {
          storage: {
            value: '<p>Updated content</p>',
            representation: 'storage'
          }
        }
      };

      const mockResponse = {
        id: '123456',
        type: 'page',
        status: 'current',
        title: 'Updated Test Page',
        version: {
          number: 2,
          minorEdit: false
        },
        _links: {
          webui: '/spaces/TEST/pages/123456',
          edit: '/pages/resumedraft.action?draftId=123456',
          tinyui: '/x/123456',
          self: '/rest/api/content/123456'
        }
      };

      mockClient.put.mockResolvedValue(mockResponse);

      const result = await confluenceService.updatePage(pageId, request);

      expect(mockClient.put).toHaveBeenCalledWith(`/wiki/rest/api/content/${pageId}`, request);
      expect(result.title).toBe('Updated Test Page');
      expect(result.version.number).toBe(2);
    });
  });

  describe('createSpace', () => {
    it('should create a space successfully', async () => {
      const request: CreateSpaceRequest = {
        key: 'NEWSPACE',
        name: 'New Test Space',
        description: {
          plain: {
            value: 'A test space',
            representation: 'plain'
          }
        }
      };

      const mockResponse = {
        id: '789',
        key: 'NEWSPACE',
        name: 'New Test Space',
        type: 'global',
        status: 'current',
        description: {
          plain: {
            value: 'A test space',
            representation: 'plain'
          }
        },
        _links: {
          webui: '/spaces/NEWSPACE',
          self: '/rest/api/space/NEWSPACE'
        }
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await confluenceService.createSpace(request);

      expect(mockClient.post).toHaveBeenCalledWith('/wiki/rest/api/space', request);
      expect(result.key).toBe('NEWSPACE');
      expect(result.name).toBe('New Test Space');
    });
  });

  describe('linkJiraIssueToPage', () => {
    it('should link a Jira issue to a page successfully', async () => {
      const pageId = '123456';
      const issueKey = 'TEST-123';

      // Mock getting the current page
      const mockPage = {
        id: '123456',
        type: 'page',
        status: 'current',
        title: 'Test Page',
        version: {
          number: 1,
          minorEdit: false
        },
        body: {
          storage: {
            value: '<p>Existing content</p>',
            representation: 'storage'
          }
        },
        _links: {
          webui: '/spaces/TEST/pages/123456',
          edit: '/pages/resumedraft.action?draftId=123456',
          tinyui: '/x/123456',
          self: '/rest/api/content/123456'
        }
      };

      // Mock updating the page
      const mockUpdatedPage = {
        ...mockPage,
        version: { number: 2, minorEdit: false }
      };

      mockClient.get.mockResolvedValue(mockPage);
      mockClient.put.mockResolvedValue(mockUpdatedPage);

      await confluenceService.linkJiraIssueToPage(pageId, issueKey);

      expect(mockClient.get).toHaveBeenCalledWith(`/wiki/rest/api/content/${pageId}`, {
        params: { expand: 'body.storage,version' }
      });
      expect(mockClient.put).toHaveBeenCalledWith(
        `/wiki/rest/api/content/${pageId}`,
        expect.objectContaining({
          version: { number: 2 },
          body: {
            storage: {
              value: expect.stringContaining('TEST-123'),
              representation: 'storage'
            }
          }
        })
      );
    });
  });

  describe('searchPages', () => {
    it('should search pages successfully', async () => {
      const cql = 'type=page AND space=TEST';
      const limit = 10;
      const start = 0;

      const mockResponse = {
        results: [
          {
            id: '123456',
            type: 'page',
            status: 'current',
            title: 'Test Page 1',
            _links: {
              webui: '/spaces/TEST/pages/123456',
              edit: '/pages/resumedraft.action?draftId=123456',
              tinyui: '/x/123456',
              self: '/rest/api/content/123456'
            }
          },
          {
            id: '789012',
            type: 'page',
            status: 'current',
            title: 'Test Page 2',
            _links: {
              webui: '/spaces/TEST/pages/789012',
              edit: '/pages/resumedraft.action?draftId=789012',
              tinyui: '/x/789012',
              self: '/rest/api/content/789012'
            }
          }
        ]
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await confluenceService.searchPages(cql, limit, start);

      expect(mockClient.get).toHaveBeenCalledWith('/wiki/rest/api/content/search', {
        params: { cql, limit, start }
      });
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Test Page 1');
      expect(result[1].title).toBe('Test Page 2');
    });
  });

  describe('getSpaces', () => {
    it('should retrieve spaces successfully', async () => {
      const limit = 25;
      const start = 0;
      const type = 'global';

      const mockResponse = {
        results: [
          {
            id: '789',
            key: 'TEST',
            name: 'Test Space',
            type: 'global',
            status: 'current',
            _links: {
              webui: '/spaces/TEST',
              self: '/rest/api/space/TEST'
            }
          }
        ]
      };

      mockClient.get.mockResolvedValue(mockResponse);

      const result = await confluenceService.getSpaces(limit, start, type);

      expect(mockClient.get).toHaveBeenCalledWith('/wiki/rest/api/space', {
        params: { limit, start, type }
      });
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('TEST');
      expect(result[0].name).toBe('Test Space');
    });
  });
});
