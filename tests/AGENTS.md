# Testing Agent Guidelines

## CRITICAL RULES FOR TESTING

1. **ALWAYS write tests BEFORE implementation** - Test-driven development is mandatory
2. **ALWAYS use the ModuleMocker pattern** for module mocks - See ModuleMocker.ts
3. **ALWAYS clean up mocks in afterEach()** - Tests must be idempotent
4. **NEVER use mock.module() directly** - Use ModuleMocker to avoid Bun issues
5. **ALWAYS run `bun run test`** - NOT `bun test` (needs AWS context)

## COMMON TESTING MISTAKES

❌ Writing implementation before tests → ✅ Write failing tests first
❌ Using `mock.module()` directly → ✅ Use ModuleMocker class
❌ Not cleaning up mocks → ✅ Always use afterEach() cleanup
❌ Running `bun test` → ✅ Run `bun run test` for AWS context
❌ Testing implementation details → ✅ Test behavior and outputs

## Module Mocking Best Practices

When mocking for tests, remember to only insert the mocks in a `beforeEach()` and be sure to remove them in `afterEach()` so that mocks for one test don't pollute other tests. Test MUST always be idempotent.
In particular, be aware of the problems with `mock.module()` described here: https://github.com/oven-sh/bun/issues/7823
It is best to avoid `mock.module()` if possible because of this issue, but if you can't avoid `mock.module()` then use this workaround:

```typescript
/**
* When setting up a test that will mock a module, the block should add this:
* const moduleMocker = new ModuleMocker();
*
* afterEach(() => {
*   moduleMocker.clear();
* });
*
* When a test mocks a module, it should do it this way:
*
* beforeEach(() => {
*     await moduleMocker.mock('@/services/token.ts', () => ({
*         getBucketToken: mock(() => {
*             throw new Error('Unexpected error');
*         }),
*     });
* });
*
*/
interface MockResult {
    clear: () => void
}

export class ModuleMocker {
    private mocks: MockResult[] = [];

    async mock(modulePath: string, renderMocks: () => Record<string, unknown>) {
        const original = {
            ...(await import(modulePath))
        };
        const mocks = renderMocks();
        const result = {
            ...original,
            ...mocks,
        };
        mock.module(modulePath, () => result);

        this.mocks.push({
            clear: () => {
                mock.module(modulePath, () => original);
            },
        });
    }

    clear() {
        forEach(this.mocks, mockResult => mockResult.clear());
        this.mocks = [];
    }
}
```

## Environment Variables for Testing

Tests now use environment variables to determine which server to test against:

### E2E Tests
- `E2E_BASE_URL` - Base URL for E2E tests (defaults to `http://localhost:4321`)
  - Local SST dev: `http://localhost:4321` (check SST console for actual port)
  - Deployed environments: Use the CloudFront URL

### API Tests
- `API_BASE_URL` - Base URL for API tests (if needed)
  - Local SST dev: Check SST console for API function URLs
  - Deployed environments: Use the API Gateway or Function URL

### Running Tests

```bash
# Unit tests (no server needed)
bun test tests/data/
bun test tests/forms/

# Integration/E2E tests (server must be running)
# Terminal 1: Start server
bun run sst-dev

# Terminal 2: Run tests after server is ready
bun test tests/e2e/  # Uses default http://localhost:4321
API_BASE_URL=http://localhost:3001 bun test tests/api/

# Test against deployed environment
E2E_BASE_URL=https://d123456.cloudfront.net bun test tests/e2e/

# Run all tests (ensure appropriate servers are running)
bun test
```

### Benefits
- **Flexibility**: Test against local, staging, or production environments
- **Debugging**: See server logs while tests run
- **Speed**: No overhead from starting/stopping servers for each test run
- **Control**: Choose exactly which environment to test

## 1. Test File Organization

All test files will be located in a top-level `tests/` directory. The structure within this directory will mirror the application's source code structure.

-   **Data Layer Tests:** `tests/data/`
    -   `tests/data/buildings.test.ts`
    -   `tests/data/units.test.ts`
-   **API Layer Tests:** `tests/api/`
    -   `tests/api/buildings.test.ts`
    -   `tests/api/units.test.ts`
-   **Frontend Tests:** `tests/astro/`
    -   **Component Tests:** `tests/astro/components/`
        -   `tests/astro/components/BuildingCard.test.ts`
    -   **Page/E2E Tests:** `tests/astro/e2e/`
        -   `tests/astro/e2e/navigation.test.ts`

This organization keeps tests separate from the application code but maintains a clear and parallel structure.

## 2. Data Layer (`data/`)

The data layer is responsible for all interactions with the DynamoDB database. Testing this layer is critical to ensure data integrity. To test this layer, we will need to mock `dynamodb-toolbox`.

### What to Test:

- **CRUD Operations:** All Create, Read, Update, and Delete functions for each data model (e.g., `buildings`, `units`).
- **Input Validation:** How functions handle invalid or malformed input (e.g., incorrect types, missing fields).
- **Edge Cases:** Handling of non-existent records, empty query results, and other boundary conditions.
- **Error Handling:** Proper error propagation and handling for database-level errors.

### How to Test:

- **Framework:** Use `bun:test` for unit testing.
- **Strategy:**
    - Mock the DynamoDB client (`@aws-sdk/client-dynamodb`) to isolate tests from the actual database.
    - For each function, write test cases that cover:
        - **Success Scenarios:** Valid inputs result in expected outputs.
        - **Failure Scenarios:** Invalid inputs throw appropriate errors.
        - **Edge Cases:** Test with empty arrays, `null` or `undefined` values, and other edge cases.
    - Use assertions to verify the return values and that the correct DynamoDB client methods are called with the expected parameters.

## 3. API Layer (`api/`)

The API layer provides HTTP endpoints for the frontend to interact with the backend. To test this layer, we will need to mock the data layer.

### What to Test:

- **Endpoint Correctness:** Each endpoint (e.g., `/buildings`, `/units`) should correctly process requests and return the expected data.
- **HTTP Methods:** Correct handling of GET, POST, PUT, DELETE, and other relevant HTTP methods for each endpoint.
- **Request Validation:** The API should validate incoming request bodies and parameters, returning appropriate error codes (e.g., 400 Bad Request) for invalid requests.
- **Response Codes:** Ensure correct HTTP status codes are returned for success (200, 201, 204), client errors (4xx), and server errors (5xx).
- **Authentication/Authorization (if applicable):** If auth is added, test that endpoints are properly secured.

### How to Test:

- **Framework:** Use `bun:test` with a library for making HTTP requests, such as `supertest` or the built-in `fetch`.
- **Strategy:**
    - Write integration tests that start the API server and send HTTP requests to the endpoints.
    - Mock the data layer to isolate the API logic from the database.
    - For each endpoint, write tests to:
        - **Verify Success Responses:** Check the status code and the structure/content of the JSON response for valid requests.
        - **Verify Error Responses:** Send invalid requests (e.g., bad payload, incorrect parameters) and assert that the correct error status and message are returned.
    - Test the full lifecycle of a resource (e.g., create, read, update, delete a unit).

## 4. Astro Frontend (`astro-src/`)

The frontend is responsible for rendering the user interface and interacting with the API. To test this layer, we will need to mock the api layer.

### What to Test:

- **Component Rendering:** All Astro components (`.astro`) and Alpine.js components should render correctly with various props and states.
- **Page Rendering:** Server-side rendering of pages with data from the data layer.
- **Client-Side Interactivity:** Any client-side logic, especially Alpine.js components, should function as expected (e.g., form submissions, UI updates).
- **API Integration:** The frontend should correctly fetch data from the API and handle API responses (both success and error).
- **Routing and Navigation:** Links and navigation between pages should work correctly.

### How to Test:

- **Component/Page Rendering:**
    - **Framework:** Use a testing library that can render and test Astro components, such as `@testing-library/preact` or a similar tool.
    - **Strategy:**
        - Write snapshot tests to detect unintended changes in the rendered HTML.
        - Write unit tests for individual components to verify they render correctly based on their props.
- **Client-Side Interactivity & E2E:**
    - **Framework:** Use a browser automation tool like **Playwright** or **Cypress**.
    - **Strategy:**
        - Write end-to-end (E2E) tests that simulate user flows.
        - **Example Flow:**
            1.  Navigate to the main page.
            2.  Verify that the list of buildings is displayed.
            3.  Click a button to create a new building.
            4.  Fill out and submit the form.
            5.  Verify the new building appears in the list.
            6.  Navigate to the building's page.
            7.  Add a new unit to the building.
            8.  Verify the unit is displayed.
            9.  Delete the unit and then the building, verifying they are removed from the UI.

## 5. SST Configuration (`sst/`)

The SST configuration defines the application's infrastructure.

### What to Test:

- **Configuration Correctness:** The SST stack configuration should be valid.
- **Resource Provisioning:** The necessary AWS resources (Lambda, DynamoDB, S3, etc.) should be correctly defined.

### How to Test:

- **Tool:** Use `sst-diagnostics` to check for configuration issues.
- **Strategy:**
    - Run `bun run sst-diagnostics` as part of the CI/CD pipeline.

## 6. Overall Test Execution

- **Command:** A single command, `bun run test`, should run all relevant tests (linting, unit, integration).
- **Test Coverage:** Aim for high test coverage across all layers of the application.

## 7. E2E Testing with SSR and Database Seeding

### The Challenge
E2E tests run against the live SSR (Server-Side Rendering) Astro server, which queries the real DynamoDB database. API mocking doesn't work with SSR because the server makes database queries directly, not through the browser's network layer.

### The Solution: Test Data Seeding
We use a test data seeding strategy to populate DynamoDB with known test data before E2E tests run.

### Test Data Infrastructure

#### Helper Files (`tests/e2e/helpers/`)
- **`test-data-factory.ts`**: Generates consistent test data with predictable IDs
  - Uses timestamp-based IDs to avoid conflicts
  - Provides methods for full datasets or minimal test data
  - Ensures proper relationships between buildings, unit types, and units
- **`seed-test-data.ts`**: Seeds test data into DynamoDB
  - Single item seeding for small tests
  - Batch seeding for performance with larger datasets
  - Returns the seeded data for test assertions
- **`cleanup-test-data.ts`**: Removes test data after tests
  - Cleanup by specific test dataset
  - Cleanup by ID prefix for broader cleanup
  - Cleanup by time range for orphaned test data

#### Test Scripts
```bash
# Run E2E tests (tests handle their own data setup/cleanup)
bun run test:e2e
```

### E2E Test Structure

Each E2E test file should:

1. **Import test utilities**:
   ```typescript
   import { seedTestData, type TestDataSet } from './helpers/seed-test-data';
   import { cleanupTestData } from './helpers/cleanup-test-data';
   import { testDataFactory } from './helpers/test-data-factory';
   ```

2. **Seed data in beforeAll**:
   ```typescript
   let testData: TestDataSet;
   
   beforeAll(async () => {
       testData = testDataFactory.generateFullTestDataSet();
       await seedTestData(testData);
   });
   ```

3. **Clean up in afterAll**:
   ```typescript
   afterAll(async () => {
       await cleanupTestData(testData);
   });
   ```

4. **Use seeded data in tests**:
   ```typescript
   it('should display seeded buildings', async () => {
       await page.goto(baseUrl);
       // Test uses testData.buildings[0].buildingID
   });
   ```

### Edge Case Testing
Some tests still use API mocking for specific edge cases:
- Error handling (500 errors, network failures)
- Empty states (no data scenarios)
- File uploads (mocking S3 responses)

This is appropriate as these scenarios are difficult to create with real data.

### Best Practices
1. **Unique Test IDs**: Use timestamp-based IDs to avoid conflicts
2. **Complete Cleanup**: Always clean up test data to avoid pollution
3. **Predictable Data**: Use the factory to create consistent test scenarios
4. **Minimal Data**: Only seed what's needed for each test suite
5. **Error Handling**: Handle seeding/cleanup failures gracefully
