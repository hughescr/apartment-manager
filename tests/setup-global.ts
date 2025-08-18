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
 */

import { afterEach, mock, jest } from 'bun:test';
import { isFunction } from 'lodash';

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
});
