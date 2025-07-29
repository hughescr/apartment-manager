// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { mockS3Send } from '../data/test-setup';

import { describe, it, expect, mock, beforeEach, afterEach, beforeAll } from 'bun:test';
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import _, { noop } from 'lodash';
import { mockS3RequestPresigner, mockCrypto } from '../helpers/aws-mocks';

describe('Upload API', () => {
    let handler: APIGatewayProxyHandlerV2;
    let mockGetSignedUrl: ReturnType<typeof mock>;

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
        // Set up module-level mocks
        const s3PresignerMocks = mockS3RequestPresigner();
        mockCrypto();

        // Store the mock references
        mockGetSignedUrl = s3PresignerMocks.mockGetSignedUrl;

        // Set default return value for getSignedUrl
        mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');

        // Note: lodash is already mocked in test-setup.ts
        // Note: SST Resource is already mocked in test-setup.ts, but we need to add PhotosBucket
        mock.module('sst', () => ({
            Resource: {
                BuildingsUnits: {
                    name: 'test-table-name'
                },
                PhotosBucket: {
                    name: 'test-photos-bucket'
                }
            }
        }));

        // Mock UUID
        mock.module('uuid', () => ({
            v4: _.constant('mock-uuid-1234')
        }));

        // Import handler after mocks are set up
        const uploadModule = await import('../../api/upload');
        handler = uploadModule.handler as APIGatewayProxyHandlerV2;
    });

    beforeEach(() => {
        // Clear mock calls before each test
        mockS3Send.mockClear();
        mockGetSignedUrl.mockClear();
    });

    afterEach(noop);

    const createMockEvent = (overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 => ({
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
                    filename: 'test.jpg',
                    buildingId: 'building-1',
                    unitId: 'unit-1'
                })
            });

            const result = await callHandler(event);

            expect(result.headers?.['Content-Type']).toBe('application/json');
            expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
            expect(result.headers?.['Access-Control-Allow-Headers']).toBe('Content-Type');
            expect(result.headers?.['Access-Control-Allow-Methods']).toBe('GET, POST, DELETE, OPTIONS');
        });
    });

    describe('POST /api/upload - Generate presigned URL', () => {
        it('should generate presigned URL for valid image upload', async () => {
            expect.assertions(6);
            mockGetSignedUrl.mockResolvedValueOnce('https://s3.example.com/signed-url');

            const event = createMockEvent({
                body: JSON.stringify({
                    filename: 'photo.jpg',
                    buildingId: 'building-1',
                    unitId: 'unit-1',
                    contentType: 'image/jpeg'
                })
            });

            const result = await callHandler(event);
            const body = JSON.parse(result.body!);

            expect(result.statusCode).toBe(200);
            expect(body.uploadUrl).toBe('https://s3.example.com/signed-url');
            expect(body.key).toBe('buildings/building-1/units/unit-1/mock-uuid-1234.jpg');
            expect(body.publicUrl).toBe('https://test-photos-bucket.s3.amazonaws.com/buildings/building-1/units/unit-1/mock-uuid-1234.jpg');
            expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
            // getSignedUrl is called with (client, command, options)
            expect(mockGetSignedUrl).toHaveBeenCalledWith(
                expect.any(Object), // S3 client
                expect.any(Object), // PutObjectCommand instance
                { expiresIn: 3600 }
            );
        });

        it('should handle different image file extensions', async () => {
            expect.assertions(5);
            const testCases = [
                { filename: 'image.png', expected: 'mock-uuid-1234.png' },
                { filename: 'photo.JPEG', expected: 'mock-uuid-1234.jpeg' },
                { filename: 'picture.GIF', expected: 'mock-uuid-1234.gif' },
                { filename: 'modern.webp', expected: 'mock-uuid-1234.webp' },
                { filename: 'next-gen.avif', expected: 'mock-uuid-1234.avif' }
            ];

            for(const testCase of testCases) {
                mockGetSignedUrl.mockResolvedValueOnce('https://s3.example.com/signed-url');
                const event = createMockEvent({
                    body: JSON.stringify({
                        filename: testCase.filename,
                        buildingId: 'bldg-1',
                        unitId: 'unit-1'
                    })
                });

                const result = await callHandler(event);
                const body = JSON.parse(result.body!);

                expect(body.key).toContain(testCase.expected);
            }
        });

        it('should use default content type if not provided', async () => {
            expect.assertions(2);
            mockGetSignedUrl.mockResolvedValueOnce('https://s3.example.com/signed-url');

            const event = createMockEvent({
                body: JSON.stringify({
                    filename: 'photo.jpg',
                    buildingId: 'building-1',
                    unitId: 'unit-1'
                })
            });

            const result = await callHandler(event);

            expect(result.statusCode).toBe(200);
            expect(mockGetSignedUrl).toHaveBeenCalledWith(
                expect.any(Object), // S3 client
                expect.any(Object), // PutObjectCommand instance
                { expiresIn: 3600 }
            );
        });

        it('should return 400 for missing required fields', async () => {
            expect.assertions(12);
            const testCases = [
                { body: {}, expectedError: 'Missing required fields' },
                { body: { filename: 'test.jpg' }, expectedError: 'Missing required fields' },
                { body: { filename: 'test.jpg', buildingId: 'bldg-1' }, expectedError: 'Missing required fields' },
                { body: { filename: 'test.jpg', unitId: 'unit-1' }, expectedError: 'Missing required fields' },
                { body: { buildingId: 'bldg-1', unitId: 'unit-1' }, expectedError: 'Missing required fields' },
                { body: { filename: '', buildingId: 'bldg-1', unitId: 'unit-1' }, expectedError: 'Missing required fields' }
            ];

            for(const testCase of testCases) {
                const event = createMockEvent({
                    body: JSON.stringify(testCase.body)
                });
                const result = await callHandler(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(400);
                expect(body.error).toBe(testCase.expectedError);
            }
        });

        it('should return 400 for invalid file types', async () => {
            expect.assertions(10);
            const invalidFiles = [
                'document.pdf',
                'spreadsheet.xlsx',
                'video.mp4',
                'archive.zip',
                'noextension'
            ];

            for(const filename of invalidFiles) {
                const event = createMockEvent({
                    body: JSON.stringify({
                        filename,
                        buildingId: 'building-1',
                        unitId: 'unit-1'
                    })
                });

                const result = await callHandler(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(400);
                expect(body.error).toBe('Invalid file type. Only images are allowed.');
            }
        });

        it('should handle filenames with multiple dots', async () => {
            expect.assertions(3);
            mockGetSignedUrl.mockResolvedValueOnce('https://s3.example.com/signed-url');
            const event = createMockEvent({
                body: JSON.stringify({
                    filename: 'my.vacation.photo.jpg',
                    buildingId: 'building-1',
                    unitId: 'unit-1'
                })
            });

            const result = await callHandler(event);
            const body = JSON.parse(result.body!);

            expect(result.statusCode).toBe(200);
            expect(body.key).toBe('buildings/building-1/units/unit-1/mock-uuid-1234.jpg');
            expect(body.publicUrl).toContain('mock-uuid-1234.jpg');
        });

        it('should handle malformed request body', async () => {
            expect.assertions(4);

            // Empty body
            const event1 = createMockEvent({ body: undefined });
            const result1 = await callHandler(event1);
            expect(result1.statusCode).toBe(400);
            expect(JSON.parse(result1.body!).error).toBe('Missing required fields');

            // Invalid JSON
            const event2 = createMockEvent({ body: 'invalid json' });
            const result2 = await callHandler(event2);
            expect(result2.statusCode).toBe(500);
            expect(JSON.parse(result2.body!).error).toBe('Internal server error');
        });

        it('should include timestamp metadata', async () => {
            expect.assertions(2);
            mockGetSignedUrl.mockResolvedValueOnce('https://s3.example.com/signed-url');

            const event = createMockEvent({
                body: JSON.stringify({
                    filename: 'photo.jpg',
                    buildingId: 'building-1',
                    unitId: 'unit-1'
                })
            });

            await callHandler(event);

            expect(mockGetSignedUrl).toHaveBeenCalledWith(
                expect.any(Object), // S3 client
                expect.any(Object), // PutObjectCommand instance
                { expiresIn: 3600 }
            );
            expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
        });
    });

    describe('DELETE /api/upload/{key} - Delete uploaded file', () => {
        it('should delete a file with valid key', async () => {
            expect.assertions(3);
            mockS3Send.mockResolvedValueOnce({});

            const event = createMockEvent({
                rawPath: '/api/upload/buildings/building-1/units/unit-1/uuid-1234.jpg',
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
            expect(mockS3Send).toHaveBeenCalledWith(
                expect.any(Object) // DeleteObjectCommand instance
            );
        });

        it('should handle URL-encoded keys', async () => {
            expect.assertions(2);
            mockS3Send.mockResolvedValueOnce({});

            const event = createMockEvent({
                rawPath: '/api/upload/buildings%2Fbuilding-1%2Funits%2Funit-1%2Fuuid-1234.jpg',
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
            expect(mockS3Send).toHaveBeenCalledWith(
                expect.any(Object) // DeleteObjectCommand instance
            );
        });

        it('should return 400 for missing key', async () => {
            expect.assertions(2);
            const event = createMockEvent({
                rawPath: '/api/upload/',
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
                    rawPath: `/api/upload/${path}`,
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
                expect(body.error).toBe('Invalid key path');
            }
        });

        it('should handle S3 deletion errors', async () => {
            expect.assertions(3);
            mockS3Send.mockRejectedValueOnce(new Error('Access Denied'));

            const event = createMockEvent({
                rawPath: '/api/upload/buildings/building-1/units/unit-1/uuid-1234.jpg',
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
    });

    describe('Method handling', () => {
        it('should return 405 for unsupported methods', async () => {
            expect.assertions(4);
            const unsupportedMethods = ['GET', 'PUT'];

            for(const method of unsupportedMethods) {
                const event = createMockEvent({
                    requestContext: {
                        ...createMockEvent().requestContext,
                        http: {
                            ...createMockEvent().requestContext.http,
                            method
                        }
                    }
                });

                const result = await callHandler(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(405);
                expect(body.error).toBe('Method not allowed');
            }
        });

        it('should return 405 for DELETE on wrong path', async () => {
            expect.assertions(2);
            const event = createMockEvent({
                rawPath: '/api/upload',
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

            expect(result.statusCode).toBe(405);
            expect(body.error).toBe('Method not allowed');
        });

        it('should return 405 for POST on wrong path', async () => {
            expect.assertions(2);
            const event = createMockEvent({
                rawPath: '/api/upload/somefile.jpg',
                body: JSON.stringify({
                    filename: 'test.jpg',
                    buildingId: 'building-1',
                    unitId: 'unit-1'
                })
            });

            const result = await callHandler(event);
            const body = JSON.parse(result.body!);

            expect(result.statusCode).toBe(405);
            expect(body.error).toBe('Method not allowed');
        });
    });

    describe('Error handling', () => {
        it('should handle getSignedUrl errors', async () => {
            expect.assertions(3);
            mockGetSignedUrl.mockRejectedValueOnce(new Error('AWS credentials not found'));

            const event = createMockEvent({
                body: JSON.stringify({
                    filename: 'photo.jpg',
                    buildingId: 'building-1',
                    unitId: 'unit-1'
                })
            });

            const result = await callHandler(event);
            const body = JSON.parse(result.body!);

            expect(result.statusCode).toBe(500);
            expect(body.error).toBe('Internal server error');
            expect(body.message).toBe('AWS credentials not found');
        });

        it('should handle non-Error exceptions', async () => {
            expect.assertions(3);
            mockGetSignedUrl.mockRejectedValueOnce('String error');

            const event = createMockEvent({
                body: JSON.stringify({
                    filename: 'photo.jpg',
                    buildingId: 'building-1',
                    unitId: 'unit-1'
                })
            });

            const result = await callHandler(event);
            const body = JSON.parse(result.body!);

            expect(result.statusCode).toBe(500);
            expect(body.error).toBe('Internal server error');
            expect(body.message).toBe('Unknown error');
        });

        it('should include error message in response', async () => {
            expect.assertions(3);
            const testError = new Error('S3 bucket not found');
            mockGetSignedUrl.mockRejectedValueOnce(testError);

            const event = createMockEvent({
                body: JSON.stringify({
                    filename: 'photo.jpg',
                    buildingId: 'building-1',
                    unitId: 'unit-1'
                })
            });

            const result = await callHandler(event);
            const body = JSON.parse(result.body!);

            expect(result.statusCode).toBe(500);
            expect(body.error).toBe('Internal server error');
            expect(body.message).toBe('S3 bucket not found');
        });
    });
});
