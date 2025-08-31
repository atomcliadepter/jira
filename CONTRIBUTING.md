# Contributing to Enhanced MCP Jira REST Server

Thank you for your interest in contributing! This document provides guidelines for contributing to the Enhanced MCP Jira REST Server.

## Quick Start

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/jira.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature`
5. Make changes and test: `npm test`
6. Commit and push: `git commit -m "feat: your feature" && git push`
7. Create a Pull Request

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm 8+
- Jira Cloud instance with API access

### Environment Setup
```bash
cp .env.example .env
# Configure your Jira credentials in .env
npm install
npm run build
npm test
```

## Code Standards

### TypeScript Guidelines
- Use strict TypeScript configuration
- Add proper type annotations
- Follow existing code patterns
- Use Zod schemas for validation

### Testing Requirements
- Write tests for new features
- Maintain >80% code coverage
- Use descriptive test names
- Include integration tests for tools

### Commit Convention
Follow [Conventional Commits](https://conventionalcommits.org/):
- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `test:` test additions/changes
- `refactor:` code refactoring

## Pull Request Process

1. **Before submitting:**
   - Run `npm run lint` and fix issues
   - Run `npm test` and ensure all tests pass
   - Update documentation if needed
   - Add tests for new functionality

2. **PR Requirements:**
   - Clear description of changes
   - Link to related issues
   - Screenshots for UI changes
   - Breaking changes documented

3. **Review Process:**
   - Code review by maintainers
   - CI/CD pipeline must pass
   - At least one approval required

## Adding New Tools

1. Create tool file in `src/tools/`
2. Add Zod schema for validation
3. Implement tool executor function
4. Add to `TOOL_EXECUTORS` in `src/index.ts`
5. Write comprehensive tests
6. Update documentation

## Reporting Issues

- Use GitHub Issues
- Include reproduction steps
- Provide environment details
- Add relevant logs/screenshots

## Questions?

- Open a GitHub Discussion
- Check existing issues and PRs
- Review documentation in `/docs`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
