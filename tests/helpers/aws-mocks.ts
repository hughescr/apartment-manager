import { jest } from 'bun:test';

/**
 * DEPRECATED: This file contains legacy mock functions that use mock.module().
 * These create global state and cause cross-test contamination.
 *
 * Use the centralized test-setup.ts files instead:
 * - tests/data/test-setup.ts for data layer tests
 * - tests/api/test-setup.ts for API tests
 *
 * If you need test-specific mocking, use spyOn or dependency injection patterns.
 */

/**
 * Mock factory for crypto.randomUUID that can be used in individual tests
 * without global module mocking.
 */
export function createMockRandomUUID(returnValue = 'test-uuid') {
    return jest.fn().mockReturnValue(returnValue);
}

/**
 * Mock factory for S3 request presigner that can be used in individual tests
 * without global module mocking.
 */
export function createMockGetSignedUrl(returnValue = 'https://presigned-url.example.com') {
    return jest.fn().mockResolvedValue(returnValue);
}

/**
 * Utility to create a mock AWS client send function with customizable responses
 */
export function createMockSendFunction(defaultResponse = {}) {
    return jest.fn().mockImplementation(() => Promise.resolve(defaultResponse));
}

/**
 * LEGACY INTERFACES - Kept for backward compatibility
 * DO NOT USE THESE IN NEW TESTS
 */
interface MockSendFunction {
    (...args: unknown[]): Promise<unknown>
    mock: {
        calls:   unknown[][]
        results: unknown[]
        mockClear(): void
        mockResolvedValue(value: unknown): void
        mockRejectedValue(error: unknown): void
    }
}

export interface DynamoDBMocks {
    mockSend:               MockSendFunction
    DynamoDBDocumentClient: unknown
    GetCommand:             unknown
    PutCommand:             unknown
    QueryCommand:           unknown
    UpdateCommand:          unknown
    DeleteCommand:          unknown
    BatchWriteCommand:      unknown
    BatchGetCommand:        unknown
    ScanCommand:            unknown
    TransactGetCommand:     unknown
    TransactWriteCommand:   unknown
}

export interface S3Mocks {
    mockSend:            MockSendFunction
    S3Client:            unknown
    PutObjectCommand:    unknown
    DeleteObjectCommand: unknown
    GetObjectCommand:    unknown
}

/**
 * DEPRECATED: Use centralized test-setup.ts instead
 *
 * This function uses mock.module() which creates global state that persists
 * across all tests, causing contamination. The proper approach is to use
 * the centralized mocks in test-setup.ts files.
 *
 * @deprecated Use tests/data/test-setup.ts or tests/api/test-setup.ts
 */
export function mockDynamoDB(): DynamoDBMocks {
    throw new Error(
        'mockDynamoDB() is deprecated due to cross-test contamination. '
        + 'Use centralized test-setup.ts files instead. '
        + 'Import "./test-setup" or "../data/test-setup" at the top of your test file.'
    );
}

/**
 * DEPRECATED: Use centralized test-setup.ts instead
 *
 * This function uses mock.module() which creates global state that persists
 * across all tests, causing contamination. The proper approach is to use
 * the centralized mocks in test-setup.ts files.
 *
 * @deprecated Use tests/data/test-setup.ts or tests/api/test-setup.ts
 */
export function mockS3(): S3Mocks {
    throw new Error(
        'mockS3() is deprecated due to cross-test contamination. '
        + 'Use centralized test-setup.ts files instead. '
        + 'Import "./test-setup" or "../data/test-setup" at the TOP of your test file.'
    );
}

/**
 * DEPRECATED: Use spyOn pattern instead
 *
 * This function uses mock.module() which creates global state that can cause
 * cross-test contamination. For crypto mocking, use dependency injection or
 * spy on the crypto module in individual tests.
 *
 * @deprecated Use jest.spyOn(crypto, 'randomUUID') in individual tests
 */
export function mockCrypto() {
    throw new Error(
        'mockCrypto() is deprecated due to cross-test contamination. '
        + 'Use jest.spyOn(crypto, "randomUUID") in your test setup instead, '
        + 'or use the createMockRandomUUID() helper for dependency injection.'
    );
}

/**
 * DEPRECATED: Use spyOn pattern instead
 *
 * This function uses mock.module() which creates global state that can cause
 * cross-test contamination. For S3 presigner mocking, use dependency injection
 * or spy on the module in individual tests.
 *
 * @deprecated Use jest.spyOn or dependency injection patterns
 */
export function mockS3RequestPresigner() {
    throw new Error(
        'mockS3RequestPresigner() is deprecated due to cross-test contamination. '
        + 'Use jest.spyOn on the getSignedUrl import in your test, '
        + 'or use the createMockGetSignedUrl() helper for dependency injection.'
    );
}
