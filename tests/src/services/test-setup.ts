/**
 * Test setup file for services tests.
 * Uses jest.fn() and spyOn patterns instead of mock.module() to avoid Bun's global state issues.
 * This file sets up mocking for p-debounce and p-throttle to bypass delays in tests.
 */
import { jest, spyOn } from 'bun:test';
// Removed p-debounce/p-throttle imports - using fake timers approach instead

// Set test environment
process.env.SST_STAGE = 'test';

// Import the actual logger to spy on it
import { logger } from '@hughescr/logger';

// Create spies on the actual logger methods
const loggerInfoSpy = spyOn(logger, 'info');
const loggerWarnSpy = spyOn(logger, 'warn');
const loggerErrorSpy = spyOn(logger, 'error');
const loggerDebugSpy = spyOn(logger, 'debug');

// Mock logger implementation (for backward compatibility)
const mockLogger = {
    info: loggerInfoSpy,
    warn: loggerWarnSpy,
    error: loggerErrorSpy,
    debug: loggerDebugSpy
};

// Mock fetch globally with proper typing
export const mockFetch = jest.fn() as jest.Mock;
global.fetch = mockFetch as unknown as typeof fetch;

// Helper to create mock Response objects
export const createMockResponse = (options: {
    ok: boolean
    status: number
    statusText?: string
    json?: () => Promise<unknown>
    text?: () => Promise<string>
}) => {
    return {
        ok: options.ok,
        status: options.status,
        statusText: options.statusText || '',
        headers: new Headers(),
        json: options.json || (() => Promise.resolve({})),
        text: options.text || (() => Promise.resolve('')),
        blob: () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        formData: () => Promise.resolve(new FormData()),
        clone: jest.fn(),
        body: null,
        bodyUsed: false,
        redirected: false,
        type: 'default' as ResponseType,
        url: '',
        bytes: () => Promise.resolve(new Uint8Array())
    } as Response;
};

// Note: p-debounce and p-throttle mocking removed
// Tests should use fake timers (jest.useFakeTimers()) to control timing instead
// This approach works properly in Bun without module mocking pollution

// Module mocking variables removed - use fake timers instead

// setupModuleMocks removed - was causing test pollution
// Use jest.useFakeTimers() in individual tests to control timing instead

// cleanupModuleMocks removed - was not working properly in Bun
// Tests should use jest.useRealTimers() to restore timing if needed

// Function to reset all mocks
const resetAllMocks = () => {
    // Clear all function mocks
    jest.clearAllMocks();

    // Reset fetch mock - use both clear and reset for complete cleanup
    mockFetch.mockClear();
    mockFetch.mockReset();

    // Module mocks removed - no cleanup needed

    // Reset logger mocks
    loggerInfoSpy.mockClear();
    loggerWarnSpy.mockClear();
    loggerErrorSpy.mockClear();
    loggerDebugSpy.mockClear();
};

// Export mocks and utilities
export {
    mockLogger,
    loggerInfoSpy,
    loggerWarnSpy,
    loggerErrorSpy,
    loggerDebugSpy,
    resetAllMocks
};

// Re-export jest for convenience
export { jest };
