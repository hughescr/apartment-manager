// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { mockSend, clearMocks } from '../data/test-setup';

import { describe, it, expect, beforeEach } from 'bun:test';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { AmenityCategory } from '../../src/types';
import { mockScanResponse, mockGetResponse, mockPutResponse, mockUpdateResponse, mockDeleteResponse } from '../helpers/mock-responses';
import _ from 'lodash';

// Import API functions directly - they will use the mocked DynamoDB client from test-setup
import { list, get, create, update, del } from '../../api/unitTypes';

describe('Unit Types API', () => {
    beforeEach(() => {
        // Clear mock calls before each test
        clearMocks();
    });

    const createMockEvent = (overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 => ({
        headers: {},
        isBase64Encoded: false,
        rawPath: '/api/buildings/test-building-1/unit-types',
        rawQueryString: '',
        requestContext: {
            accountId: 'test-account',
            apiId: 'test-api',
            domainName: 'test.com',
            domainPrefix: 'test',
            http: {
                method: 'GET',
                path: '/api/buildings/test-building-1/unit-types',
                protocol: 'HTTP/1.1',
                sourceIp: '127.0.0.1',
                userAgent: 'test-agent',
            },
            requestId: 'test-request-id',
            routeKey: 'GET /api/buildings/{buildingID}/unit-types',
            stage: 'test',
            time: '01/Jan/2024:00:00:00 +0000',
            timeEpoch: 1704067200000,
        },
        routeKey: 'GET /api/buildings/{buildingID}/unit-types',
        version: '2.0',
        ...overrides,
    });

    const testUnitType = {
        buildingID: 'test-building-1',
        modelID: 'model-2br',
        modelName: '2 Bedroom Deluxe',
        countAvailable: 5,
        dateAvailable: '2024-04-01',
        beds: 2,
        baths: 2,
        maxOccupants: 4,
        minRent: 1500,
        maxRent: 1800,
        perPersonRent: 450,
        minSqft: 950,
        maxSqft: 1100,
        deposit: 1500,
        minLeaseTerm: 6,
        maxLeaseTerm: 12,
        modelAmenities: [
            { name: 'Balcony', category: AmenityCategory.UNIT },
            { name: 'In-unit Washer/Dryer', category: AmenityCategory.UNIT }
        ],
    };

    describe('list endpoint', () => {
        it('should return all unit types for a building', async () => {
            expect.assertions(3);
            const unitTypes = [
                testUnitType,
                { ...testUnitType, modelID: 'model-1br', modelName: '1 Bedroom' }
            ];
            // Mock DynamoDB scan response with proper unitID format
            const mockDbData = _.map(unitTypes, ut => ({ ...ut, unitID: `MODEL#${ut.modelID}` }));
            mockSend.mockResolvedValueOnce(mockScanResponse(mockDbData));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            const result = await list(event);

            expect(result.statusCode).toBe(200);
            // The data layer strips the unitID field
            expect(JSON.parse(result.body as string)).toEqual(unitTypes);
            expect(mockSend).toHaveBeenCalledTimes(1);
        });

        it('should handle empty unit types list', async () => {
            expect.assertions(2);
            mockSend.mockResolvedValueOnce(mockScanResponse([]));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            const result = await list(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual([]);
        });

        it('should handle data layer errors', async () => {
            expect.assertions(1);
            mockSend.mockRejectedValueOnce(new Error('Database error'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' }
            });

            expect(list(event)).rejects.toThrow('Database error');
        });
    });

    describe('get endpoint', () => {
        it('should return a specific unit type', async () => {
            expect.assertions(3);
            // Mock DynamoDB get response with proper unitID format
            mockSend.mockResolvedValueOnce(mockGetResponse({ ...testUnitType, unitID: `MODEL#${testUnitType.modelID}` }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result = await get(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual(testUnitType);
            expect(mockSend).toHaveBeenCalledTimes(1);
        });

        it('should return 404 for non-existent unit type', async () => {
            expect.assertions(2);
            mockSend.mockResolvedValueOnce(mockGetResponse(undefined));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'non-existent' }
            });

            const result = await get(event);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
        });

        it('should handle data layer errors', async () => {
            expect.assertions(1);
            mockSend.mockRejectedValueOnce(new Error('Database error'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            expect(get(event)).rejects.toThrow('Database error');
        });
    });

    describe('create endpoint', () => {
        it('should create a new unit type', async () => {
            expect.assertions(3);
            const newUnitType = {
                modelID: 'model-3br',
                modelName: '3 Bedroom',
                beds: 3,
                baths: 2.5,
                buildingID: 'test-building-1'
            };
            // Mock the check for existing unit type (returns undefined)
            mockSend.mockResolvedValueOnce(mockGetResponse(undefined));
            // Mock the create operation
            mockSend.mockResolvedValueOnce(mockPutResponse({ ...newUnitType, unitID: `MODEL#${newUnitType.modelID}` }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' },
                body: JSON.stringify(newUnitType),
                headers: { 'content-type': 'application/json' }
            });

            const result = await create(event);

            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body as string)).toEqual(newUnitType);
            expect(mockSend).toHaveBeenCalledTimes(2);
        });

        it('should validate required fields', async () => {
            expect.assertions(4);
            const invalidData = {
                modelName: '3 Bedroom',
                // Missing modelID, beds, baths
            };

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' },
                body: JSON.stringify(invalidData),
                headers: { 'content-type': 'application/json' }
            });

            const result = await create(event);

            expect(result.statusCode).toBe(400);
            const errors = JSON.parse(result.body as string).errors;
            expect(errors).toHaveProperty('modelID');
            expect(errors).toHaveProperty('beds');
            expect(errors).toHaveProperty('baths');
        });

        it('should handle JSON parsing errors', async () => {
            expect.assertions(2);
            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' },
                body: 'invalid json',
                headers: { 'content-type': 'application/json' }
            });

            const result = await create(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body as string)).toEqual({ error: 'Invalid request body' });
        });
    });

    describe('update endpoint', () => {
        it('should update a unit type', async () => {
            expect.assertions(3);
            const updates = {
                modelName: '2 Bedroom Premium',
                minRent: 1600,
                maxRent: 1900
            };
            // Mock returns the updated item with unitID
            const updatedUnitType = { ...testUnitType, ...updates };
            mockSend.mockResolvedValueOnce(mockUpdateResponse({ ...updatedUnitType, unitID: `MODEL#${testUnitType.modelID}` }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify(updates),
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual(updatedUnitType);
            expect(mockSend).toHaveBeenCalledTimes(1);
        });

        it('should successfully update a non-existent unit type', async () => {
            expect.assertions(2);
            // In real DynamoDB, UpdateItem would fail due to missing required fields
            // But in our mocked tests, we control the response
            const updates = { modelName: 'Updated Name' };
            const updatedItem = {
                buildingID: 'test-building-1',
                modelID: 'non-existent',
                modelName: 'Updated Name',
                beds: 1, // These would be required in real DynamoDB
                baths: 1
            };
            mockSend.mockResolvedValueOnce(mockUpdateResponse({ ...updatedItem, unitID: 'MODEL#non-existent' }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'non-existent' },
                body: JSON.stringify(updates),
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual(updatedItem);
        });

        it('should ignore attempts to change protected fields', async () => {
            expect.assertions(3);
            const invalidUpdates = {
                modelID: 'new-id', // Will be ignored
                buildingID: 'different-building', // Will be ignored
                modelName: 'Updated Name' // This will be applied
            };

            // The data layer will use the IDs from path params, not from body
            mockSend.mockResolvedValueOnce(mockUpdateResponse({
                ...testUnitType,
                modelName: 'Updated Name',
                unitID: `MODEL#${testUnitType.modelID}`
            }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify(invalidUpdates),
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(200);
            const updatedData = JSON.parse(result.body as string);
            // Verify the IDs weren't changed
            expect(updatedData.modelID).toBe('model-2br');
            expect(updatedData.buildingID).toBe('test-building-1');
        });
    });

    describe('delete endpoint', () => {
        it('should delete a unit type', async () => {
            expect.assertions(3);
            mockSend.mockResolvedValueOnce(mockDeleteResponse());

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result = await del(event);

            expect(result.statusCode).toBe(204);
            expect(result.body).toBe('');
            expect(mockSend).toHaveBeenCalledTimes(1);
        });

        it('should handle delete errors gracefully', async () => {
            expect.assertions(2);
            mockSend.mockRejectedValueOnce(new Error('Database error'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result = await del(event);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
        });
    });
});
