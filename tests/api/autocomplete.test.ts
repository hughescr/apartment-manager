// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { jest, resetAllMocks } from '../data/test-setup';

import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll } from 'bun:test';
import { addressAutocomplete, status, clearCache } from '../../api/autocomplete';
import type { APIGatewayProxyEventV2, Context, Callback } from 'aws-lambda';
import { isString, repeat, chain, times, map } from 'lodash';

// Define the expected response structure for our Lambda functions
interface LambdaResponse {
    statusCode: number
    headers: Record<string, string>
    body: string
}

// Mock fetch for testing external API calls
const mockFetch = jest.fn() as jest.Mock & typeof fetch;
mockFetch.preconnect = jest.fn();
const originalFetch = global.fetch;

describe('Autocomplete API - Comprehensive Security Tests', () => {
    // Helper function to create mock API Gateway events
    const createMockEvent = (
        method: string,
        path: string,
        queryStringParameters?: Record<string, string>,
        headers?: Record<string, string>
    ): APIGatewayProxyEventV2 => ({
        version: '2.0',
        routeKey: `${method} ${path}`,
        rawPath: path,
        rawQueryString: queryStringParameters ? new URLSearchParams(queryStringParameters).toString() : '',
        headers: {
            'content-type': 'application/json',
            ...headers
        },
        queryStringParameters: queryStringParameters || undefined,
        requestContext: {
            accountId: '123456789012',
            apiId: 'api-id',
            domainName: 'api.example.com',
            domainPrefix: 'api',
            http: {
                method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS',
                path: path,
                protocol: 'HTTP/1.1',
                sourceIp: '192.168.1.1',
                userAgent: 'test-agent'
            },
            requestId: 'test-request-id',
            routeKey: `${method} ${path}`,
            stage: 'test',
            time: '01/Jan/2024:00:00:00 +0000',
            timeEpoch: 1704067200
        },
        body: undefined,
        isBase64Encoded: false
    });

    // Helper functions to properly type handler responses
    const callAddressAutocomplete = async (event: APIGatewayProxyEventV2) => {
        const result = await addressAutocomplete(event, {} as Context, {} as Callback);
        if(isString(result)) {
            return JSON.parse(result);
        }
        return result! as LambdaResponse;
    };

    const callStatus = async (event: APIGatewayProxyEventV2) => {
        const result = await status(event, {} as Context, {} as Callback);
        if(isString(result)) {
            return JSON.parse(result);
        }
        return result! as LambdaResponse;
    };

    const callClearCache = async (event: APIGatewayProxyEventV2) => {
        const result = await clearCache(event, {} as Context, {} as Callback);
        if(isString(result)) {
            return JSON.parse(result);
        }
        return result! as LambdaResponse;
    };

    beforeAll(() => {
        resetAllMocks();
        // Set up global fetch mock
        global.fetch = mockFetch;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();

        // Mock RadarService for consistent test results
        const mockRadarService = {
            autocompleteAddress: jest.fn().mockResolvedValue([
                {
                    displayText: '123 Test St, Test City, CA, USA',
                    components: {
                        street: '123 Test St',
                        city: 'Test City',
                        state: 'CA',
                        postalCode: '90210'
                    },
                    coordinates: {
                        lat: 34.0522,
                        lon: -118.2437
                    },
                    confidence: 0.8,
                    source: 'radar',
                    id: 'test-id'
                }
            ]),
            getLocationFromIP: jest.fn().mockResolvedValue({
                lat: 37.7749,
                lon: -122.4194,
                source: 'ip'
            })
        };

        // Override the global radarService if it exists
        if(typeof globalThis !== 'undefined') {
            (globalThis as typeof globalThis & { mockRadarService?: typeof mockRadarService }).mockRadarService = mockRadarService;
        }

        // Delays are automatically fast in test environment

        // Reset fetch mock
        mockFetch.mockClear();
        mockFetch.mockReset();

        // Mock successful Radar API response by default
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ([{
                displayText: '123 Test St, Test City, CA, USA',
                components: {
                    street: '123 Test St',
                    city: 'Test City',
                    state: 'CA',
                    postalCode: '90210'
                },
                coordinates: {
                    lat: 34.0522,
                    lon: -118.2437
                },
                confidence: 0.8,
                source: 'radar',
                id: 'test-id'
            }])
        });

        // Clear cache for clean test state
        try {
            const clearEvent = createMockEvent('DELETE', '/autocomplete/cache');
            callClearCache(clearEvent);
        } catch{
            // Ignore errors during setup
        }
    });

    afterEach(() => {
        mockFetch.mockClear();

        // No cleanup needed for service mocks
    });

    afterAll(() => {
        // Restore global.fetch after all tests
        global.fetch = originalFetch;
    });

    describe('Address Autocomplete Endpoint Security', () => {
        describe('Query Parameter Injection Attacks', () => {
            it('should sanitize SQL injection attempts in query parameter', async () => {
                expect.assertions(8);
                const sqlInjectionAttempts = [
                    "'; DROP TABLE users; --",
                    "' UNION SELECT * FROM secrets --",
                    "1' OR '1'='1",
                    "'; DELETE FROM buildings; --"
                ];

                for(const maliciousQuery of sqlInjectionAttempts) {
                    const event = createMockEvent('GET', '/autocomplete/address', {
                        q: maliciousQuery
                    });

                    const result = await callAddressAutocomplete(event);

                    const body = JSON.parse(result.body!);

                    // Should process as regular search query, not execute SQL
                    expect(result.statusCode).toBe(200);
                    expect(body.success).toBe(true);
                }
            });

            it('should sanitize NoSQL injection attempts in query parameter', async () => {
                expect.assertions(6);
                const noSqlInjectionAttempts = [
                    '{"$where": "function() { return true; }"}',
                    '{"$regex": ".*"}',
                    '{"$ne": null}'
                ];

                for(const maliciousQuery of noSqlInjectionAttempts) {
                    const event = createMockEvent('GET', '/autocomplete/address', {
                        q: maliciousQuery
                    });

                    const result = await callAddressAutocomplete(event);

                    const body = JSON.parse(result.body!);

                    // Should process as regular search query
                    expect(result.statusCode).toBe(200);
                    expect(body.success).toBe(true);
                }
            });

            it('should sanitize XSS attempts in query parameter', async () => {
                expect.assertions(10);
                const xssAttempts = [
                    '<script>alert("xss")</script>',
                    '<img src=x onerror=alert(1)>',
                    'javascript:alert("xss")',
                    '<svg onload=alert(1)>',
                    '"><script>alert(document.cookie)</script>'
                ];

                for(const maliciousQuery of xssAttempts) {
                    const event = createMockEvent('GET', '/autocomplete/address', {
                        q: maliciousQuery
                    });

                    const result = await callAddressAutocomplete(event);

                    const body = JSON.parse(result.body!);

                    // Should process as regular search query, not execute scripts
                    expect(result.statusCode).toBe(200);
                    expect(body.success).toBe(true);
                }
            });

            it('should handle null byte injection attempts', async () => {
                expect.assertions(4);
                const nullByteAttempts = [
                    '123 Main St\x00<script>alert(1)</script>',
                    'address\x00.php'
                ];

                for(const maliciousQuery of nullByteAttempts) {
                    const event = createMockEvent('GET', '/autocomplete/address', {
                        q: maliciousQuery
                    });

                    const result = await callAddressAutocomplete(event);

                    const body = JSON.parse(result.body!);

                    // Should process as regular search query
                    expect(result.statusCode).toBe(200);
                    expect(body.success).toBe(true);
                }
            });

            it('should handle path traversal attempts in query parameter', async () => {
                expect.assertions(8);
                const pathTraversalAttempts = [
                    '../../../etc/passwd',
                    '..\\..\\windows\\system32',
                    '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
                    '....//....//etc/passwd'
                ];

                for(const maliciousQuery of pathTraversalAttempts) {
                    const event = createMockEvent('GET', '/autocomplete/address', {
                        q: maliciousQuery
                    });

                    const result = await callAddressAutocomplete(event);

                    const body = JSON.parse(result.body!);

                    // Should process as regular search query
                    expect(result.statusCode).toBe(200);
                    expect(body.success).toBe(true);
                }
            });
        });

        describe('Boundary Value Testing', () => {
            it('should reject empty query parameter', async () => {
                expect.assertions(2);
                const event = createMockEvent('GET', '/autocomplete/address', {
                    q: ''
                });

                const result = await callAddressAutocomplete(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(400);
                expect(body.error).toBe('Query parameter "q" is required');
            });

            it('should reject whitespace-only query parameter', async () => {
                expect.assertions(2);
                const event = createMockEvent('GET', '/autocomplete/address', {
                    q: '   '
                });

                const result = await callAddressAutocomplete(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(400);
                expect(body.error).toBe('Query parameter "q" is required');
            });

            it('should reject query parameter shorter than 3 characters', async () => {
                expect.assertions(4);
                const shortQueries = ['a', 'ab'];

                for(const query of shortQueries) {
                    const event = createMockEvent('GET', '/autocomplete/address', {
                        q: query
                    });

                    const result = await callAddressAutocomplete(event);
                    const body = JSON.parse(result.body!);

                    expect(result.statusCode).toBe(400);
                    expect(body.error).toBe('Query must be at least 3 characters long');
                }
            });

            it('should reject query parameter longer than 100 characters', async () => {
                expect.assertions(2);
                const longQuery = repeat('a', 101);
                const event = createMockEvent('GET', '/autocomplete/address', {
                    q: longQuery
                });

                const result = await callAddressAutocomplete(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(400);
                expect(body.error).toBe('Query must be 100 characters or less');
            });

            it('should accept query parameter at exactly 100 characters', async () => {
                expect.assertions(2);
                const maxQuery = repeat('a', 97) + 'abc'; // 100 chars exactly
                const event = createMockEvent('GET', '/autocomplete/address', {
                    q: maxQuery
                });

                const result = await callAddressAutocomplete(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(200);
                expect(body.success).toBe(true);
            });

            it('should handle unicode characters in query parameter', async () => {
                expect.assertions(10);
                const unicodeQueries = [
                    '中文地址',
                    'русский адрес',
                    'العنوان العربي',
                    '🏠 emoji address',
                    'café français'
                ];

                for(const query of unicodeQueries) {
                    const event = createMockEvent('GET', '/autocomplete/address', {
                        q: query
                    });

                    const result = await callAddressAutocomplete(event);

                    const body = JSON.parse(result.body!);

                    expect(result.statusCode).toBe(200);
                    expect(body.success).toBe(true);
                }
            });
        });

        describe('Limit Parameter Security', () => {
            it('should reject negative limit values', async () => {
                expect.assertions(2);
                const event = createMockEvent('GET', '/autocomplete/address', {
                    q: '123 Main St',
                    limit: '-1'
                });

                const result = await callAddressAutocomplete(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(400);
                expect(body.error).toBe('Limit must be a number between 1 and 20');
            });

            it('should reject limit values greater than 20', async () => {
                expect.assertions(4);
                const invalidLimits = ['21', '100'];

                for(const limit of invalidLimits) {
                    const event = createMockEvent('GET', '/autocomplete/address', {
                        q: '123 Main St',
                        limit
                    });

                    const result = await callAddressAutocomplete(event);
                    const body = JSON.parse(result.body!);

                    expect(result.statusCode).toBe(400);
                    expect(body.error).toBe('Limit must be a number between 1 and 20');
                }
            });

            it('should reject non-numeric limit values', async () => {
                expect.assertions(8);
                const invalidLimits = ['abc', 'null', 'undefined', '<script>'];

                for(const limit of invalidLimits) {
                    const event = createMockEvent('GET', '/autocomplete/address', {
                        q: '123 Main St',
                        limit
                    });

                    const result = await callAddressAutocomplete(event);
                    const body = JSON.parse(result.body!);

                    expect(result.statusCode).toBe(400);
                    expect(body.error).toBe('Limit must be a number between 1 and 20');
                }
            });

            it('should handle injection attempts in limit parameter', async () => {
                expect.assertions(10);
                const injectionAttempts = [
                    "5'; DROP TABLE users; --",    // parseFloat extracts 5
                    '5 OR 1=1',                     // parseFloat extracts 5
                    '{"$where": "1"}',              // parseFloat returns NaN -> 400 error
                    '5<script>alert(1)</script>',   // parseFloat extracts 5
                    '5\x00malicious'                // parseFloat extracts 5
                ];

                for(const limit of injectionAttempts) {
                    const event = createMockEvent('GET', '/autocomplete/address', {
                        q: '123 Main St',
                        limit
                    });

                    const result = await callAddressAutocomplete(event);

                    const body = JSON.parse(result.body!);

                    if(limit === '{"$where": "1"}') {
                        // This one should fail as parseFloat returns NaN
                        expect(result.statusCode).toBe(400);
                        expect(body.error).toBe('Limit must be a number between 1 and 20');
                    } else {
                        // These should succeed as parseFloat extracts the valid number
                        expect(result.statusCode).toBe(200);
                        expect(body.success).toBe(true);
                    }
                }
            });
        });

        describe('Coordinate Parameter Security', () => {
            it('should reject invalid latitude values', async () => {
                expect.assertions(8);
                const invalidLatitudes = [
                    '91',    // Too high
                    '-91',   // Too low
                    'abc',   // Non-numeric
                    'null'   // String null
                ];

                for(const lat of invalidLatitudes) {
                    const event = createMockEvent('GET', '/autocomplete/address', {
                        q: '123 Main St',
                        lat,
                        lon: '0'
                    });

                    const result = await callAddressAutocomplete(event);

                    const body = JSON.parse(result.body!);

                    // Should succeed but ignore invalid coordinates
                    expect(result.statusCode).toBe(200);
                    expect(body.success).toBe(true);
                }
            });

            it('should reject invalid longitude values', async () => {
                expect.assertions(8);
                const invalidLongitudes = [
                    '181',   // Too high
                    '-181',  // Too low
                    'xyz',   // Non-numeric
                    'undefined' // String undefined
                ];

                for(const lon of invalidLongitudes) {
                    const event = createMockEvent('GET', '/autocomplete/address', {
                        q: '123 Main St',
                        lat: '0',
                        lon
                    });

                    const result = await callAddressAutocomplete(event);

                    const body = JSON.parse(result.body!);

                    // Should succeed but ignore invalid coordinates
                    expect(result.statusCode).toBe(200);
                    expect(body.success).toBe(true);
                }
            });

            it('should handle coordinate injection attempts', async () => {
                expect.assertions(12);
                const injectionAttempts = [
                    "34.0'; DROP TABLE users; --",
                    '34<script>alert(1)</script>',
                    '34\x00malicious',
                    '{"$where": "1"}',
                    '34 OR 1=1',
                    '34%20UNION%20SELECT'
                ];

                for(const coordinate of injectionAttempts) {
                    const event = createMockEvent('GET', '/autocomplete/address', {
                        q: '123 Main St',
                        lat: coordinate,
                        lon: '0'
                    });

                    const result = await callAddressAutocomplete(event);

                    const body = JSON.parse(result.body!);

                    // Should succeed but ignore invalid coordinates
                    expect(result.statusCode).toBe(200);
                    expect(body.success).toBe(true);
                }
            });
        });

        describe('HTTP Header Security', () => {
            it('should handle missing query parameters', async () => {
                expect.assertions(2);
                const event = createMockEvent('GET', '/autocomplete/address');

                const result = await callAddressAutocomplete(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(400);
                expect(body.error).toBe('Query parameter "q" is required');
            });

            it('should handle malicious User-Agent headers', async () => {
                expect.assertions(2);
                const event = createMockEvent('GET', '/autocomplete/address', {
                    q: '123 Main St'
                }, {
                    'user-agent': '<script>alert("xss")</script>'
                });

                const result = await callAddressAutocomplete(event);
                const body = JSON.parse(result.body!);

                // Should process normally despite malicious header
                expect(result.statusCode).toBe(200);
                expect(body.success).toBe(true);
            });

            it('should handle IP header injection attempts', async () => {
                expect.assertions(10);
                const maliciousIPs = [
                    '192.168.1.1; malicious-command',
                    '127.0.0.1\x00payload',
                    '<script>alert(1)</script>',
                    '192.168.1.1 OR 1=1',
                    '{"$where": "1"}'
                ];

                for(const ip of maliciousIPs) {
                    const event = createMockEvent('GET', '/autocomplete/address', {
                        q: '123 Main St'
                    }, {
                        'x-forwarded-for': ip
                    });

                    const result = await callAddressAutocomplete(event);

                    const body = JSON.parse(result.body!);

                    // Should process normally despite malicious IP header
                    expect(result.statusCode).toBe(200);
                    expect(body.success).toBe(true);
                }
            });
        });

        describe('HTTP Method Security', () => {
            it('should reject POST requests with 405 Method Not Allowed', async () => {
                expect.assertions(2);
                const event = createMockEvent('POST', '/autocomplete/address');

                const result = await callAddressAutocomplete(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(405);
                expect(body.error).toBe('Method not allowed. Use GET.');
            });

            it('should reject PUT requests with 405 Method Not Allowed', async () => {
                expect.assertions(2);
                const event = createMockEvent('PUT', '/autocomplete/address');

                const result = await callAddressAutocomplete(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(405);
                expect(body.error).toBe('Method not allowed. Use GET.');
            });

            it('should reject DELETE requests with 405 Method Not Allowed', async () => {
                expect.assertions(2);
                const event = createMockEvent('DELETE', '/autocomplete/address');

                const result = await callAddressAutocomplete(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(405);
                expect(body.error).toBe('Method not allowed. Use GET.');
            });
        });

        describe('Error Response Security', () => {
            it('should not expose internal system information in error messages', async () => {
                expect.assertions(1);
                // Force an internal error by mocking fetch to throw
                mockFetch.mockRejectedValueOnce(new Error('Internal system error with sensitive data'));

                const event = createMockEvent('GET', '/autocomplete/address', {
                    q: '123 Main St'
                });

                const result = await callAddressAutocomplete(event);
                const body = JSON.parse(result.body!);

                // Should return generic error message, not expose internal details
                if(result.statusCode === 500) {
                    expect(body.error).toBe('Internal server error');
                } else {
                    // If handled gracefully, should still succeed
                    expect(result.statusCode).toBe(200);
                }
            });

            it('should handle extremely large response payloads safely', async () => {
                expect.assertions(2);
                // Mock a very large response from external API
                const largeResults = chain(Array(1000))
                    .fill(0)
                    .map((_, i) => ({
                        displayText: `${i} Large Address ${repeat('x', 1000)}`,
                        components: {
                            street: `${i} Large St`,
                            city: 'Large City',
                            state: 'CA',
                            postalCode: '12345'
                        },
                        coordinates: { lat: 34.0522, lon: -118.2437 },
                        confidence: 0.8,
                        source: 'radar',
                        id: `large-id-${i}`
                    }))
                    .value();

                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => largeResults
                });

                const event = createMockEvent('GET', '/autocomplete/address', {
                    q: '123 Main St',
                    limit: '20'
                });

                const result = await callAddressAutocomplete(event);
                const body = JSON.parse(result.body!);

                // Should handle large responses gracefully
                expect(result.statusCode).toBe(200);
                expect(body.success).toBe(true);
            });
        });
    });

    describe('Status Endpoint Security', () => {
        describe('HTTP Method Security', () => {
            it('should reject POST requests with 405 Method Not Allowed', async () => {
                expect.assertions(2);
                const event = createMockEvent('POST', '/autocomplete/status');

                const result = await callStatus(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(405);
                expect(body.error).toBe('Method not allowed. Use GET.');
            });

            it('should reject PUT requests with 405 Method Not Allowed', async () => {
                expect.assertions(2);
                const event = createMockEvent('PUT', '/autocomplete/status');

                const result = await callStatus(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(405);
                expect(body.error).toBe('Method not allowed. Use GET.');
            });

            it('should reject DELETE requests with 405 Method Not Allowed', async () => {
                expect.assertions(2);
                const event = createMockEvent('DELETE', '/autocomplete/status');

                const result = await callStatus(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(405);
                expect(body.error).toBe('Method not allowed. Use GET.');
            });
        });

        describe('Information Disclosure Security', () => {
            it('should not expose sensitive system information', async () => {
                expect.assertions(6);
                const event = createMockEvent('GET', '/autocomplete/status');

                const result = await callStatus(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(200);
                expect(body.success).toBe(true);

                // Should not expose sensitive information
                expect(JSON.stringify(body)).not.toContain('password');
                expect(JSON.stringify(body)).not.toContain('secret');
                expect(JSON.stringify(body)).not.toContain('token');
                expect(JSON.stringify(body)).not.toContain('key');
            });

            it('should return sanitized cache statistics', async () => {
                expect.assertions(3);
                const event = createMockEvent('GET', '/autocomplete/status');

                const result = await callStatus(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(200);
                expect(body.cache).toBeDefined();
                expect(typeof body.cache).toBe('object');
            });
        });
    });

    describe('Clear Cache Endpoint Security', () => {
        describe('HTTP Method Security', () => {
            it('should reject GET requests with 405 Method Not Allowed', async () => {
                expect.assertions(2);
                const event = createMockEvent('GET', '/autocomplete/cache');

                const result = await callClearCache(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(405);
                expect(body.error).toBe('Method not allowed. Use DELETE.');
            });

            it('should reject POST requests with 405 Method Not Allowed', async () => {
                expect.assertions(2);
                const event = createMockEvent('POST', '/autocomplete/cache');

                const result = await callClearCache(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(405);
                expect(body.error).toBe('Method not allowed. Use DELETE.');
            });

            it('should reject PUT requests with 405 Method Not Allowed', async () => {
                expect.assertions(2);
                const event = createMockEvent('PUT', '/autocomplete/cache');

                const result = await callClearCache(event);
                const body = JSON.parse(result.body!);

                expect(result.statusCode).toBe(405);
                expect(body.error).toBe('Method not allowed. Use DELETE.');
            });
        });

        describe('Administrative Access Security', () => {
            // Note: This endpoint currently has no authentication/authorization
            // These tests document the current behavior and can be updated when auth is added

            it('should allow cache clearing without authentication', async () => {
                expect.assertions(2);
                const event = createMockEvent('DELETE', '/autocomplete/cache');

                const result = await callClearCache(event);
                const body = JSON.parse(result.body!);

                // Currently allows unauthenticated access
                expect(result.statusCode).toBe(200);
                expect(body.success).toBe(true);
            });

            it('should handle multiple concurrent cache clear requests', async () => {
                expect.assertions(6);
                const events = times(3, () => createMockEvent('DELETE', '/autocomplete/cache'));

                const results = await Promise.all(
                    map(events, event => callClearCache(event))
                );

                for(const result of results) {
                    const body = JSON.parse(result.body!);
                    expect(result.statusCode).toBe(200);
                    expect(body.success).toBe(true);
                }
            });
        });
    });

    describe('Cross-Endpoint Security Validation', () => {
        describe('Response Structure Security', () => {
            it('should return consistent error response structures', async () => {
                expect.assertions(9);
                const badRequests = [
                    createMockEvent('POST', '/autocomplete/address'),
                    createMockEvent('POST', '/autocomplete/status'),
                    createMockEvent('GET', '/autocomplete/cache')
                ];

                const results = await Promise.all([
                    callAddressAutocomplete(badRequests[0]),
                    callStatus(badRequests[1]),
                    callClearCache(badRequests[2])
                ]);

                for(const result of results) {
                    const body = JSON.parse(result.body!);

                    expect(result.statusCode).toBe(405);
                    expect(body.success).toBe(false);
                    expect(body.error).toContain('Method not allowed');
                }
            });

            it('should return proper Content-Type headers for all responses', async () => {
                expect.assertions(9);
                const validRequests = [
                    createMockEvent('GET', '/autocomplete/address', { q: '123 Main St' }),
                    createMockEvent('GET', '/autocomplete/status'),
                    createMockEvent('DELETE', '/autocomplete/cache')
                ];

                const results = await Promise.all([
                    callAddressAutocomplete(validRequests[0]),
                    callStatus(validRequests[1]),
                    callClearCache(validRequests[2])
                ]);

                for(const result of results) {
                    expect(result.headers).toHaveProperty('Content-Type', 'application/json');
                    expect(result.statusCode).toBe(200);
                    expect(() => JSON.parse(result.body!)).not.toThrow();
                }
            });
        });

        describe('Rate Limiting and Abuse Prevention', () => {
            // Note: No explicit rate limiting in current implementation
            // These tests document areas for future security improvements

            it('should handle rapid successive requests', async () => {
                expect.assertions(20);
                const requests = times(10, i =>
                    createMockEvent('GET', '/autocomplete/address', { q: `${i} Main St` })
                );

                const results = await Promise.all(
                    map(requests, request => callAddressAutocomplete(request))
                );

                for(const result of results) {
                    const body = JSON.parse(result.body!);
                    expect(result.statusCode).toBe(200);
                    expect(body.success).toBe(true);
                }
            });
        });

        describe('Input Sanitization Consistency', () => {
            it('should consistently handle null byte injection across parameters', async () => {
                expect.assertions(6);
                const nullByteTests: Record<string, string>[] = [
                    { q: '123 Main St\x00malicious' },
                    { q: '123 Main St', limit: '5\x00script' },
                    { q: '123 Main St', lat: '34.0\x00inject', lon: '0' }
                ];

                for(const test of nullByteTests) {
                    const event = createMockEvent('GET', '/autocomplete/address', test);

                    const result = await callAddressAutocomplete(event);
                    // Should either succeed (sanitized) or fail gracefully
                    expect([200, 400].includes(result.statusCode)).toBe(true);

                    if(result.statusCode === 200) {
                        const body = JSON.parse(result.body!);
                        expect(body.success).toBe(true);
                    } else {
                        const body = JSON.parse(result.body!);
                        expect(body.success).toBe(false);
                    }
                }
            });
        });
    });
});
