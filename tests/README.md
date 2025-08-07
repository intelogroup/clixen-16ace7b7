# Clixen MVP Headless Testing Infrastructure

This directory contains comprehensive automated testing for the Clixen MVP platform, covering end-to-end user journeys, API integration, unit testing, security, and performance validation.

## Testing Framework Overview

### Directory Structure
```
tests/
├── e2e/                    # Playwright end-to-end tests
│   ├── auth/              # Authentication flow tests
│   ├── projects/          # Project management tests
│   ├── workflows/         # Workflow generation and deployment tests
│   ├── chat/              # Chat interface tests
│   └── fixtures/          # E2E test data and helpers
├── api/                   # API integration tests
│   ├── auth.test.ts       # Authentication API tests
│   ├── projects.test.ts   # Project management API tests
│   ├── workflows.test.ts  # Workflow generation API tests
│   ├── supabase.test.ts   # Supabase integration tests
│   └── n8n.test.ts        # n8n deployment API tests
├── unit/                  # Jest unit tests
│   ├── components/        # React component tests
│   ├── services/          # Service layer tests
│   ├── agents/            # Backend agent tests
│   └── utils/             # Utility function tests
├── security/              # Security and vulnerability tests
│   ├── auth-security.test.ts
│   ├── input-validation.test.ts
│   ├── sql-injection.test.ts
│   └── xss-protection.test.ts
├── performance/           # Load and performance tests
│   ├── load-testing.test.ts
│   ├── stress-testing.test.ts
│   └── memory-leaks.test.ts
├── fixtures/              # Shared test data and mocks
│   ├── users.json         # Test user accounts
│   ├── projects.json      # Sample project data
│   ├── workflows.json     # Sample workflow definitions
│   └── mocks/             # Mock API responses
└── config/                # Testing configuration
    ├── jest.config.js     # Jest configuration
    ├── playwright.config.ts # Playwright configuration
    └── test-setup.ts      # Global test setup
```

## Testing Strategy

### MVP Success Criteria Testing
- **User Onboarding**: Automated testing of ≥70% workflow completion within 10 minutes
- **Workflow Persistence**: Validation of ≥90% successful save/retrieve operations  
- **Deployment Rate**: Testing ≥80% successful n8n deployments
- **Error Handling**: Comprehensive validation of error messages and recovery flows

### Core User Journey Testing
1. **Authentication Flow**: Signup → Login → Session management → Logout
2. **Project Management**: Create project → Select project → Switch between projects
3. **Workflow Generation**: Chat prompt → AI processing → Workflow generation → Validation
4. **n8n Deployment**: Deploy workflow → Status tracking → Execution monitoring
5. **Error Handling**: Network failures → Invalid inputs → API errors → Recovery

### Test Types

#### 1. End-to-End (E2E) Tests
- Complete user journeys from signup to deployed workflow
- Cross-browser compatibility testing
- Mobile responsiveness validation
- Real-world user scenario simulation

#### 2. API Integration Tests
- Supabase backend API validation
- n8n deployment API testing
- OpenAI integration testing
- Authentication flow validation
- Error response handling

#### 3. Unit Tests
- React component functionality
- Service layer business logic
- Backend agent coordination
- Utility function validation
- Data transformation testing

#### 4. Security Tests
- Authentication bypass prevention
- SQL injection protection
- XSS vulnerability scanning
- Input validation testing
- Session security validation

#### 5. Performance Tests
- Response time measurement
- Concurrent user load testing
- Memory leak detection
- Bundle size validation
- Database query performance

## Running Tests

### Prerequisites
```bash
# Install dependencies
cd /root/repo
npm install

# Install Playwright browsers
npx playwright install
```

### Test Commands
```bash
# Run all tests
npm run test:all

# Run E2E tests
npm run test:e2e

# Run API tests
npm run test:api

# Run unit tests
npm run test:unit

# Run security tests
npm run test:security

# Run performance tests
npm run test:performance

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Test Environment Configuration
- **Local Development**: Tests against localhost:3000
- **Staging**: Tests against staging deployment
- **Production**: Read-only tests against production environment
- **Test Database**: Isolated Supabase instance for testing

## Test Data Management

### Test Users
- Dedicated test accounts with known credentials
- Automatic test data cleanup after test runs
- Isolated test projects and workflows

### Mock Data
- Sample workflow definitions for testing
- Mock n8n API responses for offline testing
- Consistent test data across all test suites

## CI/CD Integration

### GitHub Actions Workflow
- Automated test execution on pull requests
- Parallel test execution for faster feedback
- Test result reporting and failure notifications
- Deployment blocking on test failures

### Test Reporting
- HTML test reports with screenshots
- Performance metrics tracking
- Test coverage reporting
- Failure analysis and debugging information

## Monitoring and Maintenance

### Test Health Monitoring
- Automated test reliability tracking
- Flaky test identification and resolution
- Test execution time monitoring
- Environment-specific test results

### Test Data Maintenance
- Regular test data cleanup
- Test account credential rotation
- Mock data updates with API changes
- Test environment health checks

## Best Practices

1. **Test Independence**: Each test runs in isolation with clean state
2. **Real Data Usage**: Tests use actual API calls where possible
3. **Error Scenario Coverage**: Comprehensive testing of failure paths
4. **Performance Validation**: Every test includes performance assertions
5. **Security Focus**: Security testing integrated into all test types
6. **Maintainability**: Clear test structure with reusable helpers
7. **Documentation**: Every test includes clear purpose and expectations

## MVP Compliance Validation

The testing framework specifically validates:
- All MVP acceptance criteria are met
- Success metrics are measurable and tracked
- Error handling meets user experience standards
- Performance requirements are satisfied
- Security requirements are enforced
- System reliability is maintained under load

For more details on specific test implementations, see the individual test suite documentation in each subdirectory.