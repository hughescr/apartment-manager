import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { createMockEvent, dynamoDbMock, jest, resetAllMocks } from './unitTypes-test-setup';
import { mockGetResponse, mockPutResponse } from '../helpers/mock-responses';

// Import API functions directly - they will use the mocked DynamoDB client from test-setup
import { create } from '../../api/unitTypes';

describe('Unit Types API - Create Basic', () => {
    beforeAll(() => {
        resetAllMocks();
    });

    beforeEach(() => {
        // Reset all mock state including queued responses
        jest.clearAllMocks();
        jest.restoreAllMocks();

        // CRITICAL: Reset the mock completely to clear any queued responses
        dynamoDbMock.mockReset();
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
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
            // Mock the create operation
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...newUnitType, unitID: `MODEL#${newUnitType.modelID}` }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' },
                body: JSON.stringify(newUnitType),
                headers: { 'content-type': 'application/json' }
            });

            const result = await create(event);

            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body as string)).toEqual(newUnitType);
            expect(dynamoDbMock).toHaveBeenCalledTimes(2);
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

        it('should return 409 conflict when unit type already exists', async () => {
            expect.assertions(2);
            const newUnitType = {
                modelID: 'existing-model',
                modelName: 'Existing Model',
                beds: 2,
                baths: 2,
                buildingID: 'test-building-1'
            };
            // Mock the check for existing unit type (returns an existing item)
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse({
                ...newUnitType,
                unitID: `MODEL#${newUnitType.modelID}`
            }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1' },
                body: JSON.stringify(newUnitType),
                headers: { 'content-type': 'application/json' }
            });

            const result = await create(event);

            expect(result.statusCode).toBe(409);
            expect(JSON.parse(result.body as string)).toEqual({ error: 'Unit type already exists' });
        });

        describe('basic validation edge cases', () => {
            it('should validate empty modelName', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'test-model',
                    modelName: '   ', // Whitespace only
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1'
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.modelName).toBe('Model name cannot be empty');
            });

            it('should validate invalid modelID format', async () => {
                expect.assertions(2);
                const invalidData = {
                    modelID: 'invalid!@#$%',
                    modelName: 'Test Model',
                    beds: 2,
                    baths: 2,
                    buildingID: 'test-building-1'
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.modelID).toBe('Model ID can only contain letters, numbers, underscores, and hyphens');
            });

            it('should validate out-of-range beds and baths', async () => {
                expect.assertions(3);
                const invalidData = {
                    modelID: 'test-model',
                    modelName: 'Test Model',
                    beds: 11, // > 10
                    baths: 15, // > 10
                    buildingID: 'test-building-1'
                };

                const event = createMockEvent({
                    pathParameters: { buildingID: 'test-building-1' },
                    body: JSON.stringify(invalidData),
                    headers: { 'content-type': 'application/json' }
                });

                const result = await create(event);

                expect(result.statusCode).toBe(400);
                const errors = JSON.parse(result.body as string).errors;
                expect(errors.beds).toBe('Number of beds must be between 0 and 10');
                expect(errors.baths).toBe('Number of baths must be between 0 and 10');
            });
        });
    });
});
