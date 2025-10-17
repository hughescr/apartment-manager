/**
 * Test setup for BuildingApiService tests
 * Provides mocking utilities and test data factories
 */
import { jest } from 'bun:test';

// Set test environment
process.env.BUN_ENV = 'test';
process.env.SST_STAGE = 'test';

// Mock fetch globally with proper typing
export const mockFetch = jest.fn() as jest.Mock;
global.fetch = mockFetch as unknown as typeof fetch;

// Helper to create mock Response objects
export const createMockResponse = (options: {
    ok:          boolean
    status:      number
    statusText?: string
    json?:       () => Promise<unknown>
    text?:       () => Promise<string>
}) => {
    return {
        ok:          options.ok,
        status:      options.status,
        statusText:  options.statusText ?? '',
        headers:     new Headers(),
        json:        options.json ?? (() => Promise.resolve({})),
        text:        options.text ?? (() => Promise.resolve('')),
        blob:        () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        formData:    () => Promise.resolve(new FormData()),
        clone:       jest.fn(),
        body:        null,
        bodyUsed:    false,
        redirected:  false,
        type:        'default' as ResponseType,
        url:         '',
        bytes:       () => Promise.resolve(new Uint8Array())
    } as Response;
};

// Function to reset all mocks
export const resetAllMocks = () => {
    // Clear all function mocks
    jest.clearAllMocks();

    // Reset fetch mock specifically
    mockFetch.mockClear();
    mockFetch.mockReset();
};

// Re-export jest for convenience
export { jest };
