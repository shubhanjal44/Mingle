# Testing Guidelines

## Overview

This project uses **Jest** with **TypeScript** for comprehensive testing. We follow a three-tier testing approach:
- **Unit Tests** - Testing individual functions and services in isolation
- **Integration Tests** - Testing API endpoints with full request-response cycle
- **E2E Tests** - Testing complete user flows (future)

## Test Structure

```
backend/
├── tests/
│   ├── setup.ts              # Global test configuration
│   ├── unit/                 # Unit tests
│   │   ├── analytics.service.test.ts
│   │   ├── admin.service.test.ts
│   │   └── moderation.service.test.ts
│   └── integration/          # Integration tests
│       ├── admin.routes.test.ts
│       └── moderation.routes.test.ts
├── jest.config.js            # Jest configuration
└── TESTING.md               # This file
```

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Coverage Requirements

We maintain a minimum code coverage of **70%** for:
- Branches
- Functions
- Lines
- Statements

Coverage reports are generated in `/coverage` directory.

## Writing Unit Tests

### Best Practices

1. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should calculate MRR correctly', async () => {
     // Arrange: Setup mocks and test data
     const mockSubscriptions = [...]
(prisma.userSubscription.findMany as jest.Mock).mockResolvedValueOnce(mockSubscriptions);

     // Act: Call the function
     const result = await analyticsService.getSubscriptionMetrics();

     // Assert: Verify the result
     expect(result.mrr).toBe(1500);
   });
   ```

2. **Mock External Dependencies**
   - Always mock database calls using Jest mocks
   - Mock external services (email, payment providers)
   - Use `jest.clearAllMocks()` in `beforeEach()`

3. **Test Edge Cases**
   - Zero/null values
   - Empty arrays
   - Division by zero
   - Boundary conditions

### Example Unit Test

```typescript
describe('Analytics Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserMetrics', () => {
    it('should return correct user metrics', async () => {
      (prisma.user.count as jest.Mock)
        .mockResolvedValueOnce(1000) // total users
        .mockResolvedValueOnce(850); // active users

      const metrics = await analyticsService.getUserMetrics();

      expect(metrics.total).toBe(1000);
      expect(metrics.active).toBe(850);
    });

    it('should handle zero growth correctly', async () => {
      (prisma.user.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const metrics = await analyticsService.getUserMetrics();

      expect(metrics.growthRate).toBe(0);
    });
  });
});
```

## Writing Integration Tests

### Best Practices

1. **Test Full Request-Response Cycle**
   - Use `supertest` for HTTP requests
   - Test authentication/authorization
   - Verify response structure and status codes

2. **Setup Test Data**
   - Mock database responses
   - Generate JWT tokens for auth testing
   - Clean up after each test

3. **Test All HTTP Methods**
   - GET, POST, PUT, DELETE
   - Test success and error cases

### Example Integration Test

```typescript
describe('Admin Routes', () => {
  let adminToken: string;

  beforeAll(() => {
    adminToken = jwt.sign(
      { userId: 'admin-1', role: 'ADMIN' },
      process.env.JWT_SECRET!
    );
  });

  describe('GET /api/v1/admin/dashboard', () => {
    it('should return dashboard metrics for admin', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'ACTIVE',
      });

      const response = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics).toBeDefined();
    });

    it('should deny access for non-admin users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        userId: 'user-1',
        role: 'USER',
        status: 'ACTIVE',
      });

      await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});
```

## Mocking Strategies

### Prisma Client Mocking

All Prisma calls are mocked in `tests/setup.ts`:

```typescript
jest.mock('../src/config/database', () => ({
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  // ... other models
}));
```

### Service Mocking

Mock service methods when testing controllers:

```typescript
jest.spyOn(analyticsService, 'getUserMetrics').mockResolvedValueOnce({
  total: 1000,
  active: 850,
  // ...
});
```

## Common Patterns

### Testing Async Functions

```typescript
it('should handle async operations', async () => {
  const promise = someAsyncFunction();
  await expect(promise).resolves.toBe(expectedValue);
});
```

### Testing Error Cases

```typescript
it('should throw error when user not found', async () => {
  (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

  await expect(
    adminService.getUserDetails('999')
  ).rejects.toThrow('User not found');
});
```

### Testing with Floating Point Numbers

```typescript
it('should calculate percentage', () => {
  expect(result.percentage).toBeCloseTo(33.33, 2); // 2 decimal precision
});
```

## Continuous Integration

Tests run automatically on:
- Every commit
- Pull request creation
- Before deployment

CI pipeline fails if:
- Any test fails
- Coverage drops below 70%

## Troubleshooting

### Tests Failing Locally

1. **Clear Jest cache**
   ```bash
   npx jest --clearCache
   ```

2. **Check mock order**
   - Ensure mocks are called in the correct sequence
   - Use `.mockResolvedValueOnce()` for each call

3. **Verify test isolation**
   - Each test should be independent
   - Use `beforeEach()` to reset state

### Coverage Issues

1. **Generate detailed coverage report**
   ```bash
   npm run test:coverage -- --verbose
   ```

2. **View HTML coverage report**
   ```bash
   open coverage/lcov-report/index.html
   ```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

## Contributing

When adding new features:
1. Write tests FIRST (TDD approach)
2. Ensure all tests pass before committing
3. Maintain or improve code coverage
4. Add integration tests for new API endpoints
5. Document any new testing patterns

---

**Last Updated**: November 2024
**Maintainer**: tej-india India Team
