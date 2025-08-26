/**
 * Shared test helpers for Upload API test suites
 * This file provides common utilities to reduce duplication across split test files
 */

import { expect } from 'bun:test';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

/**
 * Helper to ensure handler result is not void and is structured
 * This function provides type safety for Lambda handler responses
 */
export const callHandler = async (
    handler: (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyStructuredResultV2 | string | void>,
    event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
    const result = await handler(event);
    if(!result) {
        throw new Error('Handler returned void');
    }
    // Type assertion is safe here because the handler always returns structured results
    return result as APIGatewayProxyStructuredResultV2;
};

/**
 * Creates a mock API Gateway event with sensible defaults
 * @param overrides - Properties to override in the mock event
 * @returns Complete APIGatewayProxyEventV2 object
 */
export const createMockEvent = (overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 => ({
    headers: {},
    isBase64Encoded: false,
    rawPath: '/api/upload',
    rawQueryString: '',
    requestContext: {
        accountId: 'test-account',
        apiId: 'test-api',
        domainName: 'test.com',
        domainPrefix: 'test',
        http: {
            method: 'POST',
            path: '/api/upload',
            protocol: 'HTTP/1.1',
            sourceIp: '127.0.0.1',
            userAgent: 'test-agent',
        },
        requestId: 'test-request-id',
        routeKey: 'POST /api/upload',
        stage: 'test',
        time: '01/Jan/2024:00:00:00 +0000',
        timeEpoch: 1704067200000,
    },
    routeKey: 'POST /api/upload',
    version: '2.0',
    ...overrides,
});

/**
 * Creates a DELETE request event for the given key path
 * @param keyPath - The S3 key path to delete
 * @returns APIGatewayProxyEventV2 configured for DELETE operation
 */
export const createDeleteEvent = (keyPath: string): APIGatewayProxyEventV2 => createMockEvent({
    rawPath: `/api/upload/${keyPath}`,
    requestContext: {
        ...createMockEvent().requestContext,
        http: {
            ...createMockEvent().requestContext.http,
            method: 'DELETE'
        }
    }
});

/**
 * Creates an OPTIONS preflight request event
 * @returns APIGatewayProxyEventV2 configured for OPTIONS method
 */
export const createOptionsEvent = (): APIGatewayProxyEventV2 => createMockEvent({
    requestContext: {
        ...createMockEvent().requestContext,
        http: {
            ...createMockEvent().requestContext.http,
            method: 'OPTIONS'
        }
    }
});

/**
 * Creates a POST upload request event with the given payload
 * @param payload - Request body payload to stringify
 * @returns APIGatewayProxyEventV2 configured for POST upload
 */
export const createUploadEvent = (payload: Record<string, unknown>): APIGatewayProxyEventV2 => createMockEvent({
    body: JSON.stringify(payload)
});

/**
 * Standard test data constants
 */
export const TEST_DATA = {
    BUILDING_ID: 'gSPgoPTdFcPqdeCYMBZMzy',
    UNIT_ID: 'unit-1',
    VALID_FILENAME: 'photo.jpg',
    SIGNED_URL: 'https://s3.example.com/signed-url',
    UUID: 'test-uuid',
    BUCKET_NAME: 'test-photos-bucket'
} as const;

/**
 * Common test expectations for CORS headers
 */
export const expectCorsHeaders = (headers: Record<string, string> | undefined) => {
    expect(headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(headers?.['Access-Control-Allow-Headers']).toBe('Content-Type');
    expect(headers?.['Access-Control-Allow-Methods']).toBe('GET, POST, DELETE, OPTIONS');
};

/**
 * Common assertion for successful upload response structure
 */
export const expectSuccessfulUploadResponse = (
    result: APIGatewayProxyStructuredResultV2,
    expectedKey: string,
    expectedPublicUrl: string
) => {
    const body = JSON.parse(result.body!);

    expect(result.statusCode).toBe(200);
    expect(body.uploadUrl).toBe(TEST_DATA.SIGNED_URL);
    expect(body.key).toBe(expectedKey);
    expect(body.publicUrl).toBe(expectedPublicUrl);
};

/**
 * Common assertion for error responses
 */
export const expectErrorResponse = (
    result: APIGatewayProxyStructuredResultV2,
    expectedStatus: number,
    expectedError: string
) => {
    const body = JSON.parse(result.body!);

    expect(result.statusCode).toBe(expectedStatus);
    expect(body.error).toBe(expectedError);
};
