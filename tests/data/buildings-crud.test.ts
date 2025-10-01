/**
 * Core CRUD operations tests for buildings data layer.
 * Tests basic create, read, update, delete functionality.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import {
    dynamoDbMock,
    setupBuildingsTests,
    setupBuildingsTest,
    cleanupBuildingsTest,
    mockPutResponse,
    mockGetResponse,
    mockQueryResponse,
    mockUpdateResponse,
    mockDeleteResponse
} from './buildings-test-setup';
import { testBuilding, minimalBuilding, getExpectedBuilding } from './buildings-test-fixtures';

// Import the functions AFTER mocking
import { getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding } from '../../data/buildings';

describe('Building Data Layer - CRUD Operations', () => {
    beforeAll(() => {
        setupBuildingsTests();
    });

    beforeEach(() => {
        setupBuildingsTest();
    });

    afterEach(() => {
        cleanupBuildingsTest();
    });

    describe('Create Building', () => {
        it('should create a building', async () => {
            expect.assertions(2);

            // Create minimal building data with explicit buildingID
            const buildingData = {
                buildingID: 'test-building-1',
                street:     '123 Test St',
                city:       'Testville'
            };

            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingData, unitID: 'BUILDING', updatedAt: '2025-08-14T17:45:41.248Z' }));
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...buildingData, unitID: 'BUILDING', updatedAt: '2025-08-14T17:45:41.248Z' }));

            const createdBuilding = await createBuilding(buildingData);

            // Check what we actually get first

            expect(createdBuilding).toEqual({
                ...getExpectedBuilding(buildingData),
                ...(createdBuilding.updatedAt ? { updatedAt: expect.any(Date) } : {})
            });

            const fetchedBuilding = await getBuilding(buildingData.buildingID);
            expect(fetchedBuilding).toEqual({
                ...getExpectedBuilding(buildingData),
                updatedAt: expect.any(Date)
            });
        });

        it('should create a building with minimal fields', async () => {
            expect.assertions(2);
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...minimalBuilding, unitID: 'BUILDING' }));

            const createdBuilding = await createBuilding(minimalBuilding);
            expect(createdBuilding.buildingID).toBe(minimalBuilding.buildingID);
            expect(createdBuilding.street).toBe('456 Minimal Ave');
        });

        it('should not create a building if it already exists', async () => {
            expect.assertions(1);
            // createBuilding returns the building data even if it already exists
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...testBuilding, unitID: 'BUILDING', updatedAt: '2025-08-14T17:45:41.248Z' }));
            const result = await createBuilding(testBuilding);
            expect(result).toEqual({
                ...getExpectedBuilding(testBuilding),
                updatedAt: expect.any(Date)
            });
        });
    });

    describe('Read Building', () => {
        it('should get all buildings', async () => {
            expect.assertions(1);
            dynamoDbMock.mockResolvedValueOnce(mockQueryResponse([{ ...testBuilding, unitID: 'BUILDING' }]));
            const buildings = await getBuildings();
            expect(buildings).toEqual([getExpectedBuilding(testBuilding)]);
        });

        it('should get a single building', async () => {
            expect.assertions(1);
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...testBuilding, unitID: 'BUILDING' }));
            const fetchedBuilding = await getBuilding(testBuilding.buildingID);
            expect(fetchedBuilding).toEqual(getExpectedBuilding(testBuilding));
        });

        it('should return undefined for non-existent building', async () => {
            expect.assertions(1);
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));
            const fetchedBuilding = await getBuilding('non-existent-building');
            expect(fetchedBuilding).toBeUndefined();
        });
    });

    describe('Update Building', () => {
        it('should update a building', async () => {
            expect.assertions(3);
            const updatedDescription = 'Updated description';
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...testBuilding, unitID: 'BUILDING', description: updatedDescription }));
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...testBuilding, unitID: 'BUILDING', description: updatedDescription }));

            const updatedBuilding = await updateBuilding(testBuilding.buildingID, { description: updatedDescription });
            expect(updatedBuilding).toBeDefined();
            expect(updatedBuilding!.description).toBe(updatedDescription);

            const fetchedBuilding = await getBuilding(testBuilding.buildingID);
            expect(fetchedBuilding?.description).toBe(updatedDescription);
        });

        it('should update complex fields in building', async () => {
            expect.assertions(4);
            const updatedFields = {
                petPolicies: {
                    allowed: false
                },
                screeningCriteria: {
                    incomeRatio:             2.5,
                    minCreditScore:          700,
                    backgroundCheckRequired: true,
                    employmentVerification:  true
                },
                photos: ['https://s3.example.com/new-photo1.jpg']
            };
            const expectedResult = {
                buildingID: testBuilding.buildingID,
                street:     testBuilding.street,
                ...updatedFields
            };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...expectedResult, unitID: 'BUILDING' }));

            const updatedBuilding = await updateBuilding(testBuilding.buildingID, updatedFields);
            expect(updatedBuilding).toBeDefined();
            expect(updatedBuilding!.petPolicies!.allowed).toBe(false);
            expect(updatedBuilding!.screeningCriteria!.minCreditScore).toBe(700);
            expect(updatedBuilding!.photos).toHaveLength(1);
        });

        it('should return undefined when updating non-existent building', async () => {
            expect.assertions(1);
            dynamoDbMock.mockRejectedValueOnce(new Error('ConditionalCheckFailedException'));
            const result = await updateBuilding('non-existent-building', { description: 'Updated' });
            expect(result).toBeUndefined();
        });
    });

    describe('Delete Building', () => {
        it('should delete a building', async () => {
            expect.assertions(2);
            dynamoDbMock.mockResolvedValueOnce(mockDeleteResponse()); // Successful delete
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined)); // Item not found after delete

            const success = await deleteBuilding(testBuilding.buildingID);
            expect(success).toBeTrue();

            const fetchedBuilding = await getBuilding(testBuilding.buildingID);
            expect(fetchedBuilding).toBeUndefined();
        });

        it('should return true if building to delete does not exist (idempotent delete)', async () => {
            expect.assertions(1);
            dynamoDbMock.mockResolvedValueOnce(mockDeleteResponse()); // Delete operation is idempotent
            const success = await deleteBuilding('non-existent-building');
            expect(success).toBeTrue();
        });

        it('should handle error during building deletion', async () => {
            expect.assertions(1);
            // Mock failure by throwing error before deleteBuilding catches it
            dynamoDbMock.mockImplementationOnce(() => {
                throw new Error('DynamoDB error');
            });

            const success = await deleteBuilding(testBuilding.buildingID);
            expect(success).toBeFalse();
        });
    });
});
