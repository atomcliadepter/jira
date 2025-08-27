# Test Suite Directory Structure

This directory contains all testing files organized in a clean, modular structure.

## Directory Structure

```
test-suite/
├── unit/                   # Unit tests for individual components
├── integration/            # Integration tests with real APIs
├── e2e/                   # End-to-end tests for complete workflows
├── manual/                # Manual testing scripts and utilities
├── reports/               # Test reports and analysis results
├── fixtures/              # Test data and mock responses
├── utils/                 # Testing utilities and helpers
└── README.md              # This file
```

## Test Categories

### Unit Tests (`unit/`)
- Individual component testing
- Mock-based testing
- Fast execution
- No external dependencies

### Integration Tests (`integration/`)
- Real API testing with credentials
- Database integration tests
- External service integration
- Slower execution, requires setup

### End-to-End Tests (`e2e/`)
- Complete workflow testing
- User scenario testing
- Full system integration
- Comprehensive feature testing

### Manual Tests (`manual/`)
- Interactive testing scripts
- Debugging utilities
- Performance testing
- Ad-hoc testing tools

### Reports (`reports/`)
- Test execution reports
- Coverage reports
- Performance analysis
- Security audit results

### Fixtures (`fixtures/`)
- Sample data files
- Mock API responses
- Test configurations
- Reference data

### Utils (`utils/`)
- Testing helper functions
- Common test utilities
- Test setup/teardown scripts
- Shared testing infrastructure

## Usage

Run tests from the project root:

```bash
# Run all tests
npm test

# Run specific test category
npm run test:unit
npm run test:integration
npm run test:e2e

# Run manual tests
node test-suite/manual/connection-test.js
node test-suite/manual/mcp-server-test.js
```

## Best Practices

1. **Organize by functionality** - Group related tests together
2. **Use descriptive names** - Make test purposes clear
3. **Include documentation** - Add README files for complex test suites
4. **Separate concerns** - Keep unit, integration, and e2e tests separate
5. **Use fixtures** - Store test data in dedicated files
6. **Clean up** - Ensure tests clean up after themselves
