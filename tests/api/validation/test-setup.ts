/**
 * Test setup file specifically for validation tests.
 * This re-exports the main test setup to ensure proper mocking.
 */

// Import and re-export the main test setup
export * from '../../data/test-setup';

// Import the setup to trigger the mocks
import '../../data/test-setup';
