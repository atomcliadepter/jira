
import { executeCreateIssue } from './createIssue';
import { JiraRestClient } from '../http/JiraRestClient';

// Mock the JiraRestClient
jest.mock('../http/JiraRestClient');

describe('createIssue tool', () => {
  let mockClient: jest.Mocked<JiraRestClient>;

  beforeEach(() => {
    mockClient = {
      createIssue: jest.fn(),
    } as any;
  });

  it('should create issue successfully', async () => {
    const mockResponse = {
      id: '10001',
      key: 'PROJ-123',
      self: 'https://test.atlassian.net/rest/api/3/issue/10001',
    };

    mockClient.createIssue.mockResolvedValue(mockResponse);

    const args = {
      fields: {
        project: { key: 'PROJ' },
        summary: 'Test issue',
        issuetype: { name: 'Task' },
      },
    };

    const result = await executeCreateIssue(mockClient, args);

    expect(mockClient.createIssue).toHaveBeenCalledWith(expect.objectContaining({
      fields: expect.objectContaining({
        project: { key: 'PROJ' },
        summary: 'Test issue',
        issuetype: { name: 'Task' },
      }),
    }));

    expect(result.content[0].text).toContain('Successfully created issue: PROJ-123');
    expect(result.isError).toBeUndefined();
  });

  it('should convert plain text description to ADF', async () => {
    const mockResponse = {
      id: '10001',
      key: 'PROJ-123',
      self: 'https://test.atlassian.net/rest/api/3/issue/10001',
    };

    mockClient.createIssue.mockResolvedValue(mockResponse);

    const args = {
      fields: {
        project: { key: 'PROJ' },
        summary: 'Test issue',
        description: 'Plain text description',
        issuetype: { name: 'Task' },
      },
    };

    await executeCreateIssue(mockClient, args);

    expect(mockClient.createIssue).toHaveBeenCalledWith(expect.objectContaining({
      fields: expect.objectContaining({
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Plain text description',
                },
              ],
            },
          ],
        },
      }),
    }));
  });

  it('should handle validation errors', async () => {
    const args = {
      fields: {
        // Missing required fields
        summary: 'Test issue',
      },
    };

    const result = await executeCreateIssue(mockClient, args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error creating issue:');
    expect(result.content[0].text).toContain('Required');
  });

  it('should handle API errors', async () => {
    mockClient.createIssue.mockRejectedValue(new Error('API Error'));

    const args = {
      fields: {
        project: { key: 'PROJ' },
        summary: 'Test issue',
        issuetype: { name: 'Task' },
      },
    };

    const result = await executeCreateIssue(mockClient, args);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error creating issue: API Error');
  });
});
