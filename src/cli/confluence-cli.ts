
/**
 * CLI interface for Confluence Integration
 */

import { Command } from 'commander';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// Load environment variables
config();
import { join } from 'path';
import { ConfluenceService } from '../services/ConfluenceService.js';
import { ConfluenceRestClient } from '../http/ConfluenceRestClient.js';
import { JiraRestClient } from '../http/JiraRestClient.js';
import { logger } from '../utils/logger.js';
import {
  CreatePageRequest,
  UpdatePageRequest,
  CreateSpaceRequest
} from '../types/confluence.js';

const program = new Command();

// Initialize Confluence client
const confluenceClient = new ConfluenceRestClient({
  baseUrl: process.env.CONFLUENCE_BASE_URL || process.env.JIRA_BASE_URL || '',
  email: process.env.CONFLUENCE_EMAIL || process.env.JIRA_EMAIL || '',
  apiToken: process.env.CONFLUENCE_API_TOKEN || process.env.JIRA_API_TOKEN || '',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000
});

// Initialize Jira client for integration features
const jiraClient = new JiraRestClient({
  baseUrl: process.env.JIRA_BASE_URL || '',
  email: process.env.JIRA_EMAIL || '',
  apiToken: process.env.JIRA_API_TOKEN || '',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000
});

// Initialize Confluence service
const confluenceService = new ConfluenceService(confluenceClient);

program
  .name('jira-confluence')
  .description('JIRA-Confluence Integration CLI')
  .version('1.0.0');

/**
 * Create page command
 */
program
  .command('create-page')
  .description('Create a new Confluence page')
  .option('-t, --title <title>', 'Page title')
  .option('-s, --space <spaceKey>', 'Space key')
  .option('-c, --content <content>', 'Page content (HTML)')
  .option('-f, --file <file>', 'Content file path')
  .option('-p, --parent <parentId>', 'Parent page ID')
  .action(async (options) => {
    try {
      if (!options.title || !options.space) {
        console.error('❌ Title and space are required');
        process.exit(1);
      }

      let content = options.content || '';
      if (options.file) {
        if (!existsSync(options.file)) {
          console.error(`❌ Content file not found: ${options.file}`);
          process.exit(1);
        }
        content = readFileSync(options.file, 'utf-8');
      }

      if (!content) {
        console.error('❌ Content is required (use --content or --file)');
        process.exit(1);
      }

      console.log('🔄 Creating Confluence page...');
      
      const request: CreatePageRequest = {
        type: 'page',
        title: options.title,
        space: { key: options.space },
        body: {
          storage: {
            value: content,
            representation: 'storage'
          }
        }
      };

      if (options.parent) {
        request.ancestors = [{ id: options.parent }];
      }

      const page = await confluenceService.createPage(request);

      console.log('✅ Page created successfully!');
      console.log(`📋 Page ID: ${page.id}`);
      console.log(`📝 Title: ${page.title}`);
      console.log(`🏠 Space: ${page.space?.key}`);
      console.log(`🔗 URL: ${page._links.webui}`);

      // Save page info to file
      const pageFile = `confluence-page-${page.id}.json`;
      writeFileSync(pageFile, JSON.stringify(page, null, 2));
      console.log(`💾 Page info saved to: ${pageFile}`);

    } catch (error) {
      console.error('❌ Failed to create page:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Update page command
 */
program
  .command('update-page')
  .description('Update an existing Confluence page')
  .option('-i, --id <pageId>', 'Page ID')
  .option('-t, --title <title>', 'New page title')
  .option('-c, --content <content>', 'New page content (HTML)')
  .option('-f, --file <file>', 'Content file path')
  .option('-v, --version <version>', 'Current version number', parseInt)
  .action(async (options) => {
    try {
      if (!options.id) {
        console.error('❌ Page ID is required');
        process.exit(1);
      }

      // Get current page if version not provided
      let version = options.version;
      if (!version) {
        console.log('🔄 Fetching current page version...');
        const currentPage = await confluenceService.getPage(options.id, ['version']);
        version = currentPage.version.number;
      }

      let content = options.content;
      if (options.file) {
        if (!existsSync(options.file)) {
          console.error(`❌ Content file not found: ${options.file}`);
          process.exit(1);
        }
        content = readFileSync(options.file, 'utf-8');
      }

      const updateRequest: UpdatePageRequest = {
        version: { number: version + 1 }
      };

      if (options.title) {
        updateRequest.title = options.title;
      }

      if (content) {
        updateRequest.body = {
          storage: {
            value: content,
            representation: 'storage'
          }
        };
      }

      console.log('🔄 Updating Confluence page...');
      const page = await confluenceService.updatePage(options.id, updateRequest);

      console.log('✅ Page updated successfully!');
      console.log(`📋 Page ID: ${page.id}`);
      console.log(`📝 Title: ${page.title}`);
      console.log(`🔢 Version: ${page.version.number}`);
      console.log(`🔗 URL: ${page._links.webui}`);

    } catch (error) {
      console.error('❌ Failed to update page:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Get page command
 */
program
  .command('get-page')
  .description('Get a Confluence page')
  .option('-i, --id <pageId>', 'Page ID')
  .option('-e, --expand <fields>', 'Comma-separated list of fields to expand')
  .option('--format <format>', 'Output format (json|table)', 'table')
  .action(async (options) => {
    try {
      if (!options.id) {
        console.error('❌ Page ID is required');
        process.exit(1);
      }

      const expand = options.expand ? options.expand.split(',') : ['body.storage', 'version', 'space'];
      
      console.log('🔄 Fetching Confluence page...');
      const page = await confluenceService.getPage(options.id, expand);

      if (options.format === 'json') {
        console.log(JSON.stringify(page, null, 2));
        return;
      }

      console.log('✅ Page retrieved successfully!');
      console.log(`📋 ID: ${page.id}`);
      console.log(`📝 Title: ${page.title}`);
      console.log(`📊 Status: ${page.status}`);
      console.log(`🏠 Space: ${page.space?.name} (${page.space?.key})`);
      console.log(`🔢 Version: ${page.version.number}`);
      console.log(`🔗 URL: ${page._links.webui}`);
      
      if (page.body?.storage) {
        console.log(`📄 Content Length: ${page.body.storage.value.length} characters`);
      }

    } catch (error) {
      console.error('❌ Failed to get page:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Create space command
 */
program
  .command('create-space')
  .description('Create a new Confluence space')
  .option('-k, --key <spaceKey>', 'Space key')
  .option('-n, --name <spaceName>', 'Space name')
  .option('-d, --description <description>', 'Space description')
  .action(async (options) => {
    try {
      if (!options.key || !options.name) {
        console.error('❌ Space key and name are required');
        process.exit(1);
      }

      console.log('🔄 Creating Confluence space...');
      
      const request: CreateSpaceRequest = {
        key: options.key,
        name: options.name
      };

      if (options.description) {
        request.description = {
          plain: {
            value: options.description,
            representation: 'plain'
          }
        };
      }

      const space = await confluenceService.createSpace(request);

      console.log('✅ Space created successfully!');
      console.log(`📋 Space ID: ${space.id}`);
      console.log(`🔑 Key: ${space.key}`);
      console.log(`📝 Name: ${space.name}`);
      console.log(`📊 Type: ${space.type}`);
      console.log(`🔗 URL: ${space._links.webui}`);

    } catch (error) {
      console.error('❌ Failed to create space:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Link Jira issue command
 */
program
  .command('link-jira-issue')
  .description('Link a Jira issue to a Confluence page')
  .option('-p, --page <pageId>', 'Confluence page ID')
  .option('-i, --issue <issueKey>', 'Jira issue key')
  .option('-s, --server <serverId>', 'Jira server ID', 'System JIRA')
  .action(async (options) => {
    try {
      if (!options.page || !options.issue) {
        console.error('❌ Page ID and issue key are required');
        process.exit(1);
      }

      console.log('🔄 Linking Jira issue to Confluence page...');
      
      await confluenceService.linkJiraIssueToPage(
        options.page,
        options.issue,
        options.server
      );

      console.log('✅ Jira issue linked successfully!');
      console.log(`📋 Page ID: ${options.page}`);
      console.log(`🎫 Issue Key: ${options.issue}`);
      console.log(`🖥️ Server: ${options.server}`);

    } catch (error) {
      console.error('❌ Failed to link Jira issue:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Create documentation from Jira issue command
 */
program
  .command('create-docs')
  .description('Create documentation from a Jira issue')
  .option('-i, --issue <issueKey>', 'Jira issue key')
  .option('-s, --space <spaceKey>', 'Confluence space key')
  .option('-p, --parent <parentId>', 'Parent page ID')
  .option('--comments', 'Include issue comments', false)
  .option('--attachments', 'Include issue attachments', false)
  .action(async (options) => {
    try {
      if (!options.issue || !options.space) {
        console.error('❌ Issue key and space key are required');
        process.exit(1);
      }

      console.log('🔄 Creating documentation from Jira issue...');
      
      // Fetch issue data
      const issueData = await jiraClient.get(`/rest/api/3/issue/${options.issue}`, {
        params: {
          expand: 'names,schema,operations,editmeta,changelog,renderedFields'
        }
      });

      // Fetch comments if requested
      let comments = [];
      if (options.comments) {
        const commentsResponse = await jiraClient.get(`/rest/api/3/issue/${options.issue}/comment`);
        comments = commentsResponse.comments || [];
      }

      // Fetch attachments if requested
      let attachments = [];
      if (options.attachments) {
        attachments = issueData.fields.attachment || [];
      }

      const page = await confluenceService.createDocumentationFromJiraIssue(
        options.issue,
        { ...issueData, comments, attachments },
        options.space,
        options.parent
      );

      console.log('✅ Documentation created successfully!');
      console.log(`🎫 Issue Key: ${options.issue}`);
      console.log(`📋 Page ID: ${page.id}`);
      console.log(`📝 Title: ${page.title}`);
      console.log(`🏠 Space: ${page.space?.key}`);
      console.log(`🔗 URL: ${page._links.webui}`);

    } catch (error) {
      console.error('❌ Failed to create documentation:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * Search pages command
 */
program
  .command('search-pages')
  .description('Search Confluence pages using CQL')
  .option('-q, --query <cql>', 'CQL search query')
  .option('-l, --limit <limit>', 'Maximum results', parseInt, 25)
  .option('-s, --start <start>', 'Starting index', parseInt, 0)
  .option('--format <format>', 'Output format (json|table)', 'table')
  .action(async (options) => {
    try {
      if (!options.query) {
        console.error('❌ Search query is required');
        process.exit(1);
      }

      console.log('🔄 Searching Confluence pages...');
      const pages = await confluenceService.searchPages(options.query, options.limit, options.start);

      if (options.format === 'json') {
        console.log(JSON.stringify(pages, null, 2));
        return;
      }

      if (pages.length === 0) {
        console.log('📭 No pages found matching the search criteria.');
        return;
      }

      console.log(`✅ Found ${pages.length} page(s):\n`);
      pages.forEach((page, index) => {
        console.log(`${index + 1}. ${page.title}`);
        console.log(`   📋 ID: ${page.id}`);
        console.log(`   🏠 Space: ${page.space?.name} (${page.space?.key})`);
        console.log(`   📊 Status: ${page.status}`);
        console.log(`   🔗 URL: ${page._links.webui}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Failed to search pages:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

/**
 * List spaces command
 */
program
  .command('list-spaces')
  .description('List Confluence spaces')
  .option('-t, --type <type>', 'Space type (global|personal)')
  .option('-l, --limit <limit>', 'Maximum results', parseInt, 25)
  .option('-s, --start <start>', 'Starting index', parseInt, 0)
  .option('--format <format>', 'Output format (json|table)', 'table')
  .action(async (options) => {
    try {
      console.log('🔄 Fetching Confluence spaces...');
      const spaces = await confluenceService.getSpaces(options.limit, options.start, options.type);

      if (options.format === 'json') {
        console.log(JSON.stringify(spaces, null, 2));
        return;
      }

      if (spaces.length === 0) {
        console.log('📭 No spaces found.');
        return;
      }

      console.log(`✅ Found ${spaces.length} space(s):\n`);
      spaces.forEach((space, index) => {
        console.log(`${index + 1}. ${space.name}`);
        console.log(`   🔑 Key: ${space.key}`);
        console.log(`   📋 ID: ${space.id}`);
        console.log(`   📊 Type: ${space.type}`);
        console.log(`   📊 Status: ${space.status}`);
        if (space.description?.plain?.value) {
          console.log(`   📝 Description: ${space.description.plain.value}`);
        }
        console.log(`   🔗 URL: ${space._links.webui}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Failed to list spaces:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

export { program as confluenceCliProgram };

// If this file is run directly, execute the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}
