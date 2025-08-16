/**
 * Test setup file for API tests.
 * Uses jest.fn() patterns instead of mock.module() to avoid Bun's global state issues.
 * This extends the data layer test setup with API-specific mocks.
 */

// Import data layer test setup FIRST
import '../data/test-setup';

// API tests don't need additional setup beyond what the data layer provides
// The data layer test-setup.ts already mocks:
// - SST Resources
// - DynamoDB client
// - S3 client
// - Logger
// - Lodash (for CommonJS compatibility)

// Export any API-specific test utilities here if needed
export {};
