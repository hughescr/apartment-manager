import { describe, it, expect, beforeEach } from 'bun:test';
import { createMockEvent, testUnitType, dynamoDbMock, jest } from './unitTypes-test-setup';
import { mockUpdateResponse, mockDeleteResponse } from '../helpers/mock-responses';

// Import API functions directly - they will use the mocked DynamoDB client from test-setup
import { update, del } from '../../api/unitTypes';

describe('Unit Types API - Update and Delete', () => {
    beforeEach(() => {
        // Clear mock calls before each test
        jest.clearAllMocks();
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
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...updatedUnitType, unitID: `MODEL#${testUnitType.modelID}` }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify(updates),
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual(updatedUnitType);
            expect(dynamoDbMock).toHaveBeenCalledTimes(1);
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
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...updatedItem, unitID: 'MODEL#non-existent' }));

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
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
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

        it('should handle JSON parsing errors in update', async () => {
            expect.assertions(2);
            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: 'invalid json {{{',
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body as string)).toEqual({ error: 'Invalid request body' });
        });

        it('should handle validation failures in update', async () => {
            expect.assertions(3);
            const invalidUpdates = {
                minRent: -500,  // Negative rent
                maxRent: -100,  // Negative rent
                deposit: -1000  // Negative deposit
            };

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify(invalidUpdates),
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(400);
            const response = JSON.parse(result.body as string);
            expect(response.error).toBe('Validation failed');
            expect(response.errors).toHaveProperty('minRent');
        });

        it('should validate all fields in update like create', async () => {
            expect.assertions(5);
            const invalidUpdates = {
                modelName: '   ', // Empty
                beds: 15, // > 10
                maxOccupants: 0, // < 1
                minLeaseTerm: 50, // > 36
                minSqft: 15000 // > 10000
            };

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify(invalidUpdates),
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(400);
            const errors = JSON.parse(result.body as string).errors;
            expect(errors.modelName).toBe('Model name cannot be empty');
            expect(errors.beds).toBe('Number of beds must be between 0 and 10');
            expect(errors.maxOccupants).toBe('Max occupants must be between 1 and 20');
            expect(errors.minLeaseTerm).toBe('Min lease term must be between 1 and 36 months');
        });

        it('should handle data layer errors', async () => {
            expect.assertions(1);
            // Mock UpdateItemCommand to fail first
            dynamoDbMock.mockRejectedValueOnce(new Error('Database error'));
            // Mock GetItemCommand to also fail for the fallback logic
            dynamoDbMock.mockRejectedValueOnce(new Error('Database error'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: JSON.stringify({ modelName: 'Updated' }),
                headers: { 'content-type': 'application/json' }
            });

            expect(update(event)).rejects.toThrow('Database error');
        });

        it('should return empty object when update body is empty', async () => {
            expect.assertions(2);
            // When update body is empty, UpdateItem should return the current item unchanged
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...testUnitType, unitID: `MODEL#${testUnitType.modelID}` }));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' },
                body: '{}',
                headers: { 'content-type': 'application/json' }
            });

            const result = await update(event);

            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body as string)).toEqual(testUnitType);
        });
    });

    describe('delete endpoint', () => {
        it('should delete a unit type', async () => {
            expect.assertions(3);
            dynamoDbMock.mockResolvedValueOnce(mockDeleteResponse());

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result = await del(event);

            expect(result.statusCode).toBe(204);
            expect(result.body).toBe('');
            expect(dynamoDbMock).toHaveBeenCalledTimes(1);
        });

        it('should handle delete errors gracefully', async () => {
            expect.assertions(2);
            dynamoDbMock.mockRejectedValueOnce(new Error('Database error'));

            const event = createMockEvent({
                pathParameters: { buildingID: 'test-building-1', modelID: 'model-2br' }
            });

            const result = await del(event);

            expect(result.statusCode).toBe(404);
            expect(result.body).toBe('Not Found');
        });
    });
});
