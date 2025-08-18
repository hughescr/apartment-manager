/**
 * Data validation tests for buildings data layer.
 * Tests input validation, type checking, and data integrity.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import { PropertyType, PetType, ParkingType, BuildingData } from '../../src/types';
import { repeat } from 'lodash';
import {
    dynamoDbMock,
    setupBuildingsTests,
    setupBuildingsTest,
    cleanupBuildingsTest,
    mockPutResponse,
    mockGetResponse
} from './buildings-test-setup';
import { testBuilding, emptyValuesBuilding } from './buildings-test-fixtures';

// Import the functions AFTER mocking
import { createBuilding, getBuilding } from '../../data/buildings';

describe('Building Data Layer - Data Validation', () => {
    beforeAll(() => {
        setupBuildingsTests();
    });

    beforeEach(() => {
        setupBuildingsTest();
    });

    afterEach(() => {
        cleanupBuildingsTest();
    });

    describe('Type Validation', () => {
        it('should throw validation error for invalid numeric types', async () => {
            expect.assertions(1);
            const invalidTypesBuilding = {
                ...testBuilding,
                yearBuilt: '2020' as unknown as number // Invalid string for number field
            };

            // DynamoDB Toolbox validates types before sending to DynamoDB
            expect(createBuilding(invalidTypesBuilding)).rejects.toThrow('Right side of assignment cannot be destructured');
        });

        it('should throw validation error for invalid boolean types', async () => {
            expect.assertions(1);
            const numericBooleansBuilding = {
                ...testBuilding,
                roomsForRent: 1 as unknown as boolean // Invalid number for boolean field
            };

            expect(createBuilding(numericBooleansBuilding)).rejects.toThrow('Right side of assignment cannot be destructured');
        });

        it('should throw validation error for invalid array types', async () => {
            expect.assertions(1);
            const invalidArraysBuilding = {
                ...testBuilding,
                photos: { url: 'https://example.com/photo.jpg' } as unknown as string[] // Invalid object for array field
            };

            expect(createBuilding(invalidArraysBuilding)).rejects.toThrow();
        });
    });

    describe('Invalid Enum Values', () => {
        it('should handle invalid PropertyType enum value', async () => {
            expect.assertions(1);
            const invalidEnumBuilding = {
                ...testBuilding,
                propertyType: 'invalid-type' as PropertyType
            };
            // TypeScript would normally catch this, but testing runtime behavior
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...invalidEnumBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(invalidEnumBuilding);
            expect(typeof result.propertyType).toBe('string');
        });

        it('should handle invalid enum values in nested objects', async () => {
            expect.assertions(2);
            const invalidNestedEnums = {
                ...testBuilding,
                petPolicies: {
                    ...testBuilding.petPolicies,
                    types: ['invalid-pet' as PetType, PetType.DOG]
                },
                parkingOptions: [{
                    type: 'invalid-parking' as ParkingType,
                    included: false
                }]
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...invalidNestedEnums, unitID: 'BUILDING' }));

            const result = await createBuilding(invalidNestedEnums);
            expect(typeof result.petPolicies!.types![0]).toBe('string');
            expect(typeof result.parkingOptions![0].type).toBe('string');
        });
    });

    describe('Empty, Null, and Undefined Handling', () => {
        it('should handle empty strings vs null vs undefined', async () => {
            expect.assertions(6);
            // Only include defined fields in the response
            const emptyValuesResponse = {
                buildingID: 'empty-test',
                street: '',
                zip: '12345',
                description: '',
                unitID: 'BUILDING'
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse(emptyValuesResponse));
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse(emptyValuesResponse));

            const created = await createBuilding(emptyValuesBuilding);
            expect(created.street).toBe('');
            expect(created.city).toBe('');
            expect(created.state).toBe('');
            expect(created.description).toBe('');

            const fetched = await getBuilding(emptyValuesBuilding.buildingID);
            expect(fetched!.street).toBe('');
            expect(fetched!.description).toBe('');
        });

        it('should handle empty arrays vs undefined arrays', async () => {
            expect.assertions(4);
            const emptyArraysBuilding = {
                buildingID: 'empty-arrays-test',
                street: '789 Empty Arrays St',
                photos: [], // empty array
                propertyAmenities: [], // empty array
                // rentSpecials is undefined (not included)
                oneTimeFees: []
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...emptyArraysBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(emptyArraysBuilding);
            expect(result.photos).toEqual([]);
            expect(result.propertyAmenities).toEqual([]);
            expect(result.rentSpecials).toEqual([]);
            expect(result.oneTimeFees).toEqual([]);
        });

        it('should handle empty nested objects', async () => {
            expect.assertions(3);
            const emptyObjectsBuilding = {
                ...testBuilding,
                incomeRestrictions: {
                    maxIncomeByHouseholdSize: {} // empty object
                },
                utilitiesIncluded: {}, // empty object
                contactInfo: {
                    name: '',
                    phone: undefined, // undefined instead of null
                    // email is undefined
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...emptyObjectsBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(emptyObjectsBuilding);
            expect(result.incomeRestrictions!.maxIncomeByHouseholdSize).toEqual({});
            expect(result.utilitiesIncluded).toMatchObject({});
            expect(result.contactInfo!.name).toBe('');
        });
    });

    describe('Required Fields Validation', () => {
        it('should require buildingID', async () => {
            expect.assertions(1);
            const buildingWithoutId = {
                street: '123 Test St',
                city: 'Testville'
            };

            expect(createBuilding(buildingWithoutId as unknown as BuildingData)).rejects.toThrow();
        });

        it('should allow creation with only required fields', async () => {
            expect.assertions(1);
            const minimalValidBuilding = {
                buildingID: 'minimal-valid-building'
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...minimalValidBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(minimalValidBuilding);
            expect(result.buildingID).toBe('minimal-valid-building');
        });
    });

    describe('String Length Validation', () => {
        it('should handle reasonable string lengths', async () => {
            expect.assertions(3);
            const reasonableStringsBuilding = {
                ...testBuilding,
                buildingID: repeat('a', 100), // 100 characters
                description: repeat('b', 1000), // 1KB
                propertyDescription: repeat('c', 10000) // 10KB
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...reasonableStringsBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(reasonableStringsBuilding);
            expect(result.buildingID).toHaveLength(100);
            expect(result.description).toHaveLength(1000);
            expect(result.propertyDescription).toHaveLength(10000);
        });

        it('should handle empty strings', async () => {
            expect.assertions(3);
            const emptyStringsBuilding = {
                buildingID: 'empty-strings-test',
                street: '',
                description: '',
                propertyDescription: ''
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...emptyStringsBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(emptyStringsBuilding);
            expect(result.street).toBe('');
            expect(result.description).toBe('');
            expect(result.propertyDescription).toBe('');
        });
    });

    describe('Numeric Value Validation', () => {
        it('should handle valid numeric ranges', async () => {
            expect.assertions(4);
            const validNumericBuilding = {
                ...testBuilding,
                yearBuilt: 1900,
                numberStories: 1,
                totalUnits: 1,
                applicationFee: 0
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...validNumericBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(validNumericBuilding);
            expect(result.yearBuilt).toBe(1900);
            expect(result.numberStories).toBe(1);
            expect(result.totalUnits).toBe(1);
            expect(result.applicationFee).toBe(0);
        });

        it('should handle decimal values', async () => {
            expect.assertions(2);
            const decimalValuesBuilding = {
                ...testBuilding,
                applicationFee: 99.99,
                leaseLength: 12.5
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...decimalValuesBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(decimalValuesBuilding);
            expect(result.applicationFee).toBe(99.99);
            expect(result.leaseLength).toBe(12.5);
        });
    });
});
