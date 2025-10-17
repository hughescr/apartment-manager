// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { jest, resetAllMocks } from '../data/test-setup';

import { describe, it, expect, beforeEach, beforeAll, afterEach } from 'bun:test';
import { get } from '../../api/version';
import _ from 'lodash';

// Type for the version response body
interface VersionResponse {
    version:    string
    deployedAt: string
    features: {
        consistentReads: boolean
        logging:         boolean
        description:     string
    }
}

// Mock setTimeout to eliminate delays
const mockSetTimeout = jest.fn();
const originalSetTimeout = global.setTimeout;

describe('Version API - /version endpoint', () => {
    beforeAll(() => {
        resetAllMocks();
    });

    beforeEach(() => {
        // Mock setTimeout to resolve immediately (no delays)
        mockSetTimeout.mockImplementation((callback: () => void) => {
            callback();
            return 'mock-timeout-id';
        });
        global.setTimeout = mockSetTimeout as unknown as typeof setTimeout;

        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    afterEach(() => {
        // Restore original setTimeout
        global.setTimeout = originalSetTimeout;
        mockSetTimeout.mockClear();
    });

    describe('Happy path: successful version response', () => {
        it('should return version information with 200 status code', async () => {
            const result = await get();

            expect(result.statusCode).toBe(200);
            expect(result.body).toBeDefined();

            const parsedBody: VersionResponse = JSON.parse(result.body!) as VersionResponse;
            expect(parsedBody).toHaveProperty('version');
            expect(parsedBody).toHaveProperty('deployedAt');
            expect(parsedBody).toHaveProperty('features');
        });

        it('should return valid JSON response body', async () => {
            const result = await get();

            expect(() => JSON.parse(result.body!) as VersionResponse).not.toThrow();

            const parsedBody: VersionResponse = JSON.parse(result.body!) as VersionResponse;
            expect(typeof parsedBody).toBe('object');
            expect(parsedBody).not.toBeNull();
        });

        it('should return expected version information structure', async () => {
            const result = await get();
            const parsedBody: VersionResponse = JSON.parse(result.body!) as VersionResponse;

            // Version should be a string
            expect(typeof parsedBody.version).toBe('string');
            expect(parsedBody.version).toMatch(/^\d+\.\d+\.\d+$/); // Semantic versioning format

            // deployedAt should be an ISO string
            expect(typeof parsedBody.deployedAt).toBe('string');
            expect(parsedBody.deployedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            expect(() => new Date(parsedBody.deployedAt)).not.toThrow();

            // features should be an object
            expect(typeof parsedBody.features).toBe('object');
            expect(parsedBody.features).not.toBeNull();
        });

        it('should return current version as 1.0.3', async () => {
            const result = await get();
            const parsedBody: VersionResponse = JSON.parse(result.body!) as VersionResponse;

            expect(parsedBody.version).toBe('1.0.3');
        });

        it('should return valid deployedAt timestamp', async () => {
            const result = await get();
            const parsedBody: VersionResponse = JSON.parse(result.body!) as VersionResponse;

            const deployedDate = new Date(parsedBody.deployedAt);
            const now = new Date();

            // deployedAt should be a valid date and not in the future
            expect(deployedDate).toBeInstanceOf(Date);
            expect(deployedDate.getTime()).not.toBeNaN();
            expect(deployedDate.getTime()).toBeLessThanOrEqual(now.getTime());
        });

        it('should return expected features configuration', async () => {
            const result = await get();
            const parsedBody: VersionResponse = JSON.parse(result.body!) as VersionResponse;

            expect(parsedBody.features).toEqual({
                consistentReads: true,
                logging:         true,
                description:     'Added consistent reads and debug logging to getBuildings'
            });
        });
    });

    describe('Response format validation', () => {
        it('should return proper API Gateway response structure', async () => {
            const result = await get();

            // Should have all required APIGatewayProxyStructuredResultV2 properties
            expect(result).toHaveProperty('statusCode');
            expect(result).toHaveProperty('body');
            expect(typeof result.statusCode).toBe('number');
            expect(typeof result.body).toBe('string');
        });

        it('should not return headers (using defaults)', async () => {
            const result = await get();

            // Version endpoint doesn't set custom headers
            expect(result.headers).toBeUndefined();
        });

        it('should not return isBase64Encoded flag (using defaults)', async () => {
            const result = await get();

            // Version endpoint doesn't set base64 encoding
            expect(result.isBase64Encoded).toBeUndefined();
        });

        it('should return consistent response format across multiple calls', async () => {
            const result1 = await get();
            const result2 = await get();

            expect(result1.statusCode).toBeDefined();
            expect(result2.statusCode).toBeDefined();
            expect(result1.statusCode).toBe(result2.statusCode);

            const body1: VersionResponse = JSON.parse(result1.body!) as VersionResponse;
            const body2: VersionResponse = JSON.parse(result2.body!) as VersionResponse;

            // Version and features should be identical
            expect(body1.version).toBe(body2.version);
            expect(body1.features).toEqual(body2.features);

            // deployedAt should be the same (module evaluated once)
            expect(body1.deployedAt).toBe(body2.deployedAt);
        });
    });

    describe('Edge cases and robustness', () => {
        it('should handle version endpoint being called multiple times', async () => {
            const results = await Promise.all([
                get(),
                get(),
                get(),
                get(),
                get()
            ]);

            // All calls should succeed
            _.forEach(results, (result) => {
                expect(result.statusCode).toBe(200);
                expect(() => JSON.parse(result.body!) as VersionResponse).not.toThrow();
            });

            // All responses should be identical
            const firstBody: VersionResponse = JSON.parse(results[0].body!) as VersionResponse;
            _.forEach(results.slice(1), (result) => {
                expect(JSON.parse(result.body!) as VersionResponse).toEqual(firstBody);
            });
        });

        it('should not throw errors during execution', async () => {
            expect(get()).resolves.toBeDefined();
        });

        it('should return valid data without any parameters', async () => {
            // Version endpoint doesn't take any parameters
            const result = await get();

            expect(result.statusCode).toBe(200);
            expect(() => JSON.parse(result.body!) as VersionResponse).not.toThrow();
        });
    });

    describe('JSON structure validation', () => {
        it('should contain only expected top-level properties', async () => {
            const result = await get();
            const parsedBody: VersionResponse = JSON.parse(result.body!) as VersionResponse;

            const expectedKeys: string[] = ['version', 'deployedAt', 'features'];
            const actualKeys: string[] = Object.keys(parsedBody);

            expect(actualKeys.sort()).toEqual(expectedKeys.sort());
            expect(actualKeys.length).toBe(expectedKeys.length);
        });

        it('should have features object with expected properties', async () => {
            const result = await get();
            const parsedBody: VersionResponse = JSON.parse(result.body!) as VersionResponse;

            const expectedFeatureKeys: string[] = ['consistentReads', 'logging', 'description'];
            const actualFeatureKeys: string[] = Object.keys(parsedBody.features);

            expect(actualFeatureKeys.sort()).toEqual(expectedFeatureKeys.sort());
            expect(actualFeatureKeys.length).toBe(expectedFeatureKeys.length);
        });

        it('should have boolean values for feature flags', async () => {
            const result = await get();
            const parsedBody: VersionResponse = JSON.parse(result.body!) as VersionResponse;

            expect(typeof parsedBody.features.consistentReads).toBe('boolean');
            expect(typeof parsedBody.features.logging).toBe('boolean');
            expect(typeof parsedBody.features.description).toBe('string');
        });

        it('should not contain any null or undefined values', async () => {
            const result = await get();
            const parsedBody: VersionResponse = JSON.parse(result.body!) as VersionResponse;

            expect(parsedBody.version).not.toBeNull();
            expect(parsedBody.version).not.toBeUndefined();
            expect(parsedBody.deployedAt).not.toBeNull();
            expect(parsedBody.deployedAt).not.toBeUndefined();
            expect(parsedBody.features).not.toBeNull();
            expect(parsedBody.features).not.toBeUndefined();

            _(parsedBody.features).values().forEach((value) => {
                expect(value).not.toBeNull();
                expect(value).not.toBeUndefined();
            });
        });
    });

    describe('Performance and consistency', () => {
        it('should return response quickly (under 50ms)', async () => {
            const start = performance.now();
            await get();
            const end = performance.now();

            const duration = end - start;
            expect(duration).toBeLessThan(50);
        });

        it('should have minimal memory footprint', async () => {
            // Test that repeated calls don't cause memory leaks
            const initialMemory = process.memoryUsage().heapUsed;

            // Make 100 calls
            for(let i = 0; i < 100; i++) {
                await get();
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;

            // Memory increase should be minimal (less than 1MB)
            expect(memoryIncrease).toBeLessThan(1024 * 1024);
        });

        it('should be stateless and return identical data', async () => {
            const firstCall = await get();

            // No need to wait - mocked setTimeout executes immediately

            const secondCall = await get();

            // Should return exactly the same data
            expect(firstCall.statusCode).toBeDefined();
            expect(secondCall.statusCode).toBeDefined();
            expect(firstCall.body).toBeDefined();
            expect(secondCall.body).toBeDefined();
            expect(firstCall.statusCode).toBe(secondCall.statusCode);
            expect(firstCall.body).toBe(secondCall.body);
        });
    });

    describe('Data integrity', () => {
        it('should return deployedAt timestamp that is in the past or present', async () => {
            const result = await get();
            const parsedBody: VersionResponse = JSON.parse(result.body!) as VersionResponse;

            const deployedAt = new Date(parsedBody.deployedAt);
            const now = new Date();

            // deployedAt should not be more than 1 minute in the future (allowing for clock skew)
            expect(deployedAt.getTime()).toBeLessThanOrEqual(now.getTime() + 60000);
        });

        it('should have consistent data types across calls', async () => {
            const results = await Promise.all([get(), get(), get()]);

            _.forEach(results, (result) => {
                const body: VersionResponse = JSON.parse(result.body!) as VersionResponse;

                expect(typeof body.version).toBe('string');
                expect(typeof body.deployedAt).toBe('string');
                expect(typeof body.features).toBe('object');
                expect(typeof body.features.consistentReads).toBe('boolean');
                expect(typeof body.features.logging).toBe('boolean');
                expect(typeof body.features.description).toBe('string');
            });
        });

        it('should serialize to JSON without data loss', async () => {
            const result = await get();
            const originalBody = result.body!;

            // Parse and re-stringify
            const parsed: VersionResponse = JSON.parse(originalBody) as VersionResponse;
            const reserialized = JSON.stringify(parsed);

            // Should be able to parse again without errors
            const reparsed: VersionResponse = JSON.parse(reserialized) as VersionResponse;

            expect(reparsed).toEqual(parsed);
        });
    });
});
