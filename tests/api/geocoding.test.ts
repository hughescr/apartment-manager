// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { jest, resetAllMocks } from '../data/test-setup';

import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll } from 'bun:test';
import { geocode, status, clearCache } from '../../api/geocoding';
import type { APIGatewayProxyEventV2, Context, Callback } from 'aws-lambda';

// Define the expected response structure for our Lambda functions
interface LambdaResponse {
    statusCode: number
    headers:    Record<string, string>
    body:       string
}
import { forEach, isString } from 'lodash';

// Mock fetch for testing
const mockFetch = jest.fn() as jest.Mock & typeof fetch;
mockFetch.preconnect = jest.fn();
const originalFetch = global.fetch;

// Mock setTimeout to eliminate delays
const mockSetTimeout = jest.fn();
const originalSetTimeout = global.setTimeout;

// Mock Date.now for rate limiter testing
const mockDateNow = jest.fn();
const originalDateNow = Date.now;

describe('Geocoding API Handlers', () => {
    let timeNow = 0;

    // Helper function to create mock API Gateway events
    const createMockEvent = (
        method: string,
        path: string,
        body?: string,
        queryStringParameters?: Record<string, string>
    ): APIGatewayProxyEventV2 => ({
        version:        '2.0',
        routeKey:       `${method} ${path}`,
        rawPath:        path,
        rawQueryString: queryStringParameters ? new URLSearchParams(queryStringParameters).toString() : '',
        headers:        {
            'content-type': 'application/json'
        },
        queryStringParameters: queryStringParameters ?? undefined,
        requestContext:        {
            accountId:    '123456789012',
            apiId:        'api-id',
            domainName:   'api.example.com',
            domainPrefix: 'api',
            http:         {
                method:    method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS',
                path:      path,
                protocol:  'HTTP/1.1',
                sourceIp:  '192.168.1.1',
                userAgent: 'test-agent'
            },
            requestId: 'test-request-id',
            routeKey:  `${method} ${path}`,
            stage:     'test',
            time:      '01/Jan/2024:00:00:00 +0000',
            timeEpoch: 1704067200
        },
        body:            body ?? undefined,
        isBase64Encoded: false
    });

    // Helper functions to properly type handler responses
    const callGeocode = async (event: APIGatewayProxyEventV2): Promise<LambdaResponse> => {
        const result = await geocode(event, {} as Context, {} as Callback);
        if(isString(result)) {
            return JSON.parse(result) as LambdaResponse;
        }
        return result! as LambdaResponse;
    };

    const callStatus = async (event: APIGatewayProxyEventV2): Promise<LambdaResponse> => {
        const result = await status(event, {} as Context, {} as Callback);
        if(isString(result)) {
            return JSON.parse(result) as LambdaResponse;
        }
        return result! as LambdaResponse;
    };

    const callClearCache = async (event: APIGatewayProxyEventV2): Promise<LambdaResponse> => {
        const result = await clearCache(event, {} as Context, {} as Callback);
        if(isString(result)) {
            return JSON.parse(result) as LambdaResponse;
        }
        return result! as LambdaResponse;
    };

    beforeAll(() => {
        resetAllMocks();
        // Set up global fetch mock
        global.fetch = mockFetch;
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.restoreAllMocks();

        // Reset time counter for consistent rate limiter behavior
        timeNow = 0;

        // Mock setTimeout to resolve immediately (no delays)
        mockSetTimeout.mockImplementation((callback: () => void) => {
            callback();
            return 'mock-timeout-id';
        });
        global.setTimeout = mockSetTimeout as unknown as typeof setTimeout;

        // Mock Date.now to control rate limiter timing
        mockDateNow.mockImplementation(() => {
            return timeNow;
        });
        global.Date.now = mockDateNow;

        // Reset all mocks
        mockFetch.mockClear();
        mockFetch.mockReset();
        mockSetTimeout.mockClear();
        mockDateNow.mockClear();

        // Clear geocoding cache for clean test state
        try {
            const clearEvent = createMockEvent('DELETE', '/geocoding/cache');
            await callClearCache(clearEvent);
        } catch{
            // Ignore errors during setup cache clearing
        }
    });

    afterEach(() => {
        // Restore original functions (but keep fetch mocked for test isolation)
        global.setTimeout = originalSetTimeout;
        global.Date.now = originalDateNow;

        // Clear mocks
        mockFetch.mockClear();
        mockSetTimeout.mockClear();
        mockDateNow.mockClear();
    });

    afterAll(() => {
        // Restore global.fetch after all tests are complete to prevent test pollution
        global.fetch = originalFetch;
    });

    describe('geocode endpoint - POST /geocoding', () => {
        describe('Happy path: successful geocoding', () => {
            it('should return successful geocoding result with 200 status', async () => {
                // Mock successful Nominatim response
                mockFetch.mockResolvedValueOnce({
                    ok:   true,
                    json: async () => [{
                        lat:          '34.0522',
                        lon:          '-118.2437',
                        display_name: '123 Main St, Los Angeles, CA, USA',
                        importance:   0.8,
                        place_id:     '123456',
                        licence:      'test',
                        osm_type:     'way',
                        osm_id:       '123456',
                        boundingbox:  ['34.0', '34.1', '-118.3', '-118.2']
                    }]
                });

                // Advance time to avoid rate limiter delays
                timeNow += 2000;

                const event = createMockEvent('POST', '/geocoding', JSON.stringify({
                    address: '123 Main St',
                    city:    'Los Angeles',
                    state:   'CA'
                }));

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(200);
                expect(result.headers).toEqual({ 'Content-Type': 'application/json' });

                const body = JSON.parse(result.body) as { success: boolean, result: { lat: number, lng: number, displayName: string, confidence: number, source: string }, cacheStats: unknown, error?: string };
                expect(body.success).toBe(true);
                expect(body.result).toBeDefined();
                expect(body.result.lat).toBe(34.0522);
                expect(body.result.lng).toBe(-118.2437);
                expect(body.result.displayName).toBe('123 Main St, Los Angeles, CA, USA');
                expect(body.result.confidence).toBe(0.8);
                expect(body.result.source).toBe('nominatim');
                expect(body.cacheStats).toBeDefined();
                expect(body.error).toBeUndefined();
            });

            it('should handle no results found scenario', async () => {
                // Mock empty response from Nominatim
                mockFetch.mockResolvedValueOnce({
                    ok:   true,
                    json: async () => []
                });

                timeNow += 2000;

                const event = createMockEvent('POST', '/geocoding', JSON.stringify({
                    address: 'Invalid Address'
                }));

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(200);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(true);
                expect(body.result).toBeUndefined();
                expect(body.error).toBe('No results found for the provided address');
                expect(body.cacheStats).toBeDefined();
            });

            it('should handle cached results', async () => {
                // Clear cache and ensure fresh start
                const clearEvent = createMockEvent('DELETE', '/geocoding/cache');
                await callClearCache(clearEvent);

                // First call - mock API response
                mockFetch.mockResolvedValueOnce({
                    ok:   true,
                    json: async () => [{
                        lat:          '34.0522',
                        lon:          '-118.2437',
                        display_name: '123 Main St, Los Angeles, CA, USA',
                        importance:   0.8,
                        place_id:     '123456',
                        licence:      'test',
                        osm_type:     'way',
                        osm_id:       '123456',
                        boundingbox:  ['34.0', '34.1', '-118.3', '-118.2']
                    }]
                });

                timeNow += 2000;

                const event = createMockEvent('POST', '/geocoding', JSON.stringify({
                    address: 'Fresh Test Address',  // Use unique address to avoid cache conflicts
                    city:    'Test City',
                    state:   'TC'
                }));

                // First call should hit the API
                const result1 = await geocode(event, {} as Context, {} as Callback) as LambdaResponse;
                expect(result1.statusCode).toBe(200);
                const body1 = JSON.parse(result1.body) as { result: { source: string } };
                expect(body1.result.source).toBe('nominatim');

                // Second call should use cache (no additional fetch call)
                const result2 = await geocode(event, {} as Context, {} as Callback) as LambdaResponse;
                expect(result2.statusCode).toBe(200);
                const body2 = JSON.parse(result2.body) as { result: { source: string } };
                expect(body2.result.source).toBe('cache');

                // Verify fetch was only called once
                expect(mockFetch).toHaveBeenCalledTimes(1);
            });
        });

        describe('HTTP method validation', () => {
            it('should reject GET requests with 405 Method Not Allowed', async () => {
                const event = createMockEvent('GET', '/geocoding');

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(405);
                expect(result.headers).toEqual({ 'Content-Type': 'application/json' });

                const body = JSON.parse(result.body) as { success: boolean, error?: string };
                expect(body.success).toBe(false);
                expect(body.error).toBe('Method not allowed. Use POST.');

                expect(mockFetch).not.toHaveBeenCalled();
            });

            it('should reject PUT requests with 405 Method Not Allowed', async () => {
                const event = createMockEvent('PUT', '/geocoding');

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(405);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Method not allowed. Use POST.');
            });

            it('should reject DELETE requests with 405 Method Not Allowed', async () => {
                const event = createMockEvent('DELETE', '/geocoding');

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(405);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Method not allowed. Use POST.');
            });
        });

        describe('Request body validation', () => {
            it('should reject requests with no body', async () => {
                const event = createMockEvent('POST', '/geocoding');

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(400);
                expect(result.headers).toEqual({ 'Content-Type': 'application/json' });

                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Request body is required');

                expect(mockFetch).not.toHaveBeenCalled();
            });

            it('should reject requests with empty body', async () => {
                const event = createMockEvent('POST', '/geocoding', '');

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(400);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Request body is required');
            });

            it('should reject requests with invalid JSON', async () => {
                const event = createMockEvent('POST', '/geocoding', '{ invalid json }');

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(400);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Invalid JSON in request body');

                expect(mockFetch).not.toHaveBeenCalled();
            });

            it('should reject requests with malformed JSON', async () => {
                const event = createMockEvent('POST', '/geocoding', '{"address":"test"');

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(400);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Invalid JSON in request body');
            });
        });

        describe('Address field validation', () => {
            it('should reject requests without address field', async () => {
                const event = createMockEvent('POST', '/geocoding', JSON.stringify({
                    city:  'Los Angeles',
                    state: 'CA'
                }));

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(400);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Address is required');

                expect(mockFetch).not.toHaveBeenCalled();
            });

            it('should reject requests with empty address', async () => {
                const event = createMockEvent('POST', '/geocoding', JSON.stringify({
                    address: '',
                    city:    'Los Angeles',
                    state:   'CA'
                }));

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(400);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Address is required');
            });

            it('should reject requests with whitespace-only address', async () => {
                const event = createMockEvent('POST', '/geocoding', JSON.stringify({
                    address: '   ',
                    city:    'Los Angeles',
                    state:   'CA'
                }));

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(400);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Address is required');
            });

            it('should reject requests with null address', async () => {
                const event = createMockEvent('POST', '/geocoding', JSON.stringify({
                    address: null,
                    city:    'Los Angeles'
                }));

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(400);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Address is required');
            });
        });

        describe('Error handling', () => {
            it('should handle service network errors gracefully', async () => {
                mockFetch.mockRejectedValueOnce(new Error('Network error'));
                timeNow += 2000;

                const event = createMockEvent('POST', '/geocoding', JSON.stringify({
                    address: '123 Main St'
                }));

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(200);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(true);
                expect(body.result).toBeUndefined();
                expect(body.error).toBe('No results found for the provided address');
            });

            it('should handle service API errors gracefully', async () => {
                mockFetch.mockResolvedValueOnce({
                    ok:         false,
                    status:     500,
                    statusText: 'Internal Server Error'
                });
                timeNow += 2000;

                const event = createMockEvent('POST', '/geocoding', JSON.stringify({
                    address: '123 Main St'
                }));

                const result = await callGeocode(event);

                expect(result.statusCode).toBe(200);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(true);
                expect(body.result).toBeUndefined();
                expect(body.error).toBe('No results found for the provided address');
            });
        });

        describe('Response format validation', () => {
            it('should return consistent response structure for successful geocoding', async () => {
                mockFetch.mockResolvedValueOnce({
                    ok:   true,
                    json: async () => [{
                        lat:          '34.0522',
                        lon:          '-118.2437',
                        display_name: '123 Main St',
                        importance:   0.8,
                        place_id:     '123456',
                        licence:      'test',
                        osm_type:     'way',
                        osm_id:       '123456',
                        boundingbox:  ['34.0', '34.1', '-118.3', '-118.2']
                    }]
                });
                timeNow += 2000;

                const event = createMockEvent('POST', '/geocoding', JSON.stringify({
                    address: '123 Main St'
                }));

                const result = await callGeocode(event);

                expect(result).toHaveProperty('statusCode');
                expect(result).toHaveProperty('headers');
                expect(result).toHaveProperty('body');
                expect(typeof result.statusCode).toBe('number');
                expect(typeof result.body).toBe('string');
                expect(result.headers).toEqual({ 'Content-Type': 'application/json' });

                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body).toHaveProperty('success');
                expect(body).toHaveProperty('cacheStats');
                expect(typeof body.success).toBe('boolean');
            });
        });
    });

    describe('status endpoint - GET /geocoding/status', () => {
        describe('Happy path: successful status retrieval', () => {
            it('should return service status with 200 status code', async () => {
                const event = createMockEvent('GET', '/geocoding/status');

                const result = await callStatus(event);

                expect(result.statusCode).toBe(200);
                expect(result.headers).toEqual({ 'Content-Type': 'application/json' });

                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(true);
                expect(body.service).toBe('OpenStreetMap Nominatim');
                expect(body.status).toBe('operational');
                expect(body.cache).toBeDefined();
                expect(body.cache).toHaveProperty('size');
                expect(body.cache).toHaveProperty('ttlDays');
                expect(body.rateLimit).toEqual({
                    requestsPerSecond: 1,
                    policy:            'Nominatim usage policy compliant'
                });
            });

            it('should return consistent status information across calls', async () => {
                const event = createMockEvent('GET', '/geocoding/status');

                const result1 = await status(event, {} as Context, {} as Callback) as LambdaResponse;
                const result2 = await status(event, {} as Context, {} as Callback) as LambdaResponse;

                expect(result1.statusCode).toBe(result2.statusCode);

                const body1 = JSON.parse(result1.body) as Record<string, unknown>;
                const body2 = JSON.parse(result2.body) as Record<string, unknown>;

                expect(body1.service).toBe(body2.service);
                expect(body1.status).toBe(body2.status);
                expect(body1.rateLimit).toEqual(body2.rateLimit);
            });
        });

        describe('HTTP method validation', () => {
            it('should reject POST requests with 405 Method Not Allowed', async () => {
                const event = createMockEvent('POST', '/geocoding/status');

                const result = await callStatus(event);

                expect(result.statusCode).toBe(405);
                expect(result.headers).toEqual({ 'Content-Type': 'application/json' });

                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Method not allowed. Use GET.');
            });

            it('should reject PUT requests with 405 Method Not Allowed', async () => {
                const event = createMockEvent('PUT', '/geocoding/status');

                const result = await callStatus(event);

                expect(result.statusCode).toBe(405);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Method not allowed. Use GET.');
            });

            it('should reject DELETE requests with 405 Method Not Allowed', async () => {
                const event = createMockEvent('DELETE', '/geocoding/status');

                const result = await callStatus(event);

                expect(result.statusCode).toBe(405);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Method not allowed. Use GET.');
            });
        });

        describe('Response format validation', () => {
            it('should return proper API Gateway response structure', async () => {
                const event = createMockEvent('GET', '/geocoding/status');

                const result = await callStatus(event);

                expect(result).toHaveProperty('statusCode');
                expect(result).toHaveProperty('headers');
                expect(result).toHaveProperty('body');
                expect(typeof result.statusCode).toBe('number');
                expect(typeof result.body).toBe('string');
                expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
            });

            it('should contain all expected status fields', async () => {
                const event = createMockEvent('GET', '/geocoding/status');

                const result = await callStatus(event);
                const body = JSON.parse(result.body) as Record<string, unknown>;

                const expectedFields = ['success', 'service', 'status', 'cache', 'rateLimit'];
                forEach(expectedFields, (field) => {
                    expect(body).toHaveProperty(field);
                });

                expect(body.cache).toHaveProperty('size');
                expect(body.cache).toHaveProperty('ttlDays');
                expect(body.rateLimit).toHaveProperty('requestsPerSecond');
                expect(body.rateLimit).toHaveProperty('policy');
            });
        });
    });

    describe('clearCache endpoint - DELETE /geocoding/cache', () => {
        describe('Happy path: successful cache clearing', () => {
            it('should clear cache and return statistics with 200 status', async () => {
                const event = createMockEvent('DELETE', '/geocoding/cache');

                const result = await callClearCache(event);

                expect(result.statusCode).toBe(200);
                expect(result.headers).toEqual({ 'Content-Type': 'application/json' });

                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(true);
                expect(body.message).toBe('Cache cleared successfully');
                expect(typeof body.cleared).toBe('number');
                expect(typeof body.remaining).toBe('number');
                expect(body.cleared).toBeGreaterThanOrEqual(0);
                expect(body.remaining).toBe(0);
            });

            it('should handle empty cache clearing', async () => {
                // Start with an empty cache by creating a new test scenario
                const event = createMockEvent('DELETE', '/geocoding/cache');

                const result = await callClearCache(event);

                expect(result.statusCode).toBe(200);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(true);
                expect(body.cleared).toBeGreaterThanOrEqual(0);
                expect(body.remaining).toBe(0);
            });
        });

        describe('HTTP method validation', () => {
            it('should reject GET requests with 405 Method Not Allowed', async () => {
                const event = createMockEvent('GET', '/geocoding/cache');

                const result = await callClearCache(event);

                expect(result.statusCode).toBe(405);
                expect(result.headers).toEqual({ 'Content-Type': 'application/json' });

                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Method not allowed. Use DELETE.');
            });

            it('should reject POST requests with 405 Method Not Allowed', async () => {
                const event = createMockEvent('POST', '/geocoding/cache');

                const result = await callClearCache(event);

                expect(result.statusCode).toBe(405);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Method not allowed. Use DELETE.');
            });

            it('should reject PUT requests with 405 Method Not Allowed', async () => {
                const event = createMockEvent('PUT', '/geocoding/cache');

                const result = await callClearCache(event);

                expect(result.statusCode).toBe(405);
                const body = JSON.parse(result.body) as Record<string, unknown>;
                expect(body.success).toBe(false);
                expect(body.error).toBe('Method not allowed. Use DELETE.');
            });
        });

        describe('Response format validation', () => {
            it('should return proper API Gateway response structure', async () => {
                const event = createMockEvent('DELETE', '/geocoding/cache');

                const result = await callClearCache(event);

                expect(result).toHaveProperty('statusCode');
                expect(result).toHaveProperty('headers');
                expect(result).toHaveProperty('body');
                expect(typeof result.statusCode).toBe('number');
                expect(typeof result.body).toBe('string');
                expect(result.headers).toEqual({ 'Content-Type': 'application/json' });
            });

            it('should contain all expected clear cache response fields', async () => {
                const event = createMockEvent('DELETE', '/geocoding/cache');

                const result = await callClearCache(event);
                const body = JSON.parse(result.body) as Record<string, unknown>;

                const expectedFields = ['success', 'message', 'cleared', 'remaining'];
                forEach(expectedFields, (field) => {
                    expect(body).toHaveProperty(field);
                });

                expect(typeof body.success).toBe('boolean');
                expect(typeof body.message).toBe('string');
                expect(typeof body.cleared).toBe('number');
                expect(typeof body.remaining).toBe('number');
            });
        });
    });

    describe('Cross-cutting concerns', () => {
        describe('Headers consistency', () => {
            it('should return consistent Content-Type headers across all endpoints', async () => {
                mockFetch.mockResolvedValueOnce({
                    ok:   true,
                    json: async () => [{
                        lat:          '34.0522',
                        lon:          '-118.2437',
                        display_name: '123 Main St',
                        importance:   0.8,
                        place_id:     '123456',
                        licence:      'test',
                        osm_type:     'way',
                        osm_id:       '123456',
                        boundingbox:  ['34.0', '34.1', '-118.3', '-118.2']
                    }]
                });
                timeNow += 2000;

                const geocodeEvent = createMockEvent('POST', '/geocoding', JSON.stringify({ address: '123 Main St' }));
                const statusEvent = createMockEvent('GET', '/geocoding/status');
                const clearCacheEvent = createMockEvent('DELETE', '/geocoding/cache');

                const geocodeResult = await geocode(geocodeEvent, {} as Context, {} as Callback) as LambdaResponse;
                const statusResult = await status(statusEvent, {} as Context, {} as Callback) as LambdaResponse;
                const clearCacheResult = await callClearCache(clearCacheEvent);

                expect(geocodeResult.headers).toEqual({ 'Content-Type': 'application/json' });
                expect(statusResult.headers).toEqual({ 'Content-Type': 'application/json' });
                expect(clearCacheResult.headers).toEqual({ 'Content-Type': 'application/json' });
            });

            it('should return Content-Type headers for error responses', async () => {
                const geocodeEvent = createMockEvent('GET', '/geocoding'); // Wrong method
                const statusEvent = createMockEvent('POST', '/geocoding/status'); // Wrong method
                const clearCacheEvent = createMockEvent('GET', '/geocoding/cache'); // Wrong method

                const geocodeResult = await geocode(geocodeEvent, {} as Context, {} as Callback) as LambdaResponse;
                const statusResult = await status(statusEvent, {} as Context, {} as Callback) as LambdaResponse;
                const clearCacheResult = await callClearCache(clearCacheEvent);

                expect(geocodeResult.headers).toEqual({ 'Content-Type': 'application/json' });
                expect(statusResult.headers).toEqual({ 'Content-Type': 'application/json' });
                expect(clearCacheResult.headers).toEqual({ 'Content-Type': 'application/json' });
            });
        });

        describe('JSON response validation', () => {
            it('should return valid JSON for all successful responses', async () => {
                mockFetch.mockResolvedValueOnce({
                    ok:   true,
                    json: async () => [{
                        lat:          '34.0522',
                        lon:          '-118.2437',
                        display_name: '123 Main St',
                        importance:   0.8,
                        place_id:     '123456',
                        licence:      'test',
                        osm_type:     'way',
                        osm_id:       '123456',
                        boundingbox:  ['34.0', '34.1', '-118.3', '-118.2']
                    }]
                });
                timeNow += 2000;

                const geocodeEvent = createMockEvent('POST', '/geocoding', JSON.stringify({ address: '123 Main St' }));
                const statusEvent = createMockEvent('GET', '/geocoding/status');
                const clearCacheEvent = createMockEvent('DELETE', '/geocoding/cache');

                const results = await Promise.all([
                    geocode(geocodeEvent, {} as Context, {} as Callback) as Promise<LambdaResponse>,
                    status(statusEvent, {} as Context, {} as Callback) as Promise<LambdaResponse>,
                    clearCache(clearCacheEvent, {} as Context, {} as Callback) as Promise<LambdaResponse>
                ]);

                forEach(results, (result) => {
                    expect(() => JSON.parse(result.body) as Record<string, unknown>).not.toThrow();
                    const body = JSON.parse(result.body) as Record<string, unknown>;
                    expect(typeof body).toBe('object');
                    expect(body).not.toBeNull();
                });
            });

            it('should return valid JSON for all error responses', async () => {
                const geocodeEvent = createMockEvent('GET', '/geocoding'); // Wrong method
                const statusEvent = createMockEvent('POST', '/geocoding/status'); // Wrong method
                const clearCacheEvent = createMockEvent('GET', '/geocoding/cache'); // Wrong method

                const results = await Promise.all([
                    geocode(geocodeEvent, {} as Context, {} as Callback) as Promise<LambdaResponse>,
                    status(statusEvent, {} as Context, {} as Callback) as Promise<LambdaResponse>,
                    clearCache(clearCacheEvent, {} as Context, {} as Callback) as Promise<LambdaResponse>
                ]);

                forEach(results, (result) => {
                    expect(() => JSON.parse(result.body) as { success: boolean, error?: string }).not.toThrow();
                    const body = JSON.parse(result.body) as { success: boolean, error?: string };
                    expect(body.success).toBe(false);
                    expect(body.error).toBeDefined();
                });
            });
        });

        describe('Error response consistency', () => {
            it('should return consistent error structure across endpoints', async () => {
                const geocodeEvent = createMockEvent('GET', '/geocoding');
                const statusEvent = createMockEvent('POST', '/geocoding/status');
                const clearCacheEvent = createMockEvent('POST', '/geocoding/cache');

                const results = await Promise.all([
                    geocode(geocodeEvent, {} as Context, {} as Callback) as Promise<LambdaResponse>,
                    status(statusEvent, {} as Context, {} as Callback) as Promise<LambdaResponse>,
                    clearCache(clearCacheEvent, {} as Context, {} as Callback) as Promise<LambdaResponse>
                ]);

                forEach(results, (result) => {
                    expect(result.statusCode).toBe(405);
                    const body = JSON.parse(result.body) as Record<string, unknown>;
                    expect(body).toHaveProperty('success', false);
                    expect(body).toHaveProperty('error');
                    expect(typeof body.error).toBe('string');
                    expect(body.error).toContain('Method not allowed');
                });
            });
        });
    });
});
