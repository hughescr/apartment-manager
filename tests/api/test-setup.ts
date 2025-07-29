/**
 * Test setup file for API tests.
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
