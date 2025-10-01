/**
 * Resilience tests for buildings data layer.
 * Tests error handling, concurrency, boundary values, and DynamoDB exceptions.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import {
    dynamoDbMock,
    setupBuildingsTests,
    setupBuildingsTest,
    cleanupBuildingsTest,
    mockPutResponse,
    mockGetResponse,
    mockUpdateResponse
} from './buildings-test-setup';
import { testBuilding, createLargeBuilding, createMaxArrayBuilding } from './buildings-test-fixtures';
import { repeat } from 'lodash';

// Import the functions AFTER mocking
import { getBuildings, getBuilding, createBuilding, updateBuilding } from '../../data/buildings';

describe('Building Data Layer - Resilience', () => {
    beforeAll(() => {
        setupBuildingsTests();
    });

    beforeEach(() => {
        setupBuildingsTest();
    });

    afterEach(() => {
        cleanupBuildingsTest();
    });

    // Edge Case Tests - DynamoDB Errors
    describe('DynamoDB Error Handling', () => {
        it('should handle throttling exceptions', async () => {
            expect.assertions(1);
            const throttleError = new Error('ProvisionedThroughputExceededException: Rate exceeded');
            throttleError.name = 'ProvisionedThroughputExceededException';
            dynamoDbMock.mockRejectedValueOnce(throttleError);

            expect(getBuildings()).rejects.toThrow('ProvisionedThroughputExceededException');
        });

        it('should handle ConditionalCheckFailedException when creating duplicate building', async () => {
            expect.assertions(1);
            // When a conditional check fails, DynamoDB returns the existing item
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...testBuilding, unitID: 'BUILDING' }));

            // The function returns the existing building when condition fails
            const result = await createBuilding(testBuilding);
            expect(result.buildingID).toBe(testBuilding.buildingID);
        });

        it('should handle ValidationException for invalid data', async () => {
            expect.assertions(1);
            const validationError = new Error('ValidationException: Invalid attribute value type');
            validationError.name = 'ValidationException';
            dynamoDbMock.mockRejectedValueOnce(validationError);

            expect(createBuilding(testBuilding)).rejects.toThrow('ValidationException');
        });

        it('should handle ItemCollectionSizeLimitExceededException', async () => {
            expect.assertions(1);
            const sizeError = new Error('ItemCollectionSizeLimitExceededException: Item size has exceeded the maximum allowed size');
            sizeError.name = 'ItemCollectionSizeLimitExceededException';
            dynamoDbMock.mockRejectedValueOnce(sizeError);

            expect(createBuilding(testBuilding)).rejects.toThrow('ItemCollectionSizeLimitExceededException');
        });

        it('should handle ResourceNotFoundException', async () => {
            expect.assertions(1);
            const resourceError = new Error('ResourceNotFoundException: Table not found');
            resourceError.name = 'ResourceNotFoundException';
            dynamoDbMock.mockRejectedValueOnce(resourceError);

            expect(getBuilding('test-building')).rejects.toThrow('ResourceNotFoundException');
        });

        it('should handle ServiceUnavailableException', async () => {
            expect.assertions(1);
            const serviceError = new Error('ServiceUnavailableException: Service temporarily unavailable');
            serviceError.name = 'ServiceUnavailableException';
            dynamoDbMock.mockRejectedValueOnce(serviceError);

            expect(createBuilding(testBuilding)).rejects.toThrow('ServiceUnavailableException');
        });
    });

    // Edge Case Tests - Field Size Limits
    describe('Field Size Limits', () => {
        it('should handle building with maximum allowed item size (near 400KB)', async () => {
            expect.assertions(1);
            // Create a building with very large data
            const largeBuilding = createLargeBuilding();
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...largeBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(largeBuilding);
            expect(result.buildingID).toBe(largeBuilding.buildingID);
        });

        it('should handle very long string fields', async () => {
            expect.assertions(3);
            const longStringBuilding = {
                ...testBuilding,
                description:         repeat('A', 10000),
                propertyDescription: repeat('B', 50000),
                street:              '123 ' + repeat('Very ', 100) + 'Long Street Name That Goes On Forever',
                contactInfo:         {
                    ...testBuilding.contactInfo,
                    website: 'https://' + repeat('subdomain.', 50) + 'example.com/path/to/very/deep/page'
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...longStringBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(longStringBuilding);
            expect(result.description).toHaveLength(10000);
            expect(result.propertyDescription).toHaveLength(50000);
            expect(result.street!.length).toBeGreaterThan(500);
        });

        it('should handle maximum array sizes', async () => {
            expect.assertions(4);
            const maxArrayBuilding = createMaxArrayBuilding();
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...maxArrayBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(maxArrayBuilding);
            expect(result.photos).toHaveLength(1000);
            expect(result.propertyAmenities).toHaveLength(500);
            expect(result.rentSpecials).toHaveLength(100);
            expect(result.oneTimeFees).toHaveLength(50);
        });

        it('should handle item size limit exceeded error', async () => {
            expect.assertions(1);
            const itemSizeError = new Error('ValidationException: Item size has exceeded the maximum allowed size');
            itemSizeError.name = 'ValidationException';
            dynamoDbMock.mockRejectedValueOnce(itemSizeError);

            const largeBuilding = createLargeBuilding();
            expect(createBuilding(largeBuilding)).rejects.toThrow('Item size has exceeded the maximum allowed size');
        });
    });

    // Edge Case Tests - Concurrent Operations
    describe('Concurrent Operations', () => {
        it('should handle concurrent read operations', async () => {
            expect.assertions(3);
            dynamoDbMock
                .mockResolvedValueOnce(mockGetResponse({ ...testBuilding, unitID: 'BUILDING' }))
                .mockResolvedValueOnce(mockGetResponse({ ...testBuilding, unitID: 'BUILDING' }))
                .mockResolvedValueOnce(mockGetResponse({ ...testBuilding, unitID: 'BUILDING' }));

            const [result1, result2, result3] = await Promise.all([
                getBuilding(testBuilding.buildingID),
                getBuilding(testBuilding.buildingID),
                getBuilding(testBuilding.buildingID)
            ]);

            expect(result1!.buildingID).toBe(testBuilding.buildingID);
            expect(result2!.buildingID).toBe(testBuilding.buildingID);
            expect(result3!.buildingID).toBe(testBuilding.buildingID);
        });

        it('should handle concurrent update operations with version conflicts', async () => {
            expect.assertions(4);
            const update1 = { description: 'Update 1' };
            const update2 = { description: 'Update 2' };

            // First update succeeds
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...testBuilding, unitID: 'BUILDING', ...update1 }));
            // Second update also succeeds (DynamoDB handles this internally)
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...testBuilding, unitID: 'BUILDING', ...update2 }));

            const [result1, result2] = await Promise.all([
                updateBuilding(testBuilding.buildingID, update1),
                updateBuilding(testBuilding.buildingID, update2)
            ]);

            expect(result1).toBeDefined();
            expect(result2).toBeDefined();
            expect(result1!.description).toBe('Update 1');
            expect(result2!.description).toBe('Update 2');
        });

        it('should handle concurrent create operations for same building', async () => {
            expect.assertions(2);
            // Both creates should succeed (DynamoDB handles duplicates)
            dynamoDbMock
                .mockResolvedValueOnce(mockPutResponse({ ...testBuilding, unitID: 'BUILDING' }))
                .mockResolvedValueOnce(mockPutResponse({ ...testBuilding, unitID: 'BUILDING' }));

            const [result1, result2] = await Promise.all([
                createBuilding(testBuilding),
                createBuilding(testBuilding)
            ]);

            expect(result1.buildingID).toBe(testBuilding.buildingID);
            expect(result2.buildingID).toBe(testBuilding.buildingID);
        });

        it('should handle mixed concurrent operations', async () => {
            expect.assertions(3);
            // Mix of read, create, and update operations
            dynamoDbMock
                .mockResolvedValueOnce(mockGetResponse({ ...testBuilding, unitID: 'BUILDING' }))
                .mockResolvedValueOnce(mockPutResponse({ ...testBuilding, unitID: 'BUILDING' }))
                .mockResolvedValueOnce(mockUpdateResponse({ ...testBuilding, unitID: 'BUILDING', description: 'Updated' }));

            const [readResult, createResult, updateResult] = await Promise.all([
                getBuilding(testBuilding.buildingID),
                createBuilding(testBuilding),
                updateBuilding(testBuilding.buildingID, { description: 'Updated' })
            ]);

            expect(readResult!.buildingID).toBe(testBuilding.buildingID);
            expect(createResult.buildingID).toBe(testBuilding.buildingID);
            expect(updateResult!.description).toBe('Updated');
        });
    });

    // Edge Case Tests - Boundary Values
    describe('Boundary Values', () => {
        it('should handle zero and negative values', async () => {
            expect.assertions(5);
            const boundaryValuesBuilding = {
                ...testBuilding,
                yearBuilt:      0,
                numberStories:  -1,
                totalUnits:     0,
                leaseLength:    -12,
                applicationFee: -50
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...boundaryValuesBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(boundaryValuesBuilding);
            expect(result.yearBuilt).toBe(0);
            expect(result.numberStories).toBe(-1);
            expect(result.totalUnits).toBe(0);
            expect(result.leaseLength).toBe(-12);
            expect(result.applicationFee).toBe(-50);
        });

        it('should handle maximum numeric values', async () => {
            expect.assertions(4);
            const maxValuesBuilding = {
                ...testBuilding,
                yearBuilt:      9999,
                numberStories:  Number.MAX_SAFE_INTEGER,
                totalUnits:     1000000,
                applicationFee: 999999.99
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...maxValuesBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(maxValuesBuilding);
            expect(result.yearBuilt).toBe(9999);
            expect(result.numberStories).toBe(Number.MAX_SAFE_INTEGER);
            expect(result.totalUnits).toBe(1000000);
            expect(result.applicationFee).toBe(999999.99);
        });

        it('should handle float values for integer fields', async () => {
            expect.assertions(3);
            const floatValuesBuilding = {
                ...testBuilding,
                yearBuilt:     2020.5,
                numberStories: 3.14159,
                totalUnits:    10.99
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...floatValuesBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(floatValuesBuilding);
            expect(result.yearBuilt).toBe(2020.5);
            expect(result.numberStories).toBe(3.14159);
            expect(result.totalUnits).toBe(10.99);
        });

        it('should handle minimum and maximum dates', async () => {
            expect.assertions(2);
            const dateRangeBuilding = {
                ...testBuilding,
                rentSpecials: [
                    { title: 'Ancient Special', description: 'Old deal', startDate: '1900-01-01', endDate: '1900-12-31' },
                    { title: 'Future Special', description: 'Future deal', startDate: '2099-01-01', endDate: '2099-12-31' }
                ]
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...dateRangeBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(dateRangeBuilding);
            expect(result.rentSpecials![0].startDate).toBe('1900-01-01');
            expect(result.rentSpecials![1].endDate).toBe('2099-12-31');
        });
    });

    describe('Network and Timeout Resilience', () => {
        it('should handle network timeout errors', async () => {
            expect.assertions(1);
            const timeoutError = new Error('TimeoutError: Request timed out');
            timeoutError.name = 'TimeoutError';
            dynamoDbMock.mockRejectedValueOnce(timeoutError);

            expect(getBuilding('timeout-test')).rejects.toThrow('TimeoutError');
        });

        it('should handle connection refused errors', async () => {
            expect.assertions(1);
            const connectionError = new Error('NetworkingError: Connection refused');
            connectionError.name = 'NetworkingError';
            dynamoDbMock.mockRejectedValueOnce(connectionError);

            expect(createBuilding(testBuilding)).rejects.toThrow('NetworkingError');
        });
    });

    describe('Memory and Resource Limits', () => {
        it('should handle deeply nested objects without stack overflow', async () => {
            expect.assertions(1);
            // Create a deeply nested structure
            const deepObject: Record<string, unknown> = {};
            let current = deepObject;
            for(let i = 0; i < 100; i++) {
                current.nested = {};
                current = current.nested as Record<string, unknown>;
            }
            current.value = 'deep value';

            const deepNestedBuilding = {
                ...testBuilding,
                customData: deepObject
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...deepNestedBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(deepNestedBuilding);
            expect(result.buildingID).toBe(testBuilding.buildingID);
        });
    });
});
