import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { JiraRestClient } from '../src/http/JiraRestClient.js';
import { 
  executeCreateIssueLink, 
  executeGetIssueLink, 
  executeDeleteIssueLink
} from '../src/tools/issueLinkCreate.js';
import { executeListIssueLinkTypes } from '../src/tools/issueLinkTypes.js';
import { executeCreateRemoteIssueLink } from '../src/tools/remoteIssueLinkCreate.js';
import { executeGetIssue } from '../src/tools/getIssue.js';
import { executeCreateIssue } from '../src/tools/createIssue.js';
import { executeDeleteIssue } from '../src/tools/deleteIssue.js';
import { 
  executeUploadAttachment
} from '../src/tools/attachmentUpload.js';
import { executeGetAttachment } from '../src/tools/attachmentGet.js';
import { executeDeleteAttachment } from '../src/tools/attachmentDelete.js';
import { executeGetAttachmentSettings } from '../src/tools/attachmentSettings.js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('Phase 1 Tools - Issue Links & Attachments', () => {
  let jiraClient: JiraRestClient;
  let testIssue1Key: string;
  let testIssue2Key: string;
  let testLinkId: string;
  let testAttachmentId: string;
  let testFilePath: string;

  beforeAll(async () => {
    // Initialize Jira client with real credentials
    jiraClient = new JiraRestClient({
      baseURL: process.env.JIRA_BASE_URL!,
      email: process.env.JIRA_EMAIL!,
      apiToken: process.env.JIRA_API_TOKEN!
    });

    // Create test issues for linking
    const issue1Response = await executeCreateIssue({
      fields: {
        project: { key: 'KAN' },
        summary: 'Test Issue 1 for Link Testing',
        description: 'This is a test issue for link testing',
        issuetype: { name: 'Task' }
      }
    }, jiraClient);
    
    const issue2Response = await executeCreateIssue({
      fields: {
        project: { key: 'KAN' },
        summary: 'Test Issue 2 for Link Testing',
        description: 'This is another test issue for link testing',
        issuetype: { name: 'Task' }
      }
    }, jiraClient);

    testIssue1Key = JSON.parse(issue1Response.content[0].text).key;
    testIssue2Key = JSON.parse(issue2Response.content[0].text).key;

    // Create test file for attachment testing
    testFilePath = join(process.cwd(), 'test-attachment.txt');
    writeFileSync(testFilePath, 'This is a test file for attachment testing');
  });

  afterAll(async () => {
    // Cleanup test issues
    try {
      if (testIssue1Key) await executeDeleteIssue({ issueIdOrKey: testIssue1Key }, jiraClient);
      if (testIssue2Key) await executeDeleteIssue({ issueIdOrKey: testIssue2Key }, jiraClient);
    } catch (error) {
      console.log('Cleanup error:', error);
    }

    // Cleanup test file
    try {
      unlinkSync(testFilePath);
    } catch (error) {
      console.log('File cleanup error:', error);
    }
  });

  describe('Issue Link Management', () => {
    test('should list available issue link types', async () => {
      const result = await executeListIssueLinkTypes({}, jiraClient);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.issueLinkTypes).toBeDefined();
      expect(Array.isArray(response.issueLinkTypes)).toBe(true);
      expect(response.issueLinkTypes.length).toBeGreaterThan(0);
    });

    test('should create an issue link', async () => {
      const result = await executeCreateIssueLink({
        type: { name: 'Relates' },
        inwardIssue: { key: testIssue1Key },
        outwardIssue: { key: testIssue2Key }
      }, jiraClient);
      
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.message).toContain('Issue link created');
    });

    test('should create a remote issue link', async () => {
      const result = await executeCreateRemoteIssueLink({
        issueIdOrKey: testIssue1Key,
        object: {
          url: 'https://example.com/test',
          title: 'Test Remote Link'
        }
      }, jiraClient);
      
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.message).toContain('Remote issue link created');
    });
  });

  describe('Attachment Management', () => {
    test('should get attachment settings', async () => {
      const result = await executeGetAttachmentSettings({}, jiraClient);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.enabled).toBeDefined();
      expect(response.uploadLimit).toBeDefined();
    });

    test('should upload an attachment', async () => {
      const result = await executeUploadAttachment({
        issueIdOrKey: testIssue1Key,
        filePath: testFilePath,
        filename: 'test-upload.txt'
      }, jiraClient);
      
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.attachments).toBeDefined();
      expect(response.attachments.length).toBeGreaterThan(0);
      
      testAttachmentId = response.attachments[0].id;
    });

    test('should get attachment metadata', async () => {
      if (!testAttachmentId) {
        console.log('Skipping attachment get test - no attachment ID');
        return;
      }

      const result = await executeGetAttachment({
        attachmentId: testAttachmentId
      }, jiraClient);
      
      const response = JSON.parse(result.content[0].text);
      expect(response.id).toBe(testAttachmentId);
      expect(response.filename).toBeDefined();
      expect(response.size).toBeDefined();
    });

    test('should delete an attachment', async () => {
      if (!testAttachmentId) {
        console.log('Skipping attachment delete test - no attachment ID');
        return;
      }

      const result = await executeDeleteAttachment({
        attachmentId: testAttachmentId
      }, jiraClient);
      
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(response.message).toContain('deleted successfully');
    });
  });
});
