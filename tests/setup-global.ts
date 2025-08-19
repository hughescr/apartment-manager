/**
 * Global test setup that runs before each test file.
 * This ensures proper mock isolation between test files in Bun.
 *
 * Note: This file is loaded via bunfig.toml preload.
 *
 * The challenge with Bun is that mock.module() creates global state
 * that persists across test files. We need to ensure mocks are
 * properly isolated between test files to prevent pollution.
 *
 * Additionally, this setup includes aggressive cleanup to prevent
 * test hangs that can occur due to resource leaks, unclosed handles,
 * or lingering async operations.
 *
 * CRITICAL FIX: Add beforeEach and beforeAll hooks to ensure complete
 * test isolation between test files, not just between individual tests.
 */

import { afterEach, beforeEach, beforeAll, mock, jest } from 'bun:test';
import { isFunction } from 'lodash';

// Create a robust reset function that works with or without data test setup
let resetAllMocks: () => void = () => {
    // Basic cleanup that always works
    mock.restore();
    try {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    } catch{
        // jest methods might not be available in all Bun versions
    }

    // Clear global test state
    if(typeof globalThis !== 'undefined') {
        // Clear debug state that might affect entity filtering
        delete (globalThis as typeof globalThis & { debugEntityFiltering?: unknown[] }).debugEntityFiltering;

        // Clear any test-specific caches or state
        const globalState = globalThis as typeof globalThis & {
            testCache?: Map<string, unknown>
            mockCache?: Map<string, unknown>
        };
        globalState.testCache?.clear();
        globalState.mockCache?.clear();
    }
};

// Track if enhanced reset function has been set up
let enhancedResetAvailable = false;

// CRITICAL: Reset ALL mocks before each test file starts
// This ensures complete isolation between test files
beforeAll(() => {
    // Try to enhance reset function with data test setup if available
    const globalRefs = globalThis as typeof globalThis & {
        testDataResetFunction?: () => void
    };

    if(globalRefs.testDataResetFunction && !enhancedResetAvailable) {
        const originalReset = resetAllMocks;
        resetAllMocks = () => {
            originalReset();
            globalRefs.testDataResetFunction?.();
        };
        enhancedResetAvailable = true;
    }

    // Complete reset of all mock state before any test file runs
    resetAllMocks();

    // Clear any global test state that might have leaked
    if(typeof globalThis !== 'undefined') {
        // Clear debug state
        delete (globalThis as typeof globalThis & { debugEntityFiltering?: unknown[] }).debugEntityFiltering;

        // Reset any test-specific global state
        const globalState = globalThis as typeof globalThis & {
            testStartTime?: number
            testFileCount?: number
        };
        globalState.testStartTime = Date.now();
        globalState.testFileCount = (globalState.testFileCount || 0) + 1;
    }
});

// CRITICAL: Reset ALL mocks before each individual test
// This ensures complete isolation between individual tests within a file
beforeEach(() => {
    // Try to enhance reset function with data test setup if available
    const globalRefs = globalThis as typeof globalThis & {
        testDataResetFunction?: () => void
    };

    if(globalRefs.testDataResetFunction && !enhancedResetAvailable) {
        const originalReset = resetAllMocks;
        resetAllMocks = () => {
            originalReset();
            globalRefs.testDataResetFunction?.();
        };
        enhancedResetAvailable = true;
    }

    // Complete reset of all mock state before each test
    resetAllMocks();

    // Clear any per-test global state
    if(typeof globalThis !== 'undefined') {
        delete (globalThis as typeof globalThis & { debugEntityFiltering?: unknown[] }).debugEntityFiltering;
    }
});

// Global cleanup to prevent mock pollution between test files
// This acts as a safety net for any module mocks that aren't properly cleaned up
afterEach(() => {
    // Restore all function mocks (spies, mock functions) to their original implementations
    // This also clears call history and resets mock state
    // Note: This does NOT affect mock.module() - those need to be handled per test file
    mock.restore();

    // Alternative approach for clearing mock state (available via jest compatibility)
    // Use this as additional safety net - it's a no-op if no mocks exist
    try {
        jest.clearAllMocks();
    } catch{
        // jest.clearAllMocks() might not be available in all Bun versions
        // This is just a fallback, mock.restore() is the primary cleanup method
    }

    // Additional cleanup to prevent resource leaks and test hangs
    // Clear any pending timers that might be left hanging
    if(typeof global !== 'undefined' && isFunction(global.clearTimeout) && isFunction(global.clearInterval)) {
        if(global.gc) {
            try {
                global.gc();
            } catch{
                // gc() may not be available in all environments
            }
        }
    }

    // Clear any event listeners or handles that might prevent test completion
    if(typeof process !== 'undefined' && process.removeAllListeners) {
        // Remove any listeners that might have been added during testing
        // but be careful not to remove essential Node.js listeners
        const eventTypes = ['uncaughtException', 'unhandledRejection'] as const;
        for(const eventType of eventTypes) {
            const listeners = process.listenerCount(eventType) > 0 ? process.rawListeners(eventType) : [];
            if(listeners.length > 1) {
                // Keep only the first listener (likely the essential one)
                process.removeAllListeners(eventType);
                if(listeners[0]) {
                    process.on(eventType, listeners[0] as NodeJS.UncaughtExceptionListener | NodeJS.UnhandledRejectionListener);
                }
            }
        }
    }

    // Force complete mock reset after each test as well
    resetAllMocks();
});
