/**
 * Test setup file for component tests.
 * This file sets up basic mocking for component testing without AWS dependencies.
 */
import { mock, jest } from 'bun:test';

// Set test environment
process.env.BUN_ENV = 'test';
process.env.SST_STAGE = 'test';

// Mock logger
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

mock.module('@hughescr/logger', () => ({
    logger: mockLogger
}));

// Mock crypto module for consistent IDs in tests
const mockRandomUUID = jest.fn().mockReturnValue('eEUxh8XdGF1RsxfmwHPpYD');
mock.module('crypto', () => ({
    randomUUID: mockRandomUUID
}));

// Export mocks for test files to use
export { mockRandomUUID };

// Re-export jest for convenience
export { jest };
