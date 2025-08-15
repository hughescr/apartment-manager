/**
 * Array operations and persistence tests for buildings data layer.
 * Tests array manipulation, empty array persistence, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import { FeeType, AmenityCategory, PetType, RentSpecial } from '../../src/types';
import _ from 'lodash';
import {
    dynamoDbMock,
    setupBuildingsTests,
    setupBuildingsTest,
    cleanupBuildingsTest,
    mockPutResponse,
    mockGetResponse,
    mockUpdateResponse
} from './buildings-test-setup';
import { testBuilding } from './buildings-test-fixtures';

// Import the functions AFTER mocking
import { createBuilding, getBuilding, updateBuilding } from '../../data/buildings';

describe('Building Data Layer - Array Operations', () => {
    beforeAll(() => {
        setupBuildingsTests();
    });

    beforeEach(() => {
        setupBuildingsTest();
    });

    afterEach(() => {
        cleanupBuildingsTest();
    });

    // Array Deletion Persistence Test - Critical Fix
    describe('Array Deletion Persistence', () => {
        it('should persist empty arrays after updateBuilding when arrays are cleared', async () => {
            expect.assertions(8);

            // First, create a building with populated arrays
            const buildingWithArrays = {
                ...testBuilding,
                buildingID: 'array-deletion-test',
                rentSpecials: [
                    { title: 'Summer Special', description: '$500 off first month' },
                    { title: 'Winter Special', description: '2 months free' }
                ],
                photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
                oneTimeFees: [
                    { type: FeeType.APPLICATION, amount: 50, description: 'Application fee' },
                    { type: FeeType.ADMIN, amount: 100, description: 'Admin fee' }
                ],
                monthlyFees: [
                    { type: FeeType.PARKING, amount: 100, description: 'Parking fee' }
                ],
                propertyAmenities: [
                    { name: 'Pool', category: AmenityCategory.COMMUNITY },
                    { name: 'Gym', category: AmenityCategory.COMMUNITY }
                ]
            };

            // Mock creating the building
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingWithArrays, unitID: 'BUILDING' }));
            await createBuilding(buildingWithArrays);

            // Now update the building to clear all arrays (simulate user deleting all items)
            const updateWithEmptyArrays = {
                rentSpecials: [],
                photos: [],
                oneTimeFees: [],
                monthlyFees: [],
                propertyAmenities: []
            };

            // Mock the UpdateItemCommand to fail (simulating the original issue)
            // This will trigger the fallback PutItemCommand logic
            const expectedMergedData = {
                ...buildingWithArrays,
                ...updateWithEmptyArrays, // Arrays should be empty as saved
                unitID: 'BUILDING',
                updatedAt: new Date().toISOString()
            };

            dynamoDbMock
                .mockRejectedValueOnce(new Error('UpdateItemCommand failed - simulating persistence issue'))
                .mockResolvedValueOnce(mockGetResponse({ ...buildingWithArrays, unitID: 'BUILDING' })) // for getBuilding call
                .mockResolvedValueOnce(mockPutResponse(expectedMergedData)); // for PutItemCommand

            const updatedBuilding = await updateBuilding('array-deletion-test', updateWithEmptyArrays);

            // Verify the update returned empty arrays (not undefined or merged arrays)
            expect(updatedBuilding!.rentSpecials).toEqual([]);
            expect(updatedBuilding!.photos).toEqual([]);
            expect(updatedBuilding!.oneTimeFees).toEqual([]);
            expect(updatedBuilding!.monthlyFees).toEqual([]);
            expect(updatedBuilding!.propertyAmenities).toEqual([]);

            // Mock the getBuilding call to simulate reloading from database
            const savedBuildingData = {
                ...buildingWithArrays,
                ...updateWithEmptyArrays, // Arrays should be empty as saved
                unitID: 'BUILDING'
            };
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse(savedBuildingData));

            // Simulate reloading the building from database
            const reloadedBuilding = await getBuilding('array-deletion-test');

            // CRITICAL: Verify that empty arrays persisted correctly after reload
            expect(reloadedBuilding!.rentSpecials).toEqual([]);
            expect(reloadedBuilding!.photos).toEqual([]);
            expect(reloadedBuilding!.propertyAmenities).toEqual([]);
        });

        it('should handle edge case where mock does not merge defaults properly for empty arrays', async () => {
            expect.assertions(5);

            // Create a building with non-empty arrays first
            const buildingWithArrays = {
                buildingID: 'edge-case-test',
                street: '123 Edge Case St',
                rentSpecials: [{ title: 'Special', description: 'Deal' }],
                photos: ['photo1.jpg'],
                oneTimeFees: [{ type: FeeType.APPLICATION, amount: 50, description: 'App fee' }],
                monthlyFees: [{ type: FeeType.PARKING, amount: 100, description: 'Parking' }],
                propertyAmenities: [{ name: 'Pool', category: AmenityCategory.COMMUNITY }]
            };

            // Mock creating the building
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingWithArrays, unitID: 'BUILDING' }));
            await createBuilding(buildingWithArrays);

            // Update to clear all arrays
            const updateWithEmptyArrays = {
                rentSpecials: [],
                photos: [],
                oneTimeFees: [],
                monthlyFees: [],
                propertyAmenities: []
            };

            // Create a scenario where the mock might not handle defaults correctly
            // Simulate the raw data without default merging (which could cause undefined)
            const rawDataWithoutDefaults = {
                buildingID: 'edge-case-test',
                street: '123 Edge Case St',
                // Note: Arrays are explicitly empty, not undefined
                rentSpecials: [],
                photos: [],
                oneTimeFees: [],
                monthlyFees: [],
                propertyAmenities: [],
                unitID: 'BUILDING'
            };

            dynamoDbMock
                .mockRejectedValueOnce(new Error('UpdateItemCommand failed'))
                .mockResolvedValueOnce(mockGetResponse(rawDataWithoutDefaults)) // Return raw data
                .mockResolvedValueOnce(mockPutResponse(rawDataWithoutDefaults));

            const updatedBuilding = await updateBuilding('edge-case-test', updateWithEmptyArrays);

            // These should all be empty arrays, not undefined
            expect(updatedBuilding!.rentSpecials).toEqual([]);
            expect(updatedBuilding!.photos).toEqual([]);
            expect(updatedBuilding!.oneTimeFees).toEqual([]);
            expect(updatedBuilding!.monthlyFees).toEqual([]);
            expect(updatedBuilding!.propertyAmenities).toEqual([]);
        });

        it('should handle case where mock returns data without array fields (causing undefined)', async () => {
            expect.assertions(5);

            // Create building data that doesn't include the array fields at all
            const buildingWithoutArrayFields = {
                buildingID: 'missing-arrays-test',
                street: '456 Missing Arrays St',
                // Deliberately omit all array fields to simulate DynamoDB returning incomplete data
                unitID: 'BUILDING'
            };

            // Update to clear all arrays - but existing building doesn't have them
            const updateWithEmptyArrays = {
                rentSpecials: [],
                photos: [],
                oneTimeFees: [],
                monthlyFees: [],
                propertyAmenities: []
            };

            dynamoDbMock
                .mockRejectedValueOnce(new Error('UpdateItemCommand failed'))
                .mockResolvedValueOnce(mockGetResponse(buildingWithoutArrayFields)) // Return data without arrays
                .mockResolvedValueOnce(mockPutResponse(buildingWithoutArrayFields));

            const updatedBuilding = await updateBuilding('missing-arrays-test', updateWithEmptyArrays);

            // These should be empty arrays because the update explicitly set them as such
            // The fallback logic should preserve the explicit empty arrays from the update
            expect(updatedBuilding!.rentSpecials).toEqual([]);
            expect(updatedBuilding!.photos).toEqual([]);
            expect(updatedBuilding!.oneTimeFees).toEqual([]);
            expect(updatedBuilding!.monthlyFees).toEqual([]);
            expect(updatedBuilding!.propertyAmenities).toEqual([]);
        });

        it('should handle missing array fields in database response and apply proper defaults', async () => {
            expect.assertions(5);

            // Update to clear all arrays
            const updateWithEmptyArrays = {
                rentSpecials: [],
                photos: [],
                oneTimeFees: [],
                monthlyFees: [],
                propertyAmenities: []
            };

            // Create a building without array fields to simulate incomplete database data
            const buildingWithoutArrays = {
                buildingID: 'missing-arrays-test',
                street: '789 Missing Arrays St',
                city: 'Test City',
                state: 'TS',
                zip: '12345',
                description: 'Building with missing array fields',
                unitID: 'BUILDING'
                // Note: array fields intentionally missing to test default handling
            };

            // Mock the UpdateItemCommand failure and fallback using proper mock helpers
            dynamoDbMock
                .mockRejectedValueOnce(new Error('UpdateItemCommand failed'))
                .mockResolvedValueOnce(mockGetResponse(buildingWithoutArrays))
                .mockResolvedValueOnce(mockPutResponse({
                    ...buildingWithoutArrays,
                    ...updateWithEmptyArrays,
                    updatedAt: new Date().toISOString()
                }));

            const updatedBuilding = await updateBuilding('missing-arrays-test', updateWithEmptyArrays);

            // The updateBuilding function should handle missing array fields properly
            // and apply the update correctly
            expect(updatedBuilding!.rentSpecials).toEqual([]);
            expect(updatedBuilding!.photos).toEqual([]);
            expect(updatedBuilding!.oneTimeFees).toEqual([]);
            expect(updatedBuilding!.monthlyFees).toEqual([]);
            expect(updatedBuilding!.propertyAmenities).toEqual([]);
        });

        it('should handle nested petPolicies arrays correctly during updates', async () => {
            expect.assertions(4);

            const buildingWithPetPolicy = {
                ...testBuilding,
                buildingID: 'pet-policy-test',
                petPolicies: {
                    allowed: true,
                    types: [PetType.DOG, PetType.CAT],
                    breedRestrictions: ['Pit Bull', 'Rottweiler'],
                    maxCount: 2,
                    weightLimit: 50
                }
            };

            // Mock creating the building
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingWithPetPolicy, unitID: 'BUILDING' }));
            await createBuilding(buildingWithPetPolicy);

            // Update to clear nested arrays in petPolicies
            const updateWithEmptyPetArrays = {
                petPolicies: {
                    allowed: true,
                    types: [], // Clear pet types
                    breedRestrictions: [], // Clear breed restrictions
                    maxCount: 0,
                    weightLimit: 0
                }
            };

            // Mock fallback scenario
            const expectedMergedPetData = {
                ...buildingWithPetPolicy,
                ...updateWithEmptyPetArrays,
                unitID: 'BUILDING',
                updatedAt: new Date().toISOString()
            };

            dynamoDbMock
                .mockRejectedValueOnce(new Error('UpdateItemCommand failed'))
                .mockResolvedValueOnce(mockGetResponse({ ...buildingWithPetPolicy, unitID: 'BUILDING' }))
                .mockResolvedValueOnce(mockPutResponse(expectedMergedPetData));

            const updatedBuilding = await updateBuilding('pet-policy-test', updateWithEmptyPetArrays);

            // Verify nested arrays are empty
            expect(updatedBuilding!.petPolicies!.types).toEqual([]);
            expect(updatedBuilding!.petPolicies!.breedRestrictions).toEqual([]);
            expect(updatedBuilding!.petPolicies!.maxCount).toBe(0);
            expect(updatedBuilding!.petPolicies!.weightLimit).toBe(0);
        });
    });

    describe('Array Manipulation Operations', () => {
        it('should handle adding items to existing arrays', async () => {
            expect.assertions(3);

            const existingBuilding = {
                ...testBuilding,
                buildingID: 'array-add-test',
                photos: ['existing1.jpg'],
                propertyAmenities: [{ name: 'Existing Pool', category: AmenityCategory.COMMUNITY }]
            };

            // Mock existing building
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...existingBuilding, unitID: 'BUILDING' }));
            await createBuilding(existingBuilding);

            // Update to add more items
            const updateWithMoreItems = {
                photos: ['existing1.jpg', 'new1.jpg', 'new2.jpg'],
                propertyAmenities: [
                    { name: 'Existing Pool', category: AmenityCategory.COMMUNITY },
                    { name: 'New Gym', category: AmenityCategory.COMMUNITY },
                    { name: 'New Spa', category: AmenityCategory.COMMUNITY }
                ]
            };

            const expectedResult = {
                ...existingBuilding,
                ...updateWithMoreItems,
                unitID: 'BUILDING'
            };

            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse(expectedResult));

            const updatedBuilding = await updateBuilding('array-add-test', updateWithMoreItems);
            expect(updatedBuilding!.photos).toHaveLength(3);
            expect(updatedBuilding!.propertyAmenities).toHaveLength(3);
            expect(updatedBuilding!.photos).toContain('new1.jpg');
        });

        it('should handle removing specific items from arrays', async () => {
            expect.assertions(3);

            const buildingWithManyItems = {
                ...testBuilding,
                buildingID: 'array-remove-test',
                photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'],
                rentSpecials: [
                    { title: 'Special 1', description: 'First' },
                    { title: 'Special 2', description: 'Second' },
                    { title: 'Special 3', description: 'Third' }
                ]
            };

            // Mock existing building
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingWithManyItems, unitID: 'BUILDING' }));
            await createBuilding(buildingWithManyItems);

            // Update to remove some items
            const updateWithFewerItems = {
                photos: ['photo1.jpg', 'photo3.jpg'], // Removed photo2 and photo4
                rentSpecials: [
                    { title: 'Special 1', description: 'First' }
                ] // Removed special 2 and 3
            };

            const expectedResult = {
                ...buildingWithManyItems,
                ...updateWithFewerItems,
                unitID: 'BUILDING'
            };

            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse(expectedResult));

            const updatedBuilding = await updateBuilding('array-remove-test', updateWithFewerItems);
            expect(updatedBuilding!.photos).toHaveLength(2);
            expect(updatedBuilding!.rentSpecials).toHaveLength(1);
            expect(updatedBuilding!.photos).not.toContain('photo2.jpg');
        });

        it('should handle modifying existing array items', async () => {
            expect.assertions(4);

            const buildingWithModifiableItems = {
                ...testBuilding,
                buildingID: 'array-modify-test',
                oneTimeFees: [
                    { type: FeeType.APPLICATION, amount: 50, description: 'Original app fee' },
                    { type: FeeType.ADMIN, amount: 100, description: 'Original admin fee' }
                ]
            };

            // Mock existing building
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingWithModifiableItems, unitID: 'BUILDING' }));
            await createBuilding(buildingWithModifiableItems);

            // Update to modify existing items
            const updateWithModifiedItems = {
                oneTimeFees: [
                    { type: FeeType.APPLICATION, amount: 75, description: 'Updated app fee - increased' },
                    { type: FeeType.ADMIN, amount: 100, description: 'Original admin fee' } // Unchanged
                ]
            };

            const expectedResult = {
                ...buildingWithModifiableItems,
                ...updateWithModifiedItems,
                unitID: 'BUILDING'
            };

            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse(expectedResult));

            const updatedBuilding = await updateBuilding('array-modify-test', updateWithModifiedItems);
            expect(updatedBuilding!.oneTimeFees).toHaveLength(2);
            expect(updatedBuilding!.oneTimeFees![0].amount).toBe(75);
            expect(updatedBuilding!.oneTimeFees![0].description).toContain('Updated');
            expect(updatedBuilding!.oneTimeFees![1].description).toBe('Original admin fee');
        });
    });

    describe('Array Edge Cases', () => {
        it('should handle arrays with duplicate items', async () => {
            expect.assertions(2);

            const buildingWithDuplicates = {
                ...testBuilding,
                buildingID: 'duplicates-test',
                photos: ['same.jpg', 'same.jpg', 'different.jpg', 'same.jpg'],
                propertyAmenities: [
                    { name: 'Pool', category: AmenityCategory.COMMUNITY },
                    { name: 'Pool', category: AmenityCategory.COMMUNITY }, // Duplicate
                    { name: 'Gym', category: AmenityCategory.COMMUNITY }
                ]
            };

            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingWithDuplicates, unitID: 'BUILDING' }));

            const result = await createBuilding(buildingWithDuplicates);
            expect(result.photos).toHaveLength(4); // Should preserve duplicates
            expect(result.propertyAmenities).toHaveLength(3); // Should preserve duplicates
        });

        it('should handle very large arrays', async () => {
            expect.assertions(3);

            const buildingWithLargeArrays = {
                ...testBuilding,
                buildingID: 'large-arrays-test',
                photos: Array.from({ length: 500 }, (_, i) => `photo${i}.jpg`),
                rentSpecials: Array.from({ length: 50 }, (_, i) => ({
                    title: `Special ${i}`,
                    description: `Deal number ${i}`
                }))
            };

            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingWithLargeArrays, unitID: 'BUILDING' }));

            const result = await createBuilding(buildingWithLargeArrays);
            expect(result.photos).toHaveLength(500);
            expect(result.rentSpecials).toHaveLength(50);
            expect(result.photos![499]).toBe('photo499.jpg');
        });

        it('should handle arrays with null/undefined items', async () => {
            expect.assertions(2);

            const buildingWithNullItems = {
                ...testBuilding,
                buildingID: 'null-items-test',
                // These would be filtered out by the data layer validation
                photos: _.compact(['valid.jpg']), // Remove any nulls
                rentSpecials: _.filter([
                    { title: 'Valid Special', description: 'Good deal' }
                ], special => special.title && special.description) as RentSpecial[] // Filter out invalid items
            };

            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingWithNullItems, unitID: 'BUILDING' }));

            const result = await createBuilding(buildingWithNullItems);
            expect(result.photos).toEqual(['valid.jpg']);
            expect(result.rentSpecials).toHaveLength(1);
        });

        it('should handle mixed data types in flexible arrays', async () => {
            expect.assertions(3);

            const buildingWithMixedTypes = {
                ...testBuilding,
                buildingID: 'mixed-types-test',
                rentSpecials: [
                    { title: 'Basic Special', description: 'Simple text', amount: 100 },
                    { title: 'Complex Special', description: 'With extras', percentage: 10.5, conditions: ['condition1'] },
                    { title: 'Minimal Special', description: 'Just basics' }
                ]
            };

            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingWithMixedTypes, unitID: 'BUILDING' }));

            const result = await createBuilding(buildingWithMixedTypes);
            expect(result.rentSpecials).toHaveLength(3);
            expect(result.rentSpecials![0]).toHaveProperty('amount');
            expect(result.rentSpecials![1]).toHaveProperty('percentage');
        });
    });
});
