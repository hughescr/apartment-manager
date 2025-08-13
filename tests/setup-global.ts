/**
 * Global test setup that runs before each test file.
 * This ensures proper mock isolation between test files in Bun.
 *
 * Note: This file is loaded via bunfig.toml preload.
 *
 * The challenge with Bun is that mock.module() creates global state
 * that persists across test files. We need to ensure mocks are
 * properly isolated between test files to prevent pollution.
 */

import { afterEach, mock, jest } from 'bun:test';

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
});
