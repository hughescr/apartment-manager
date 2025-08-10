// tests/api/units-bulk-validation.test.ts
// CRITICAL: Import test setup FIRST before any other imports
import '../data/test-setup';
import { jest, dynamoDbMock } from '../data/test-setup';

import { describe, it, expect, beforeEach } from 'bun:test';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

// Import mock helpers
import { mockGetResponse, mockUpdateResponse } from '../helpers/mock-responses';

// Import the functions AFTER mocking
import { bulkStatusUpdate, bulkRentUpdate } from '../../api/units';

// Type for test events - make it compatible with APIGatewayProxyEventV2
type TestEvent = APIGatewayProxyEventV2;

// Helper function to create test events with required properties
function createTestEvent(overrides: Partial<TestEvent> = {}): TestEvent {
    return {
        version: '2.0',
        routeKey: 'POST /buildings/{buildingID}/units/bulk-status',
        rawPath: `/buildings/${overrides.pathParameters?.buildingID || 'test-building'}/units/bulk-status`,
        rawQueryString: '',
        headers: {
            'content-type': 'application/json',
            'user-agent': 'test-agent'
        },
        requestContext: {
            accountId: '123456789012',
            apiId: 'test-api-id',
            domainName: 'api.test.com',
            domainPrefix: 'test',
            http: {
                method: 'POST',
                path: `/buildings/${overrides.pathParameters?.buildingID || 'test-building'}/units/bulk-status`,
                protocol: 'HTTP/1.1',
                sourceIp: '127.0.0.1',
                userAgent: 'test-agent'
            },
            requestId: 'test-request-id',
            routeKey: 'POST /buildings/{buildingID}/units/bulk-status',
            stage: 'dev',
            time: '2023-01-01T00:00:00.000Z',
            timeEpoch: 1672531200000
        },
        isBase64Encoded: false,
        pathParameters: undefined,
        body: undefined,
        ...overrides
    } as TestEvent;
}

describe('Units Bulk Operations Validation', () => {
    const testBuildingID = 'test-building-bulk-ops';

    beforeEach(() => {
        // Clear mock calls before each test
        jest.clearAllMocks();
    });

    describe('Bulk Status Update Validation', () => {
        it('should validate required unitIDs field', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: JSON.stringify({
                    // Missing unitIDs
                    vacancyClass: 'Unoccupied'
                })
            });

            const result = await bulkStatusUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.error).toBe('Validation failed');
            expect(body.errors.unitIDs).toBeDefined();
        });

        it('should validate empty unitIDs array', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: JSON.stringify({
                    unitIDs: [],
                    vacancyClass: 'Unoccupied'
                })
            });

            const result = await bulkStatusUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.errors.unitIDs).toBeDefined();
        });

        it('should validate vacancy class values', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: JSON.stringify({
                    unitIDs: ['unit-101'],
                    vacancyClass: 'InvalidStatus'
                })
            });

            const result = await bulkStatusUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.errors.vacancyClass).toBeDefined();
        });

        it('should accept valid vacancy class values', async () => {
            const validStatuses = ['Occupied', 'Unoccupied', 'Notice', 'Down'];

            for(const status of validStatuses) {
                // Mock the getUnit call to return a valid unit
                const mockUnit = {
                    buildingID: testBuildingID,
                    unitID: 'UNIT#unit-101',
                    unitNumber: '101',
                    beds: 2,
                    baths: 1,
                    sqft: 1000,
                    rent: 1500,
                    vacancyClass: 'Occupied'
                };
                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(mockUnit)); // For getUnit
                dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse(mockUnit)); // For updateUnit

                const event = createTestEvent({
                    pathParameters: { buildingID: testBuildingID },
                    body: JSON.stringify({
                        unitIDs: ['unit-101'],
                        vacancyClass: status
                    })
                });

                const result = await bulkStatusUpdate(event);

                // Should pass validation and successfully update
                expect(result.statusCode).toBe(200);
                const body = JSON.parse(result.body!);
                expect(body.message).toContain('Successfully updated');
                expect(body.updatedUnits).toBe(1);
            }
        });

        it('should limit bulk operations to 100 units', async () => {
            const manyUnitIDs = Array.from({ length: 101 }, (_, i) => `unit-${i}`);

            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: JSON.stringify({
                    unitIDs: manyUnitIDs,
                    vacancyClass: 'Unoccupied'
                })
            });

            const result = await bulkStatusUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.errors.unitIDs).toContain('Cannot update more than 100 units at once');
        });

        it('should validate unit ID format', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: JSON.stringify({
                    unitIDs: ['valid-id', 'invalid id with spaces'],
                    vacancyClass: 'Unoccupied'
                })
            });

            const result = await bulkStatusUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.errors.unitIDs).toBeDefined();
        });

        it('should handle invalid JSON body', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: 'invalid json'
            });

            const result = await bulkStatusUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.error).toBe('Invalid request body');
        });

        it('should handle missing JSON body', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: undefined
            });

            const result = await bulkStatusUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.errors.unitIDs).toBeDefined();
        });

        it('should handle invalid building ID', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: 'invalid building id' },
                body: JSON.stringify({
                    unitIDs: ['unit-101'],
                    vacancyClass: 'Unoccupied'
                })
            });
            const result = await bulkStatusUpdate(event);

            expect(result.statusCode).toBe(404);
        });
    });

    describe('Bulk Rent Update Validation', () => {
        it('should validate required unitIDs field', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: JSON.stringify({
                    // Missing unitIDs
                    updateType: 'absolute',
                    value: 1500
                })
            });

            const result = await bulkRentUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.errors.unitIDs).toBeDefined();
        });

        it('should validate required updateType field', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: JSON.stringify({
                    unitIDs: ['unit-101'],
                    // Missing updateType
                    value: 1500
                })
            });

            const result = await bulkRentUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.errors.updateType).toBeDefined();
        });

        it('should validate required value field', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: JSON.stringify({
                    unitIDs: ['unit-101'],
                    updateType: 'absolute'
                    // Missing value
                })
            });

            const result = await bulkRentUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.errors.value).toBeDefined();
        });

        it('should validate updateType values', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: JSON.stringify({
                    unitIDs: ['unit-101'],
                    updateType: 'invalid',
                    value: 1500
                })
            });

            const result = await bulkRentUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.errors.updateType).toBeDefined();
        });

        it('should accept valid updateType values', async () => {
            const validUpdateTypes = ['absolute', 'percentage'];

            for(const updateType of validUpdateTypes) {
                // Mock the getUnit call to return a valid unit
                const mockUnit = {
                    buildingID: testBuildingID,
                    unitID: 'UNIT#unit-101',
                    unitNumber: '101',
                    beds: 2,
                    baths: 1,
                    sqft: 1000,
                    rent: 1500,
                    vacancyClass: 'Occupied'
                };
                dynamoDbMock.mockResolvedValueOnce(mockGetResponse(mockUnit)); // For getUnit
                dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse(mockUnit)); // For updateUnit

                const event = createTestEvent({
                    pathParameters: { buildingID: testBuildingID },
                    body: JSON.stringify({
                        unitIDs: ['unit-101'],
                        updateType,
                        value: updateType === 'absolute' ? 1500 : 10
                    })
                });

                const result = await bulkRentUpdate(event);

                // Should pass validation and successfully update
                expect(result.statusCode).toBe(200);
                const body = JSON.parse(result.body!);
                expect(body.message).toContain('Successfully updated rent');
                expect(body.updatedUnits).toBe(1);
            }
        });

        it('should validate absolute rent values', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: JSON.stringify({
                    unitIDs: ['unit-101'],
                    updateType: 'absolute',
                    value: 50000 // Too high
                })
            });

            const result = await bulkRentUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.errors.value).toContain('must be between 0 and 25000');
        });

        it('should validate percentage values', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: JSON.stringify({
                    unitIDs: ['unit-101'],
                    updateType: 'percentage',
                    value: 2000 // Too high
                })
            });

            const result = await bulkRentUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.errors.value).toContain('must be between -100 and 1000');
        });

        it('should validate negative absolute rent values', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: JSON.stringify({
                    unitIDs: ['unit-101'],
                    updateType: 'absolute',
                    value: -100
                })
            });

            const result = await bulkRentUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.errors.value).toBeDefined();
        });

        it('should handle non-numeric values', async () => {
            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: JSON.stringify({
                    unitIDs: ['unit-101'],
                    updateType: 'absolute',
                    value: 'not-a-number'
                })
            });
            const result = await bulkRentUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.errors.value).toBeDefined();
        });

        it('should limit bulk operations to 100 units', async () => {
            const manyUnitIDs = Array.from({ length: 101 }, (_, i) => `unit-${i}`);

            const event = createTestEvent({
                pathParameters: { buildingID: testBuildingID },
                body: JSON.stringify({
                    unitIDs: manyUnitIDs,
                    updateType: 'absolute',
                    value: 1500
                })
            });
            const result = await bulkRentUpdate(event);

            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body!);
            expect(body.errors.unitIDs).toContain('Cannot update more than 100 units at once');
        });
    });

    describe('General Validation', () => {
        it('should handle missing path parameters', async () => {
            const event = createTestEvent({
                pathParameters: undefined,
                body: JSON.stringify({
                    unitIDs: ['unit-101'],
                    vacancyClass: 'Unoccupied'
                })
            });

            const result = await bulkStatusUpdate(event);

            expect(result.statusCode).toBe(404);
        });

        it('should handle missing buildingID in path parameters', async () => {
            const event = createTestEvent({
                pathParameters: {},
                body: JSON.stringify({
                    unitIDs: ['unit-101'],
                    vacancyClass: 'Unoccupied'
                })
            });

            const result = await bulkStatusUpdate(event);

            expect(result.statusCode).toBe(404);
        });
    });
});
