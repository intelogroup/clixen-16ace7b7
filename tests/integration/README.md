# n8n Integration System - Integration Tests

This directory contains comprehensive integration tests for the complete n8n integration system, covering all components from workflow generation to deployment and lifecycle management.

## Test Coverage

### 1. **MCP Server Integration** (`mcp-server.test.ts`)
- MCP server startup and initialization
- Tool registration and handler setup
- Workflow validation via MCP
- Node metadata retrieval
- Error handling and recovery

### 2. **Workflow Generation Engine** (`workflow-generation.test.ts`)
- Natural language processing
- Pattern matching and template selection
- AI-powered workflow generation
- Constraint handling and optimization
- Edge case handling

### 3. **Validation Pipeline** (`validation-pipeline.test.ts`)
- Multi-stage validation process
- Error detection and reporting
- Auto-fix functionality
- Performance analysis
- Security assessment

### 4. **Deployment Service** (`deployment-service.test.ts`)
- Workflow deployment to n8n
- Test mode and production deployment
- Rollback capabilities
- Status monitoring
- Error recovery

### 5. **Lifecycle Management** (`lifecycle-management.test.ts`)
- Status transitions
- Execution tracking
- Metrics collection
- Health monitoring
- Maintenance automation

### 6. **End-to-End Integration** (`e2e-integration.test.ts`)
- Complete workflow creation cycle
- Cross-component integration
- Performance benchmarking
- Error propagation
- User journey simulation

## Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.test
# Edit .env.test with test configuration
```

### Environment Variables Required
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# n8n Configuration  
N8N_API_URL=http://18.221.12.50:5678/api/v1
N8N_API_KEY=your-n8n-api-key

# OpenAI Configuration (for AI-powered features)
OPENAI_API_KEY=your-openai-api-key

# Test Configuration
TEST_TIMEOUT=30000
TEST_DB_CLEANUP=true
```

### Run All Integration Tests
```bash
# Run all integration tests
npm run test:integration

# Run with coverage
npm run test:integration:coverage

# Run specific test suite
npm run test:integration -- --testNamePattern="MCP Server"

# Run in watch mode for development
npm run test:integration:watch
```

### Run Individual Test Suites
```bash
# Test MCP server integration
npm run test:integration -- tests/integration/mcp-server.test.ts

# Test workflow generation
npm run test:integration -- tests/integration/workflow-generation.test.ts

# Test validation pipeline
npm run test:integration -- tests/integration/validation-pipeline.test.ts

# Test deployment service
npm run test:integration -- tests/integration/deployment-service.test.ts

# Test lifecycle management
npm run test:integration -- tests/integration/lifecycle-management.test.ts

# Run end-to-end tests
npm run test:integration -- tests/integration/e2e-integration.test.ts
```

## Test Configuration

### Jest Configuration (`jest.integration.config.js`)
- TypeScript support with ts-jest
- Module path mapping for imports
- Coverage reporting
- Timeout configuration for long-running tests
- Custom reporters for detailed output

### Test Setup (`tests/config/test-setup.ts`)
- Global test environment setup
- Mock services initialization
- Database connection configuration
- Test data seeding

### Global Setup (`tests/config/global-setup.ts`)
- Start test services (MCP server, etc.)
- Database migration for tests
- Test environment validation

### Global Teardown (`tests/config/global-teardown.ts`)
- Stop test services
- Clean up test data
- Resource cleanup

## Test Data Management

### Test Database Schema
The tests use the same database schema as production but with test-specific prefixes:
- Test users: `test-user-{timestamp}`
- Test projects: `test-project-{timestamp}`
- Test workflows: `test-workflow-{timestamp}`

### Data Lifecycle
1. **Setup**: Create isolated test data for each test suite
2. **Execution**: Tests operate on isolated data
3. **Cleanup**: Automatic cleanup after test completion
4. **Isolation**: Each test suite has its own data namespace

## Performance Testing

### Benchmarks Included
- Workflow generation time (target: <5 seconds)
- Validation pipeline execution (target: <2 seconds)
- Deployment time (target: <30 seconds)
- Database operations (target: <500ms per query)

### Load Testing
```bash
# Run performance benchmarks
npm run test:integration:performance

# Run load tests
npm run test:integration:load
```

## Debugging Tests

### Debug Configuration
```bash
# Run tests in debug mode
npm run test:integration:debug

# Run specific test in debug mode
npm run test:integration:debug -- --testNamePattern="should deploy workflow successfully"
```

### Logging
- Test execution logs: `logs/integration-tests.log`
- MCP server logs: `logs/mcp-server-test.log`
- Database query logs: `logs/database-test.log`

### Common Issues and Solutions

1. **MCP Server Connection Issues**
   ```bash
   # Check if MCP server process is running
   ps aux | grep n8n-integration-server
   
   # Restart MCP server manually
   node backend/mcp/n8n-integration-server.js
   ```

2. **Database Connection Issues**
   ```bash
   # Verify Supabase connection
   npm run test:integration -- --testNamePattern="database connection"
   
   # Check environment variables
   echo $SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

3. **n8n API Issues**
   ```bash
   # Test n8n API connectivity
   curl -H "X-N8N-API-KEY: $N8N_API_KEY" $N8N_API_URL/workflows
   
   # Check n8n service health
   curl http://18.221.12.50:5678/healthz
   ```

## Continuous Integration

### GitHub Actions Configuration
```yaml
name: Integration Tests
on: [push, pull_request]
jobs:
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:integration
        env:
          SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_ROLE_KEY }}
          N8N_API_KEY: ${{ secrets.TEST_N8N_API_KEY }}
```

## Test Reports

### Coverage Reports
- HTML Report: `coverage/integration/html/index.html`
- LCOV Report: `coverage/integration/lcov.info`
- JSON Report: `coverage/integration/coverage.json`

### Test Reports
- JUnit XML: `coverage/integration/junit.xml`
- HTML Report: `coverage/integration/html-report/integration-test-report.html`

## Contributing

### Adding New Tests
1. Create test file in appropriate subdirectory
2. Follow naming convention: `feature-name.test.ts`
3. Include setup/teardown for test isolation
4. Add performance benchmarks where applicable
5. Update this README with new test descriptions

### Test Guidelines
- **Isolation**: Each test should be independent
- **Cleanup**: Always clean up test data
- **Performance**: Include performance assertions
- **Error Cases**: Test both success and failure scenarios
- **Documentation**: Document complex test scenarios

### Code Coverage Standards
- Minimum 80% line coverage
- Minimum 70% branch coverage
- 100% coverage for critical paths (deployment, validation)

## Monitoring and Alerts

### Test Metrics
- Test execution time trends
- Flaky test detection
- Coverage trends over time
- Performance regression detection

### Alerts
- Failed test runs
- Coverage drops
- Performance regressions
- Test timeout issues

For more information, see the [main project documentation](../../README.md).