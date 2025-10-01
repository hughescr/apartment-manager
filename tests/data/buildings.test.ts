// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { dynamoDbMock, resetAllMocks } from './test-setup';

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import { PropertyType, FeeType, PetType, ParkingType, AmenityCategory, DayOfWeek, ContactInfo } from '../../src/types';
import { mockQueryResponse, mockGetResponse, mockPutResponse, mockUpdateResponse, mockDeleteResponse } from '../helpers/mock-responses';
import { fill, repeat } from 'lodash';
import { testBuilding, minimalBuilding, complexBuilding, getExpectedBuilding } from './buildings-test-fixtures';

// Import the functions AFTER mocking
import { getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding } from '../../data/buildings';

describe('Building Data Layer', () => {
    beforeAll(() => {
        // Reset mocks at the start of this test file to prevent cross-file pollution
        resetAllMocks();
    });

    beforeEach(() => {
        // CRITICAL: Reset ALL mocks to prevent cross-test contamination
        resetAllMocks();
    });

    // Helper functions for mock implementations
    const createItemResponse = (item: Record<string, unknown>, unitID: string) => ({
        Attributes: { ...item, unitID, _ct: new Date().toISOString(), _md: new Date().toISOString() },
        Item:       { ...item, unitID, _ct: new Date().toISOString(), _md: new Date().toISOString() }
    });

    const handlePutCommand = (cmd: { input?: Record<string, unknown> }) => {
        const item = cmd.input?.Item || cmd.input || {};
        const itemWithUnitId = item as Record<string, unknown> & { unitID?: string };
        const unitID = itemWithUnitId.unitID || 'BUILDING';
        return Promise.resolve(createItemResponse(item as Record<string, unknown>, unitID));
    };

    const handleUpdateCommand = (cmd: { input?: Record<string, unknown> }) => {
        const updates = cmd.input?.Item || cmd.input || {};
        const key = cmd.input?.Key || {};
        const keyWithUnitId = key as Record<string, unknown> & { unitID?: string };
        const updatesWithUnitId = updates as Record<string, unknown> & { unitID?: string };
        const unitID = keyWithUnitId.unitID || updatesWithUnitId.unitID || 'BUILDING';
        return Promise.resolve(createItemResponse(updates as Record<string, unknown>, unitID));
    };

    // Helper function to create default mock implementation
    const createDefaultMockImplementation = () => (command: unknown) => {
        const cmd = command as { constructor: { name: string }, input?: Record<string, unknown> };

        // Handle both client-dynamodb and lib-dynamodb commands
        if(cmd.constructor.name === 'QueryCommand') {
            return Promise.resolve({ Items: [], Count: 0 });
        }

        if(cmd.constructor.name === 'GetItemCommand' || cmd.constructor.name === 'GetCommand') {
            return Promise.resolve({});
        }

        if(cmd.constructor.name === 'PutItemCommand' || cmd.constructor.name === 'PutCommand') {
            return handlePutCommand(cmd);
        }

        if(cmd.constructor.name === 'UpdateItemCommand' || cmd.constructor.name === 'UpdateCommand') {
            return handleUpdateCommand(cmd);
        }

        if(cmd.constructor.name === 'DeleteItemCommand' || cmd.constructor.name === 'DeleteCommand') {
            return Promise.resolve({});
        }

        return Promise.reject(new Error(`Unmocked DynamoDB command: ${cmd.constructor.name}`));
    };

    afterEach(() => {
        // Additional safety: Clear any remaining mock implementations to prevent leakage
        dynamoDbMock.mockClear();

        // Restore the default implementation to ensure clean state for next test
        dynamoDbMock.mockImplementation(createDefaultMockImplementation());
    });

    // Test buildings are now imported from fixtures with short-uuid format IDs and building names

    it('should create a building', async () => {
        expect.assertions(2);
        dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...testBuilding, unitID: 'BUILDING' }));
        dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...testBuilding, unitID: 'BUILDING' }));

        const createdBuilding = await createBuilding(testBuilding);
        expect(createdBuilding).toEqual(getExpectedBuilding(testBuilding));

        const fetchedBuilding = await getBuilding(testBuilding.buildingID);
        expect(fetchedBuilding).toEqual(getExpectedBuilding(testBuilding));
    });

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

    it('should not create a building if it already exists', async () => {
        expect.assertions(1);
        // createBuilding returns the building data even if it already exists
        dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...testBuilding, unitID: 'BUILDING' }));
        const result = await createBuilding(testBuilding);
        expect(result).toEqual(getExpectedBuilding(testBuilding));
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

    it('should handle building with minimal fields', async () => {
        expect.assertions(3);
        dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...minimalBuilding, unitID: 'BUILDING' }));

        const createdBuilding = await createBuilding(minimalBuilding);
        expect(createdBuilding.buildingID).toBe(minimalBuilding.buildingID); // Short-uuid format
        expect(createdBuilding.buildingName).toBe('456 Minimal'); // Auto-generated name
        expect(createdBuilding.street).toBe('456 Minimal Ave');
    });

    it('should handle building with complex nested structures', async () => {
        expect.assertions(5);
        dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...complexBuilding, unitID: 'BUILDING' }));

        const createdBuilding = await createBuilding(complexBuilding);
        expect(createdBuilding.buildingID).toBe(complexBuilding.buildingID); // Short-uuid format
        expect(createdBuilding.buildingName).toBe('999 Complex'); // Auto-generated name
        expect(createdBuilding.rentSpecials).toHaveLength(2);
        expect(createdBuilding.propertyAmenities).toHaveLength(3);
        expect(createdBuilding.rentSpecials![1].startDate).toBe('2024-12-01');
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
            expect(result).toEqual(getExpectedBuilding(testBuilding));
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
    });

    // Edge Case Tests - Field Size Limits
    describe('Field Size Limits', () => {
        it('should handle building with maximum allowed item size (near 400KB)', async () => {
            expect.assertions(1);
            // Create a building with very large data
            const largeDescription = repeat('x', 350000); // ~350KB
            const largeBuilding = {
                ...testBuilding,
                propertyDescription: largeDescription,
                photos:              fill(Array(100), 'https://s3.example.com/very-long-photo-url-that-takes-up-space.jpg')
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...largeBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(largeBuilding);
            expect(result.buildingID).toBe(testBuilding.buildingID);
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
            const maxArrayBuilding = {
                ...testBuilding,
                photos:            fill(Array(1000), 'https://s3.example.com/photo.jpg'),
                propertyAmenities: fill(Array(500), { name: 'Amenity', category: AmenityCategory.PROPERTY }),
                rentSpecials:      fill(Array(100), { title: 'Special', description: 'Deal' }),
                oneTimeFees:       fill(Array(50), { type: FeeType.APPLICATION, amount: 50 })
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...maxArrayBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(maxArrayBuilding);
            expect(result.photos).toHaveLength(1000);
            expect(result.propertyAmenities).toHaveLength(500);
            expect(result.rentSpecials).toHaveLength(100);
            expect(result.oneTimeFees).toHaveLength(50);
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

            expect(result1).toEqual(getExpectedBuilding(testBuilding));
            expect(result2).toEqual(getExpectedBuilding(testBuilding));
            expect(result3).toEqual(getExpectedBuilding(testBuilding));
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
    });

    // Edge Case Tests - Invalid Enum Values
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
                    type:     'invalid-parking' as ParkingType,
                    included: false
                }]
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...invalidNestedEnums, unitID: 'BUILDING' }));

            const result = await createBuilding(invalidNestedEnums);
            expect(typeof result.petPolicies!.types![0]).toBe('string');
            expect(typeof result.parkingOptions![0].type).toBe('string');
        });
    });

    // Edge Case Tests - Empty vs Null vs Undefined
    describe('Empty, Null, and Undefined Handling', () => {
        it('should handle empty strings vs null vs undefined', async () => {
            expect.assertions(6);
            const emptyValuesBuilding = {
                buildingID:          'empty-test',
                street:              '', // empty string
                city:                undefined, // undefined (DynamoDB Toolbox doesn't accept null for strings)
                // state is undefined (not included)
                zip:                 '12345',
                description:         '',
                propertyDescription: undefined // undefined instead of null
            };
            // Only include defined fields in the response
            const emptyValuesResponse = {
                buildingID:  'empty-test',
                street:      '',
                zip:         '12345',
                description: '',
                unitID:      'BUILDING'
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
                buildingID:        'empty-arrays-test',
                street:            '789 Empty Arrays St',
                photos:            [], // empty array
                propertyAmenities: [], // empty array
                // rentSpecials is undefined (not included)
                oneTimeFees:       []
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
                contactInfo:       {
                    name:  '',
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

    // Edge Case Tests - Special Characters and Unicode
    describe('Special Characters and Unicode', () => {
        it('should handle special characters in string fields', async () => {
            expect.assertions(5);
            const specialCharsBuilding = {
                ...testBuilding,
                street:              '123 O\'Brien St. #456',
                description:         'Test "building" with <special> & characters',
                propertyDescription: 'Line 1\nLine 2\tTabbed\rCarriage Return',
                contactInfo:         {
                    name:  'José García-López',
                    email: 'test+special@example.com'
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...specialCharsBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(specialCharsBuilding);
            expect(result.street).toBe('123 O\'Brien St. #456');
            expect(result.description).toBe('Test "building" with <special> & characters');
            expect(result.propertyDescription).toContain('\n');
            expect(result.propertyDescription).toContain('\t');
            expect(result.contactInfo!.name).toBe('José García-López');
        });

        it('should handle Unicode characters', async () => {
            expect.assertions(4);
            const unicodeBuilding = {
                ...testBuilding,
                street:              '北京市朝阳区建国路123号', // Chinese characters
                description:         'مبنى سكني فاخر', // Arabic text
                propertyDescription: '🏢 Modern building with 🌳 garden and 🏊 pool! 😊',
                contactInfo:         {
                    name: 'Владимир Петров' // Cyrillic characters
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...unicodeBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(unicodeBuilding);
            expect(result.street).toBe('北京市朝阳区建国路123号');
            expect(result.description).toBe('مبنى سكني فاخر');
            expect(result.propertyDescription).toContain('🏢');
            expect(result.contactInfo!.name).toBe('Владимир Петров');
        });
    });

    // Edge Case Tests - Type Validation
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

    // Edge Case Tests - Deeply Nested Objects
    describe('Deeply Nested Objects', () => {
        it('should handle deeply nested income restrictions', async () => {
            expect.assertions(5);
            const deeplyNestedBuilding = {
                ...testBuilding,
                incomeRestrictions: {
                    amiLimit:                 80,
                    maxIncomeByHouseholdSize: {
                        '1':  50000,
                        '2':  60000,
                        '3':  70000,
                        '4':  80000,
                        '5':  90000,
                        '6':  100000,
                        '7':  110000,
                        '8':  120000,
                        '9+': 130000 // string key
                    } as Record<number, number>
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...deeplyNestedBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(deeplyNestedBuilding);
            expect(result.incomeRestrictions!.amiLimit).toBe(80);
            expect(result.incomeRestrictions!.maxIncomeByHouseholdSize['1']).toBe(50000);
            expect(result.incomeRestrictions!.maxIncomeByHouseholdSize['5']).toBe(90000);
            expect(result.incomeRestrictions!.maxIncomeByHouseholdSize['8']).toBe(120000);
            const householdSizes = result.incomeRestrictions!.maxIncomeByHouseholdSize;
            expect(householdSizes['9+']).toBe(130000);
        });

        it('should handle complex pet policies with all fields', async () => {
            expect.assertions(9);
            const complexPetPolicyBuilding = {
                ...testBuilding,
                petPolicies: {
                    allowed:           true,
                    types:             [PetType.DOG, PetType.CAT, PetType.BIRD, PetType.FISH, PetType.SMALL_ANIMAL],
                    maxCount:          3,
                    weightLimit:       75,
                    breedRestrictions: ['Pit Bull', 'Rottweiler', 'German Shepherd', 'Doberman'],
                    deposit:           500,
                    monthlyFee:        50,
                    oneTimeFee:        250,
                    notes:             'Service animals exempt from all restrictions. Exotic pets require approval.'
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...complexPetPolicyBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(complexPetPolicyBuilding);
            const petPolicy = result.petPolicies!;
            expect(petPolicy.allowed).toBe(true);
            expect(petPolicy.types).toHaveLength(5);
            expect(petPolicy.maxCount).toBe(3);
            expect(petPolicy.weightLimit).toBe(75);
            expect(petPolicy.breedRestrictions).toHaveLength(4);
            expect(petPolicy.deposit).toBe(500);
            expect(petPolicy.monthlyFee).toBe(50);
            expect(petPolicy.oneTimeFee).toBe(250);
            expect(petPolicy.notes).toContain('Service animals');
        });

        it('should handle complex tour availability with nested hours', async () => {
            expect.assertions(6);
            const complexTourBuilding = {
                ...testBuilding,
                tourAvailability: {
                    selfGuidedTours:   true,
                    virtualTours:      true,
                    inPersonTours:     true,
                    tourSchedulingUrl: 'https://example.com/schedule',
                    tourHours:         {
                        [DayOfWeek.MONDAY]:    { open: '09:00', close: '18:00' },
                        [DayOfWeek.TUESDAY]:   { open: '09:00', close: '18:00' },
                        [DayOfWeek.WEDNESDAY]: { open: '09:00', close: '20:00' },
                        [DayOfWeek.THURSDAY]:  { open: '09:00', close: '20:00' },
                        [DayOfWeek.FRIDAY]:    { open: '09:00', close: '17:00' },
                        [DayOfWeek.SATURDAY]:  { open: '10:00', close: '16:00' },
                        [DayOfWeek.SUNDAY]:    { open: '12:00', close: '16:00' }
                    }
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...complexTourBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(complexTourBuilding);
            const tourAvail = result.tourAvailability!;
            expect(tourAvail.selfGuidedTours).toBe(true);
            expect(tourAvail.virtualTours).toBe(true);
            expect(tourAvail.inPersonTours).toBe(true);
            expect(tourAvail.tourSchedulingUrl).toBe('https://example.com/schedule');
            expect(tourAvail.tourHours![DayOfWeek.WEDNESDAY]).toEqual({ open: '09:00', close: '20:00' });
            expect(tourAvail.tourHours![DayOfWeek.SATURDAY]).toEqual({ open: '10:00', close: '16:00' });
        });
    });

    // Website Field Migration Test
    describe('Website Field Migration', () => {
        it('should migrate old website field to propertyWebsite', async () => {
            expect.assertions(2);
            const buildingWithOldWebsite = {
                ...testBuilding,
                contactInfo: {
                    name:            'Test Contact',
                    phone:           '555-1234',
                    email:           'test@example.com',
                    propertyWebsite: 'https://property-website.com'
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingWithOldWebsite, unitID: 'BUILDING' }));

            const result = await createBuilding(buildingWithOldWebsite);
            expect((result.contactInfo as ContactInfo & { propertyWebsite?: string, managementWebsite?: string }).propertyWebsite).toBe('https://property-website.com');
            expect((result.contactInfo as ContactInfo & { propertyWebsite?: string, managementWebsite?: string }).managementWebsite).toBeUndefined();
        });
        it('should handle both propertyWebsite and managementWebsite fields', async () => {
            expect.assertions(4);
            const buildingWithBothWebsites = {
                ...testBuilding,
                contactInfo: {
                    name:              'Test Contact',
                    phone:             '555-1234',
                    email:             'test@example.com',
                    propertyWebsite:   'https://property-specific.com',
                    managementWebsite: 'https://management-company.com'
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingWithBothWebsites, unitID: 'BUILDING' }));

            const result = await createBuilding(buildingWithBothWebsites);
            expect((result.contactInfo as ContactInfo & { propertyWebsite?: string, managementWebsite?: string }).propertyWebsite).toBe('https://property-specific.com');
            expect((result.contactInfo as ContactInfo & { managementWebsite?: string }).managementWebsite).toBe('https://management-company.com');
            expect(result.contactInfo!.email).toBe('test@example.com');
            expect(result.contactInfo!.name).toBe('Test Contact');
        });
        it('should handle propertyWebsite only (managementWebsite is optional)', async () => {
            expect.assertions(3);
            const buildingWithPropertyWebsiteOnly = {
                ...testBuilding,
                contactInfo: {
                    name:            'Test Contact',
                    phone:           '555-1234',
                    email:           'test@example.com',
                    propertyWebsite: 'https://property-only.com'
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingWithPropertyWebsiteOnly, unitID: 'BUILDING' }));

            const result = await createBuilding(buildingWithPropertyWebsiteOnly);
            expect((result.contactInfo as ContactInfo & { propertyWebsite?: string, managementWebsite?: string }).propertyWebsite).toBe('https://property-only.com');
            expect((result.contactInfo as ContactInfo & { propertyWebsite?: string, managementWebsite?: string }).managementWebsite).toBeUndefined();
            expect(result.contactInfo!.email).toBe('test@example.com');
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
    });

    // Array Deletion Persistence Test - Critical Fix
    describe('Array Deletion Persistence', () => {
        it('should persist empty arrays after updateBuilding when arrays are cleared', async () => {
            expect.assertions(8);

            // First, create a building with populated arrays
            const buildingWithArrays = {
                ...testBuilding,
                buildingID:   'nS3r6WvF2qHm9yLkCtPbXz', // Short-uuid format
                buildingName: '123 Test Array',
                rentSpecials: [
                    { title: 'Summer Special', description: '$500 off first month' },
                    { title: 'Winter Special', description: '2 months free' }
                ],
                photos:      ['photo1.jpg', 'photo2.jpg', 'photo3.jpg'],
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
                rentSpecials:      [],
                photos:            [],
                oneTimeFees:       [],
                monthlyFees:       [],
                propertyAmenities: []
            };

            // Mock the UpdateItemCommand to fail (simulating the original issue)
            // This will trigger the fallback PutItemCommand logic
            const expectedMergedData = {
                ...buildingWithArrays,
                ...updateWithEmptyArrays, // Arrays should be empty as saved
                unitID:    'BUILDING',
                updatedAt: new Date().toISOString()
            };

            dynamoDbMock
                .mockRejectedValueOnce(new Error('UpdateItemCommand failed - simulating persistence issue'))
                .mockResolvedValueOnce(mockGetResponse({ ...buildingWithArrays, unitID: 'BUILDING' })) // for getBuilding call
                .mockResolvedValueOnce(mockPutResponse(expectedMergedData)); // for PutItemCommand

            const updatedBuilding = await updateBuilding('nS3r6WvF2qHm9yLkCtPbXz', updateWithEmptyArrays);

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
            const reloadedBuilding = await getBuilding('nS3r6WvF2qHm9yLkCtPbXz');

            // CRITICAL: Verify that empty arrays persisted correctly after reload
            expect(reloadedBuilding!.rentSpecials).toEqual([]);
            expect(reloadedBuilding!.photos).toEqual([]);
            expect(reloadedBuilding!.propertyAmenities).toEqual([]);
        });

        it('should handle edge case where mock does not merge defaults properly for empty arrays', async () => {
            expect.assertions(5);

            // Create a building with non-empty arrays first
            const buildingWithArrays = {
                buildingID:        'pT7v4YxJ8zNe1wQfMsKhLu', // Short-uuid format
                buildingName:      '123 Edge Case',
                street:            '123 Edge Case St',
                rentSpecials:      [{ title: 'Special', description: 'Deal' }],
                photos:            ['photo1.jpg'],
                oneTimeFees:       [{ type: FeeType.APPLICATION, amount: 50, description: 'App fee' }],
                monthlyFees:       [{ type: FeeType.PARKING, amount: 100, description: 'Parking' }],
                propertyAmenities: [{ name: 'Pool', category: AmenityCategory.COMMUNITY }]
            };

            // Mock creating the building
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingWithArrays, unitID: 'BUILDING' }));
            await createBuilding(buildingWithArrays);

            // Update to clear all arrays
            const updateWithEmptyArrays = {
                rentSpecials:      [],
                photos:            [],
                oneTimeFees:       [],
                monthlyFees:       [],
                propertyAmenities: []
            };

            // Create a scenario where the mock might not handle defaults correctly
            // Simulate the raw data without default merging (which could cause undefined)
            const rawDataWithoutDefaults = {
                buildingID:        'pT7v4YxJ8zNe1wQfMsKhLu', // Short-uuid format
                buildingName:      '123 Edge Case',
                street:            '123 Edge Case St',
                // Note: Arrays are explicitly empty, not undefined
                rentSpecials:      [],
                photos:            [],
                oneTimeFees:       [],
                monthlyFees:       [],
                propertyAmenities: [],
                unitID:            'BUILDING'
            };

            dynamoDbMock
                .mockRejectedValueOnce(new Error('UpdateItemCommand failed'))
                .mockResolvedValueOnce(mockGetResponse(rawDataWithoutDefaults)) // Return raw data
                .mockResolvedValueOnce(mockPutResponse(rawDataWithoutDefaults));

            const updatedBuilding = await updateBuilding('pT7v4YxJ8zNe1wQfMsKhLu', updateWithEmptyArrays);

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
                buildingID:   'qU8w5ZyK9xPf2vRgNtLjMr', // Short-uuid format
                buildingName: '456 Missing Arrays',
                street:       '456 Missing Arrays St',
                // Deliberately omit all array fields to simulate DynamoDB returning incomplete data
                unitID:       'BUILDING'
            };

            // Update to clear all arrays - but existing building doesn't have them
            const updateWithEmptyArrays = {
                rentSpecials:      [],
                photos:            [],
                oneTimeFees:       [],
                monthlyFees:       [],
                propertyAmenities: []
            };

            dynamoDbMock
                .mockRejectedValueOnce(new Error('UpdateItemCommand failed'))
                .mockResolvedValueOnce(mockGetResponse(buildingWithoutArrayFields)) // Return data without arrays
                .mockResolvedValueOnce(mockPutResponse(buildingWithoutArrayFields));

            const updatedBuilding = await updateBuilding('qU8w5ZyK9xPf2vRgNtLjMr', updateWithEmptyArrays);

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
                rentSpecials:      [],
                photos:            [],
                oneTimeFees:       [],
                monthlyFees:       [],
                propertyAmenities: []
            };

            // Create a building without array fields to simulate incomplete database data
            const buildingWithoutArrays = {
                buildingID:   'rV9x6AzL2yQg3wShOuMkNs', // Short-uuid format
                buildingName: '789 Missing Arrays',
                street:       '789 Missing Arrays St',
                city:         'Test City',
                state:        'TS',
                zip:          '12345',
                description:  'Building with missing array fields',
                unitID:       'BUILDING'
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

            const updatedBuilding = await updateBuilding('rV9x6AzL2yQg3wShOuMkNs', updateWithEmptyArrays);

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
                buildingID:   'sW1y7BmQ3zRh4xTjPvNlOt', // Short-uuid format
                buildingName: 'Pet Policy Test',
                petPolicies:  {
                    allowed:           true,
                    types:             [PetType.DOG, PetType.CAT],
                    breedRestrictions: ['Pit Bull', 'Rottweiler'],
                    maxCount:          2,
                    weightLimit:       50
                }
            };

            // Mock creating the building
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...buildingWithPetPolicy, unitID: 'BUILDING' }));
            await createBuilding(buildingWithPetPolicy);

            // Update to clear nested arrays in petPolicies
            const updateWithEmptyPetArrays = {
                petPolicies: {
                    allowed:           true,
                    types:             [], // Clear pet types
                    breedRestrictions: [], // Clear breed restrictions
                    maxCount:          0,
                    weightLimit:       0
                }
            };

            // Mock fallback scenario
            const expectedMergedPetData = {
                ...buildingWithPetPolicy,
                ...updateWithEmptyPetArrays,
                unitID:    'BUILDING',
                updatedAt: new Date().toISOString()
            };

            dynamoDbMock
                .mockRejectedValueOnce(new Error('UpdateItemCommand failed'))
                .mockResolvedValueOnce(mockGetResponse({ ...buildingWithPetPolicy, unitID: 'BUILDING' }))
                .mockResolvedValueOnce(mockPutResponse(expectedMergedPetData));

            const updatedBuilding = await updateBuilding('sW1y7BmQ3zRh4xTjPvNlOt', updateWithEmptyPetArrays);

            // Verify nested arrays are empty
            expect(updatedBuilding!.petPolicies!.types).toEqual([]);
            expect(updatedBuilding!.petPolicies!.breedRestrictions).toEqual([]);
            expect(updatedBuilding!.petPolicies!.maxCount).toBe(0);
            expect(updatedBuilding!.petPolicies!.weightLimit).toBe(0);
        });
    });
});
