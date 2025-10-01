/**
 * Test setup file for component tests.
 * Uses jest.fn() patterns instead of mock.module() to avoid Bun's global state issues.
 * This file sets up basic mocking for component testing without AWS dependencies.
 */
import { jest, spyOn } from 'bun:test';

// Set test environment
process.env.BUN_ENV = 'test';
process.env.SST_STAGE = 'test';

// Import the actual logger to spy on it
import { logger } from '@hughescr/logger';
import * as crypto from 'crypto';

// Create spies on the actual logger methods
const loggerInfoSpy = spyOn(logger, 'info');
const loggerWarnSpy = spyOn(logger, 'warn');
const loggerErrorSpy = spyOn(logger, 'error');
const loggerDebugSpy = spyOn(logger, 'debug');

// Mock logger implementation (for backward compatibility)
const mockLogger = {
    info:  loggerInfoSpy,
    warn:  loggerWarnSpy,
    error: loggerErrorSpy,
    debug: loggerDebugSpy
};

// Mock crypto module for consistent IDs in tests
const mockRandomUUID = jest.fn().mockReturnValue('eEUxh8XdGF1RsxfmwHPpYD');
const cryptoSpy = spyOn(crypto, 'randomUUID').mockImplementation(mockRandomUUID);

// Function to reset all mocks
const resetAllMocks = () => {
    // Clear all function mocks
    jest.clearAllMocks();

    // Reset crypto mock
    mockRandomUUID.mockClear();
    mockRandomUUID.mockReturnValue('eEUxh8XdGF1RsxfmwHPpYD');
    cryptoSpy.mockImplementation(mockRandomUUID);
};

// Export mocks for test files to use
export {
    mockRandomUUID,
    mockLogger,
    loggerInfoSpy,
    loggerWarnSpy,
    loggerErrorSpy,
    loggerDebugSpy,
    resetAllMocks
};

// Re-export jest for convenience
export { jest };
