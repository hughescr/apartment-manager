// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { resetAllMocks } from '../data/test-setup';

import { describe, it, expect, beforeEach, afterEach, beforeAll, jest } from 'bun:test';
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

describe('Upload API - Delete Functionality', () => {
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

    describe('DELETE /api/upload/{key} - Delete uploaded file', () => {
        it('should delete a file with valid key', async () => {
            expect.assertions(3);
            s3Mock.mockResolvedValueOnce({});

            const event = createMockEvent({
                rawPath:        '/api/upload/buildings/gSPgoPTdFcPqdeCYMBZMzy/units/unit-1/uuid-1234.jpg',
                requestContext: {
                    ...createMockEvent().requestContext,
                    http: {
                        ...createMockEvent().requestContext.http,
                        method: 'DELETE'
                    }
                }
            });

            const result = await callHandler(event);
            const body = JSON.parse(result.body!);

            expect(result.statusCode).toBe(200);
            expect(body.success).toBe(true);
            expect(s3Mock).toHaveBeenCalledWith(
                expect.any(Object) // DeleteObjectCommand instance
            );
        });

        it('should handle URL-encoded keys', async () => {
            expect.assertions(2);
            s3Mock.mockResolvedValueOnce({});

            const event = createMockEvent({
                rawPath:        '/api/upload/buildings%2Fbuilding-1%2Funits%2Funit-1%2Fuuid-1234.jpg',
                requestContext: {
                    ...createMockEvent().requestContext,
                    http: {
                        ...createMockEvent().requestContext.http,
                        method: 'DELETE'
                    }
                }
            });

            const result = await callHandler(event);

            expect(result.statusCode).toBe(200);
            expect(s3Mock).toHaveBeenCalledWith(
                expect.any(Object) // DeleteObjectCommand instance
            );
        });

        it('should return 400 for missing key', async () => {
            expect.assertions(2);
            const event = createMockEvent({
                rawPath:        '/api/upload/',
                requestContext: {
                    ...createMockEvent().requestContext,
                    http: {
                        ...createMockEvent().requestContext.http,
                        method: 'DELETE'
                    }
                }
            });
            const result = await callHandler(event);
            const body = JSON.parse(result.body!);

            expect(result.statusCode).toBe(400);
            expect(body.error).toBe('Missing key parameter');
        });

        it('should return 403 for invalid key paths', async () => {
            expect.assertions(6);
            const invalidPaths = [
                '../../../etc/passwd',
                'etc/passwd',
                '/etc/passwd'
            ];

            for(const path of invalidPaths) {
                const event = createMockEvent({
                    rawPath:        `/api/upload/${path}`,
                    requestContext: {
                        ...createMockEvent().requestContext,
                        http: {
                            ...createMockEvent().requestContext.http,
                            method: 'DELETE'
                        }
                    }
                });

                const result = await callHandler(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(403);
                expect(body.error).toBe('Forbidden');
            }
        });

        it('should handle S3 deletion errors', async () => {
            expect.assertions(3);
            s3Mock.mockRejectedValueOnce(new Error('Access Denied'));

            const event = createMockEvent({
                rawPath:        '/api/upload/buildings/gSPgoPTdFcPqdeCYMBZMzy/units/unit-1/uuid-1234.jpg',
                requestContext: {
                    ...createMockEvent().requestContext,
                    http: {
                        ...createMockEvent().requestContext.http,
                        method: 'DELETE'
                    }
                }
            });

            const result = await callHandler(event);
            const body = JSON.parse(result.body!);

            expect(result.statusCode).toBe(500);
            expect(body.error).toBe('Internal server error');
            expect(body.message).toBe('Access Denied');
        });

        it('should handle S3 object not found during deletion', async () => {
            expect.assertions(3);
            const notFoundError = new Error('The specified key does not exist.');
            notFoundError.name = 'NoSuchKey';
            Object.defineProperty(notFoundError, 'code', {
                value:      'NoSuchKey',
                enumerable: true
            });
            Object.defineProperty(notFoundError, '$metadata', {
                value:      { httpStatusCode: 404 },
                enumerable: true
            });
            s3Mock.mockRejectedValueOnce(notFoundError);

            const event = createMockEvent({
                rawPath:        '/api/upload/buildings/gSPgoPTdFcPqdeCYMBZMzy/units/unit-1/nonexistent.jpg',
                requestContext: {
                    ...createMockEvent().requestContext,
                    http: {
                        ...createMockEvent().requestContext.http,
                        method: 'DELETE'
                    }
                }
            });

            const result = await callHandler(event);
            const body = JSON.parse(result.body!);

            expect(result.statusCode).toBe(500);
            expect(body.error).toBe('Internal server error');
            expect(body.message).toBe('The specified key does not exist.');
        });

        it('should handle S3 bucket versioning conflicts', async () => {
            expect.assertions(3);
            const versionError = new Error('The request failed due to a conflict with the current state of the resource');
            versionError.name = 'ConflictError';
            Object.defineProperty(versionError, 'code', {
                value:      'Conflict',
                enumerable: true
            });
            Object.defineProperty(versionError, '$metadata', {
                value:      { httpStatusCode: 409 },
                enumerable: true
            });
            s3Mock.mockRejectedValueOnce(versionError);

            const event = createMockEvent({
                rawPath:        '/api/upload/buildings/gSPgoPTdFcPqdeCYMBZMzy/units/unit-1/versioned.jpg',
                requestContext: {
                    ...createMockEvent().requestContext,
                    http: {
                        ...createMockEvent().requestContext.http,
                        method: 'DELETE'
                    }
                }
            });

            const result = await callHandler(event);
            const body = JSON.parse(result.body!);

            expect(result.statusCode).toBe(500);
            expect(body.error).toBe('Internal server error');
            expect(body.message).toBe('The request failed due to a conflict with the current state of the resource');
        });
    });
});
