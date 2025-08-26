
import { executeSearchIssues } from './searchIssues';
import { JiraRestClient } from '../http/JiraRestClient';

// Mock the JiraRestClient
jest.mock('../http/JiraRestClient');

describe('searchIssues tool', () => {
  let mockClient: jest.Mocked<JiraRestClient>;

  beforeEach(() => {
    mockClient = {
      searchIssues: jest.fn(),
    } as any;
  });

  it('should search issues successfully', async () => {
    const mockResponse = {
      total: 2,
      startAt: 0,
      maxResults: 50,
      issues: [
        {
          id: '10001',
          key: 'PROJ-123',
          fields: {
            summary: 'Test issue 1',
            status: { name: 'Open' },
            issuetype: { name: 'Task' },
            project: { name: 'Test Project' },
            assignee: { displayName: 'John Doe' },
            reporter: { displayName: 'Jane Smith' },
            priority: { name: 'High' },
            created: '2025-01-01T00:00:00.000Z',
            updated: '2025-01-01T00:00:00.000Z',
            labels: ['urgent'],
          },
        },
        {
          id: '10002',
          key: 'PROJ-124',
          fields: {
            summary: 'Test issue 2',
            status: { name: 'In Progress' },
            issuetype: { name: 'Bug' },
            project: { name: 'Test Project' },
            assignee: null,
            reporter: { displayName: 'Jane Smith' },
            priority: { name: 'Medium' },
            created: '2025-01-02T00:00:00.000Z',
            updated: '2025-01-02T00:00:00.000Z',
            labels: [],
          },
        },
      ],
    };

    mockClient.searchIssues.mockResolvedValue(mockResponse);

    const args = {
      jql: 'project = PROJ AND status = Open',
      maxResults: 25,
      fields: ['summary', 'status', 'assignee'],
    };

    const result = await executeSearchIssues(mockClient, args);

    expect(mockClient.searchIssues).toHaveBeenCalledWith(
      'project = PROJ AND status = Open',
      {
        startAt: 0,
        maxResults: 25,
        fields: ['summary', 'status', 'assignee'],
        expand: undefined,
      }
    );

    expect(result.content[0].text).toContain('Search Results (2 total)');
    expect(result.content[0].text).toContain('PROJ-123');
    expect(result.content[0].text).toContain('PROJ-124');
    expect(result.content[0].text).toContain('John Doe');
    expect(result.content[0].text).toContain('Unassigned');
    expect(result.isError).toBeUndefined();
  });

  it('should handle empty search results', async () => {
    const mockResponse = {
      total: 0,
      startAt: 0,
      maxResults: 50,
      issues: [],
    };

    mockClient.searchIssues.mockResolvedValue(mockResponse);

    const args = {
      jql: 'project = NONEXISTENT',
    };

    const result = await executeSearchIssues(mockClient, args);

    expect(result.content[0].text).toContain('Search Results (0 total)');
    expect(result.isError).toBeUndefined();
  });

  it('should handle validation errors', async () => {
    const args = {
      // Missing required jql field
      maxResults: 25,
    };

    const result = await executeSearchIssues(mockClient, args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error searching issues:');
    expect(result.content[0].text).toContain('Required');
  });

  it('should handle API errors', async () => {
    mockClient.searchIssues.mockRejectedValue(new Error('Invalid JQL'));

    const args = {
      jql: 'invalid jql syntax',
    };

    const result = await executeSearchIssues(mockClient, args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error searching issues: Invalid JQL');
  });
});
