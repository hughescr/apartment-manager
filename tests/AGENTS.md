# Comprehensive Test Plan

This document outlines the testing strategy for the apartment manager application. The goal is to ensure the reliability, correctness, and performance of all application components, from the data layer to the user interface.

## Beware of mocking

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
