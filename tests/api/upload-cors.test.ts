// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { resetAllMocks } from '../data/test-setup';

import { describe, it, expect, beforeEach, afterEach, beforeAll, jest } from 'bun:test';
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

describe('Upload API - CORS Configuration', () => {
    let handler: APIGatewayProxyHandlerV2;
    let mockGetSignedUrl: jest.Mock;
    let mockRandomUUID: jest.Mock;
    let s3Mock: jest.Mock;

    // Helper to ensure handler result is not void and is structured
    const callHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
        const result = await (handler as (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyStructuredResultV2 | string | void>)(event);
        if(!result) {
            throw new Error('Handler returned void');
        }
        // Type assertion is safe here because the handler always returns structured results
        return result as APIGatewayProxyStructuredResultV2;
    };

    beforeAll(async () => {
        resetAllMocks();

        // Import test wrapper instead of original upload module to avoid SST Resource issues
        const uploadModule = await import('./upload-test-wrapper');
        handler = uploadModule.handler;

        // Get references to mocked functions from the test wrapper
        mockGetSignedUrl = uploadModule.mockGetSignedUrl;
        mockRandomUUID = uploadModule.mockRandomUUID;
        s3Mock = uploadModule.s3Client.send as jest.Mock;

        // Set default return values for centralized mocks
        mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');
        mockRandomUUID.mockReturnValue('test-uuid');
    });

    beforeEach(() => {
        // Clear mock calls before each test
        s3Mock.mockClear();
        mockGetSignedUrl.mockClear();
        mockRandomUUID.mockClear();
    });

    afterEach(() => {
        // Reset mocks to their default implementations
        mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');
        mockRandomUUID.mockReturnValue('test-uuid');
    });

    const createMockEvent = (overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 => ({
        headers:         {},
        isBase64Encoded: false,
        rawPath:         '/api/upload',
        rawQueryString:  '',
        requestContext:  {
            accountId:    'test-account',
            apiId:        'test-api',
            domainName:   'test.com',
            domainPrefix: 'test',
            http:         {
                method:    'POST',
                path:      '/api/upload',
                protocol:  'HTTP/1.1',
                sourceIp:  '127.0.0.1',
                userAgent: 'test-agent',
            },
            requestId: 'test-request-id',
            routeKey:  'POST /api/upload',
            stage:     'test',
            time:      '01/Jan/2024:00:00:00 +0000',
            timeEpoch: 1704067200000,
        },
        routeKey: 'POST /api/upload',
        version:  '2.0',
        ...overrides,
    });

    describe('CORS handling', () => {
        it('should handle OPTIONS preflight request', async () => {
            expect.assertions(5);
            const event = createMockEvent({
                requestContext: {
                    ...createMockEvent().requestContext,
                    http: {
                        ...createMockEvent().requestContext.http,
                        method: 'OPTIONS'
                    }
                }
            });

            const result = await callHandler(event);

            expect(result.statusCode).toBe(200);
            expect(result.body).toBe('');
            expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
            expect(result.headers?.['Access-Control-Allow-Headers']).toBe('Content-Type');
            expect(result.headers?.['Access-Control-Allow-Methods']).toBe('GET, POST, DELETE, OPTIONS');
        });

        it('should include CORS headers in all responses', async () => {
            expect.assertions(4);
            mockGetSignedUrl.mockResolvedValueOnce('https://s3.example.com/signed-url');

            const event = createMockEvent({
                body: JSON.stringify({
                    filename:   'test.jpg',
                    buildingId: 'gSPgoPTdFcPqdeCYMBZMzy',
                    unitId:     'unit-1'
                })
            });

            const result = await callHandler(event);

            expect(result.headers?.['Content-Type']).toBe('application/json');
            expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
            expect(result.headers?.['Access-Control-Allow-Headers']).toBe('Content-Type');
            expect(result.headers?.['Access-Control-Allow-Methods']).toBe('GET, POST, DELETE, OPTIONS');
        });
    });
});
