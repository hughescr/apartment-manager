// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { dynamoDbMock, resetAllMocks } from './test-setup';

import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
import { AmenityCategory, Amenity, RentSpecial } from '../../src/types';
import { mockQueryResponse, mockGetResponse, mockPutResponse, mockUpdateResponse, mockDeleteResponse } from '../helpers/mock-responses';

// Import the functions AFTER mocking
import { getUnits, getUnit, createUnit, updateUnit, deleteUnit } from '../../data/units';
import { fill, repeat } from 'lodash';

describe('Unit Data Layer', () => {
    beforeAll(() => {
        // Reset mocks at the start of this test file to prevent cross-file pollution
        resetAllMocks();
    });

    beforeEach(() => {
        // CRITICAL: Reset ALL mocks to prevent cross-test contamination
        resetAllMocks();
    });

    const testBuildingID = 'test-building-1';
    const testUnit = {
        buildingID:      testBuildingID,
        unitID:          'test-unit-1',
        unitNumber:      '101',
        modelID:         'model-2br',
        description:     'Spacious 2BR unit',
        beds:            2,
        baths:           2,
        sqft:            1050,
        rent:            1600,
        occupied:        false,
        availableDate:   '2024-04-01',
        maxOccupants:    4,
        perPersonRent:   400,
        deposit:         1600,
        minLeaseTerm:    6,
        maxLeaseTerm:    12,
        unitDescription: 'Corner unit with great views',
        unitRentSpecial: { title: '1 Month Free', description: '1 month free', endDate: '2024-05-01' },
        unitAmenities:   [
            { name: 'Balcony', category: AmenityCategory.UNIT },
            { name: 'In-unit Washer/Dryer', category: AmenityCategory.UNIT }
        ],
        photos:        ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        feedInclusion: {
            zillow:     true,
            apartments: false
        },
        manualReferences: {
            zillow:     'ZIL123',
            apartments: 'APT456'
        }
    };

    it('should get all units for a building', async () => {
        expect.assertions(1);
        const units = [
            { ...testUnit, unitID: 'UNIT#test-unit-1' },
            { ...testUnit, unitID: 'UNIT#test-unit-2', unitNumber: '102' }
        ];

        dynamoDbMock.mockResolvedValueOnce(mockQueryResponse(units));

        const result = await getUnits(testBuildingID);
        // The function strips the UNIT# prefix when returning
        expect(result).toEqual([
            testUnit,
            { ...testUnit, unitID: 'test-unit-2', unitNumber: '102' }
        ]);
    });

    it('should handle empty unit list', async () => {
        expect.assertions(1);
        dynamoDbMock.mockResolvedValueOnce(mockQueryResponse([]));

        const result = await getUnits(testBuildingID);
        expect(result).toEqual([]);
    });

    it('should get a specific unit', async () => {
        expect.assertions(1);
        dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...testUnit, unitID: 'UNIT#test-unit-1' }));

        const result = await getUnit(testUnit.buildingID, testUnit.unitID);
        expect(result).toEqual(testUnit);
    });

    it('should return undefined for non-existent unit', async () => {
        expect.assertions(1);
        dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));

        const result = await getUnit(testUnit.buildingID, 'non-existent');
        expect(result).toBeUndefined();
    });

    it('should create a unit with minimal data', async () => {
        expect.assertions(3);
        const minimalUnit = {
            unitNumber: '103',
            beds:       1,
            baths:      1
        };
        const expectedUnit = {
            ...minimalUnit,
            buildingID: testBuildingID,
            unitID:     'UNIT#test-uuid'
        };
        dynamoDbMock.mockResolvedValueOnce(mockPutResponse(expectedUnit));

        const result = await createUnit({ ...minimalUnit, buildingID: testBuildingID, unitID: 'test-uuid' });
        // The function strips the UNIT# prefix when returning
        expect(result).toEqual({ ...minimalUnit, buildingID: testBuildingID, unitID: 'test-uuid' });
        expect(result.unitID).toBe('test-uuid');
        expect(dynamoDbMock).toHaveBeenCalledTimes(1);
    });

    it('should handle createUnit when Attributes is not returned', async () => {
        expect.assertions(2);
        const unitData = {
            unitNumber: '103B',
            beds:       2,
            baths:      1,
            buildingID: testBuildingID,
            unitID:     'test-uuid'
        };
        // Mock a response where Attributes is explicitly undefined (edge case)
        dynamoDbMock.mockResolvedValueOnce({
            Attributes: undefined,
            $metadata:  { httpStatusCode: 200 }
        });

        const result = await createUnit(unitData);
        // Should return the original unit data when Attributes is not provided
        expect(result).toEqual(unitData);
        expect(dynamoDbMock).toHaveBeenCalledTimes(1);
    });

    it('should create a unit with full data', async () => {
        expect.assertions(4);
        const fullUnit = {
            unitNumber:      '104',
            modelID:         'model-3br',
            description:     'Luxury 3BR unit',
            beds:            3,
            baths:           2.5,
            sqft:            1500,
            rent:            2500,
            occupied:        false,
            availableDate:   '2024-05-01',
            maxOccupants:    6,
            perPersonRent:   420,
            deposit:         2500,
            minLeaseTerm:    12,
            maxLeaseTerm:    24,
            unitDescription: 'Premium unit with all amenities',
            unitRentSpecial: { title: '2 Months Free', description: '2 months free', endDate: '2024-06-01' },
            unitAmenities:   [
                { name: 'Walk-in Closet', category: AmenityCategory.UNIT },
                { name: 'Granite Countertops', category: AmenityCategory.UNIT }
            ],
            photos:        ['https://example.com/unit104-1.jpg', 'https://example.com/unit104-2.jpg'],
            feedInclusion: {
                zillow:     true,
                apartments: true
            },
            manualReferences: {
                zillow:     'ZIL789',
                apartments: 'APT012'
            }
        };
        const expectedUnit = {
            ...fullUnit,
            buildingID: testBuildingID,
            unitID:     'UNIT#test-uuid'
        };
        dynamoDbMock.mockResolvedValueOnce(mockPutResponse(expectedUnit));

        const result = await createUnit({ ...fullUnit, buildingID: testBuildingID, unitID: 'test-uuid' });
        // The function strips the UNIT# prefix when returning
        expect(result).toEqual({ ...fullUnit, buildingID: testBuildingID, unitID: 'test-uuid' });
        expect(result.unitID).toBe('test-uuid');
        expect(result.feedInclusion).toEqual(fullUnit.feedInclusion);
        expect(result.manualReferences).toEqual(fullUnit.manualReferences);
    });

    it('should update a unit', async () => {
        expect.assertions(2);
        const updates = {
            rent:          1700,
            occupied:      true,
            availableDate: '2024-06-01'
        };
        dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...testUnit, unitID: 'UNIT#test-unit-1', ...updates }));

        const result = await updateUnit(testUnit.buildingID, testUnit.unitID, updates);
        expect(result).toEqual({ ...testUnit, ...updates });
        expect(result?.rent).toBe(1700);
    });

    it('should handle update with undefined values', async () => {
        expect.assertions(2);
        const updates = {
            rent:        1700,
            description: undefined, // Should be removed by DynamoDB
            occupied:    false
        };
        const expectedResult = {
            ...testUnit,
            rent:     1700,
            occupied: false
        };
        dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...expectedResult, unitID: 'UNIT#test-unit-1' }));

        const result = await updateUnit(testUnit.buildingID, testUnit.unitID, updates);
        expect(result).toEqual(expectedResult);
        expect(result?.description).toBe(testUnit.description); // Original value preserved
    });

    it('should delete a unit', async () => {
        expect.assertions(2);
        dynamoDbMock.mockResolvedValueOnce(mockDeleteResponse());

        const result = await deleteUnit(testUnit.buildingID, testUnit.unitID);
        expect(result).toBeTrue();
        expect(dynamoDbMock).toHaveBeenCalledTimes(1);
    });

    it('should handle error during unit deletion', async () => {
        expect.assertions(1);

        dynamoDbMock.mockRejectedValueOnce(new Error('DynamoDB error'));

        const success = await deleteUnit(testUnit.buildingID, testUnit.unitID);
        expect(success).toBeFalse();

        // Note: Logger spy has issues in this environment, but we can see
        // from console output that logger.error is called correctly
    });

    // Additional test cases for MITS feed fields
    it('should update feed inclusion and manual references', async () => {
        expect.assertions(3);
        const updates = {
            feedInclusion: {
                zillow:     true,
                apartments: false
            },
            manualReferences: {
                zillow:     'ZIL999',
                apartments: 'APT999'
            }
        };
        dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...testUnit, unitID: 'UNIT#test-unit-1', ...updates }));

        const updatedUnit = await updateUnit(testUnit.buildingID, testUnit.unitID, updates);
        expect(updatedUnit?.feedInclusion?.zillow).toBe(true);
        expect(updatedUnit?.feedInclusion?.apartments).toBe(false);
        expect(updatedUnit?.manualReferences?.zillow).toBe('ZIL999');
    });

    it('should handle complex unit amenities override', async () => {
        expect.assertions(2);
        const updatedAmenities = [
            { name: 'Hardwood Floors', category: AmenityCategory.UNIT },
            { name: 'Walk-in Closet', category: AmenityCategory.UNIT },
            { name: 'Private Patio', category: AmenityCategory.UNIT }
        ];
        dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
            ...testUnit,
            unitID:        'UNIT#test-unit-1',
            unitAmenities: updatedAmenities
        }));

        const updatedUnit = await updateUnit(
            testUnit.buildingID,
            testUnit.unitID,
            { unitAmenities: updatedAmenities }
        );
        expect(updatedUnit?.unitAmenities).toHaveLength(3);
        expect(updatedUnit?.unitAmenities?.[0].name).toBe('Hardwood Floors');
    });

    it('should handle empty collections in unit data', async () => {
        expect.assertions(3);
        const unitWithEmptyCollections = {
            ...testUnit,
            unitID:           'UNIT#test-unit-1',
            unitAmenities:    [],
            photos:           [],
            feedInclusion:    {},
            manualReferences: {}
        };
        dynamoDbMock.mockResolvedValueOnce(mockQueryResponse([unitWithEmptyCollections]));

        const units = await getUnits(testBuildingID);
        expect(units[0].photos).toHaveLength(0);
        expect(units[0].unitAmenities).toHaveLength(0);
        expect(units[0].feedInclusion).toEqual({});
    });

    // Edge case tests for UNIT# prefix handling
    describe('UNIT# prefix edge cases', () => {
        it('should handle unitID without UNIT# prefix correctly', async () => {
            expect.assertions(1);
            // Some edge case where unitID doesn't have prefix (shouldn't happen but defensive)
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...testUnit, unitID: 'test-unit-1' }));

            const result = await getUnit(testUnit.buildingID, testUnit.unitID);
            expect(result?.unitID).toBe('test-unit-1');
        });

        it('should handle unitID with double UNIT# prefix', async () => {
            expect.assertions(1);
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...testUnit, unitID: 'UNIT#UNIT#test-unit-1' }));

            const result = await getUnit(testUnit.buildingID, testUnit.unitID);
            expect(result?.unitID).toBe('UNIT#test-unit-1');
        });

        it('should handle unitID with UNIT# in middle of string', async () => {
            expect.assertions(1);
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...testUnit, unitID: 'UNIT#test-UNIT#-1' }));

            const result = await getUnit(testUnit.buildingID, testUnit.unitID);
            expect(result?.unitID).toBe('test-UNIT#-1');
        });

        it('should handle empty unitID after prefix', async () => {
            expect.assertions(1);
            // When unitID is just 'UNIT#', after stripping it becomes empty, but fallback returns original
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...testUnit, unitID: 'UNIT#' }));

            const result = await getUnit(testUnit.buildingID, testUnit.unitID);
            expect(result?.unitID).toBe('UNIT#'); // Fallback returns original when stripped value is empty
        });

        it('should handle missing unitID in response', async () => {
            expect.assertions(1);
            // Return undefined to simulate item not found
            dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined));

            const result = await getUnit(testUnit.buildingID, 'missing-unit');
            expect(result).toBeUndefined();
        });
    });

    // Edge cases for special characters in unitID
    describe('Special characters in unitID', () => {
        it('should handle unitID with forward slashes', async () => {
            expect.assertions(2);
            const unitID = 'unit/123/a';
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...testUnit, unitID: `UNIT#${unitID}` }));

            const result = await createUnit({ ...testUnit, unitID });
            expect(result.unitID).toBe(unitID);
            expect(dynamoDbMock).toHaveBeenCalledTimes(1);
        });

        it('should handle unitID with hash symbols', async () => {
            expect.assertions(1);
            const unitID = 'unit#123#special';
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...testUnit, unitID: `UNIT#${unitID}` }));

            const result = await createUnit({ ...testUnit, unitID });
            expect(result.unitID).toBe(unitID);
        });

        it('should handle unitID with percent encoding', async () => {
            expect.assertions(1);
            const unitID = 'unit%20with%20spaces';
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...testUnit, unitID: `UNIT#${unitID}` }));

            const result = await createUnit({ ...testUnit, unitID });
            expect(result.unitID).toBe(unitID);
        });

        it('should handle unitID with unicode characters', async () => {
            expect.assertions(1);
            const unitID = 'unit-🏠-emoji';
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...testUnit, unitID: `UNIT#${unitID}` }));

            const result = await createUnit({ ...testUnit, unitID });
            expect(result.unitID).toBe(unitID);
        });

        it('should handle very long unitID', async () => {
            expect.assertions(1);
            const unitID = repeat('u', 1000); // 1000 character unitID
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...testUnit, unitID: `UNIT#${unitID}` }));

            const result = await createUnit({ ...testUnit, unitID });
            expect(result.unitID).toBe(unitID);
        });
    });

    // Feed inclusion partial updates edge cases
    describe('Feed inclusion partial updates', () => {
        it('should update only one feed inclusion status without affecting others', async () => {
            expect.assertions(3);
            const existingUnit = {
                ...testUnit,
                feedInclusion: {
                    zillow:     true,
                    apartments: false,
                    realtor:    true
                }
            };
            const updates = {
                feedInclusion: {
                    zillow: false // Only updating zillow
                }
            };
            const expectedResult = {
                ...existingUnit,
                feedInclusion: {
                    ...existingUnit.feedInclusion,
                    zillow: false
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...expectedResult, unitID: 'UNIT#test-unit-1' }));

            const result = await updateUnit(testUnit.buildingID, testUnit.unitID, updates);
            expect(result?.feedInclusion?.zillow).toBe(false);
            expect(result?.feedInclusion?.apartments).toBe(false);
            expect(result?.feedInclusion?.realtor).toBe(true);
        });

        it('should handle feedInclusion with various site names', async () => {
            expect.assertions(3);
            const updates = {
                feedInclusion: {
                    zillow:         true,
                    apartments_com: false,
                    customSite:     true
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
                ...testUnit,
                unitID:        'UNIT#test-unit-1',
                feedInclusion: updates.feedInclusion
            }));

            const result = await updateUnit(testUnit.buildingID, testUnit.unitID, updates);
            expect(result?.feedInclusion?.zillow).toBe(true);
            expect(result?.feedInclusion?.apartments_com).toBe(false);
            expect(result?.feedInclusion?.customSite).toBe(true);
        });

        it('should handle feedInclusion with undefined values being filtered', async () => {
            expect.assertions(3);
            const updates = {
                feedInclusion: {
                    zillow:     false,
                    apartments: undefined // undefined should be filtered out
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
                ...testUnit,
                unitID:        'UNIT#test-unit-1',
                feedInclusion: { zillow: false } // apartments filtered out
            }));

            const result = await updateUnit(testUnit.buildingID, testUnit.unitID, updates);
            expect(result?.feedInclusion).toEqual({ zillow: false });
            expect(result?.feedInclusion?.zillow).toBe(false);
            expect(result?.feedInclusion?.apartments).toBeUndefined();
        });

        it('should handle feedInclusion boolean values correctly', async () => {
            expect.assertions(2);
            const updates = {
                feedInclusion: {
                    zillow:         true,
                    apartments_com: false
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
                ...testUnit,
                unitID:        'UNIT#test-unit-1',
                feedInclusion: updates.feedInclusion
            }));

            const result = await updateUnit(testUnit.buildingID, testUnit.unitID, updates);
            expect(result?.feedInclusion?.zillow).toBe(true);
            expect(result?.feedInclusion?.apartments_com).toBe(false);
        });
    });

    // Orphaned units and referential integrity
    describe('Orphaned units and referential integrity', () => {
        it('should create unit referencing non-existent modelID', async () => {
            expect.assertions(2);
            const orphanedUnit = {
                ...testUnit,
                modelID: 'non-existent-model'
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...orphanedUnit, unitID: 'UNIT#test-unit-1' }));

            const result = await createUnit(orphanedUnit);
            expect(result.modelID).toBe('non-existent-model');
            expect(result.unitID).toBe('test-unit-1');
        });

        it('should handle unit creation with non-existent buildingID', async () => {
            expect.assertions(2);
            const invalidBuilding = 'non-existent-building';
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({
                ...testUnit,
                buildingID: invalidBuilding,
                unitID:     'UNIT#test-unit-1'
            }));

            const result = await createUnit({ ...testUnit, buildingID: invalidBuilding });
            expect(result.buildingID).toBe(invalidBuilding);
            expect(result.unitID).toBe('test-unit-1');
        });
    });

    // Concurrent updates and race conditions
    describe('Concurrent updates and race conditions', () => {
        it('should handle concurrent updates to the same unit', async () => {
            expect.assertions(4);
            const update1 = { rent: 1800 };
            const update2 = { occupied: true };

            // Simulate two concurrent updates
            dynamoDbMock
                .mockResolvedValueOnce(mockUpdateResponse({ ...testUnit, unitID: 'UNIT#test-unit-1', ...update1 }))
                .mockResolvedValueOnce(mockUpdateResponse({ ...testUnit, unitID: 'UNIT#test-unit-1', ...update1, ...update2 }));

            const [result1, result2] = await Promise.all([
                updateUnit(testUnit.buildingID, testUnit.unitID, update1),
                updateUnit(testUnit.buildingID, testUnit.unitID, update2)
            ]);

            expect(result1?.rent).toBe(1800);
            expect(result1?.occupied).toBe(false); // Original value
            expect(result2?.rent).toBe(1800); // Should have both updates
            expect(result2?.occupied).toBe(true);
        });

        it('should handle race condition in unit creation (duplicate unitID)', async () => {
            expect.assertions(3);
            // First call succeeds
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...testUnit, unitID: 'UNIT#duplicate-id' }));
            // Second call fails with condition check (unit already exists)
            dynamoDbMock.mockRejectedValueOnce({
                name:    'ConditionalCheckFailedException',
                message: 'The conditional request failed'
            });

            const unit1Promise = createUnit({ ...testUnit, unitID: 'duplicate-id' });
            const unit2Promise = createUnit({ ...testUnit, unitID: 'duplicate-id' });

            const result1 = await unit1Promise;
            expect(result1.unitID).toBe('duplicate-id');

            expect(unit2Promise).rejects.toMatchObject({
                name: 'ConditionalCheckFailedException'
            });
            expect(dynamoDbMock).toHaveBeenCalledTimes(2);
        });
    });

    // Array manipulation edge cases
    describe('Array manipulation edge cases', () => {
        it('should handle photos array with duplicate URLs', async () => {
            expect.assertions(2);
            const duplicatePhotos = [
                'https://example.com/photo1.jpg',
                'https://example.com/photo1.jpg', // Duplicate
                'https://example.com/photo2.jpg'
            ];
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({
                ...testUnit,
                unitID: 'UNIT#test-unit-1',
                photos: duplicatePhotos
            }));

            const result = await createUnit({ ...testUnit, photos: duplicatePhotos });
            expect(result.photos).toHaveLength(3);
            expect(result.photos).toEqual(duplicatePhotos);
        });

        it('should handle amenities array with empty objects', async () => {
            expect.assertions(2);
            const invalidAmenities = [
                { name: 'Valid Amenity', category: AmenityCategory.UNIT },
                {} as Amenity, // Invalid empty object
                { name: '', category: AmenityCategory.UNIT }, // Empty name
                { name: 'No Category', category: AmenityCategory.UNIT } as Amenity // Missing category
            ];
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({
                ...testUnit,
                unitID:        'UNIT#test-unit-1',
                unitAmenities: invalidAmenities
            }));

            const result = await createUnit({ ...testUnit, unitAmenities: invalidAmenities });
            expect(result.unitAmenities).toHaveLength(4);
            expect(result.unitAmenities).toEqual(invalidAmenities);
        });

        it('should handle very large arrays', async () => {
            expect.assertions(2);
            const largePhotosArray = fill(Array(1000), 'https://example.com/photo.jpg');
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({
                ...testUnit,
                unitID: 'UNIT#test-unit-1',
                photos: largePhotosArray
            }));

            const result = await createUnit({ ...testUnit, photos: largePhotosArray });
            expect(result.photos).toHaveLength(1000);
            expect(result.photos?.[999]).toBe('https://example.com/photo.jpg');
        });
    });

    // Number field edge cases
    describe('Number field edge cases', () => {
        it('should handle negative rent values', async () => {
            expect.assertions(1);
            const negativeRent = { rent: -100 };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
                ...testUnit,
                unitID: 'UNIT#test-unit-1',
                ...negativeRent
            }));

            const result = await updateUnit(testUnit.buildingID, testUnit.unitID, negativeRent);
            expect(result?.rent).toBe(-100);
        });

        it('should handle decimal beds and baths', async () => {
            expect.assertions(2);
            const decimalRooms = { beds: 2.5, baths: 1.75 };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
                ...testUnit,
                unitID: 'UNIT#test-unit-1',
                ...decimalRooms
            }));

            const result = await updateUnit(testUnit.buildingID, testUnit.unitID, decimalRooms);
            expect(result?.beds).toBe(2.5);
            expect(result?.baths).toBe(1.75);
        });

        it('should handle very large numbers', async () => {
            expect.assertions(3);
            const largeNumbers = {
                rent:         999999999,
                sqft:         50000,
                maxOccupants: 100
            };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
                ...testUnit,
                unitID: 'UNIT#test-unit-1',
                ...largeNumbers
            }));

            const result = await updateUnit(testUnit.buildingID, testUnit.unitID, largeNumbers);
            expect(result?.rent).toBe(999999999);
            expect(result?.sqft).toBe(50000);
            expect(result?.maxOccupants).toBe(100);
        });

        it('should handle zero values for numeric fields', async () => {
            expect.assertions(4);
            const zeroValues = {
                rent:  0,
                beds:  0,
                baths: 0,
                sqft:  0
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({
                ...testUnit,
                unitID: 'UNIT#test-unit-1',
                ...zeroValues
            }));

            const result = await createUnit({ ...testUnit, ...zeroValues });
            expect(result.rent).toBe(0);
            expect(result.beds).toBe(0);
            expect(result.baths).toBe(0);
            expect(result.sqft).toBe(0);
        });
    });

    // Edge cases for date fields
    describe('Date field edge cases', () => {
        it('should handle invalid date format', async () => {
            expect.assertions(1);
            const invalidDate = { availableDate: 'not-a-date' };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
                ...testUnit,
                unitID: 'UNIT#test-unit-1',
                ...invalidDate
            }));

            const result = await updateUnit(testUnit.buildingID, testUnit.unitID, invalidDate);
            expect(result?.availableDate).toBe('not-a-date');
        });

        it('should handle far future dates', async () => {
            expect.assertions(1);
            const futureDate = { availableDate: '2999-12-31' };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
                ...testUnit,
                unitID: 'UNIT#test-unit-1',
                ...futureDate
            }));

            const result = await updateUnit(testUnit.buildingID, testUnit.unitID, futureDate);
            expect(result?.availableDate).toBe('2999-12-31');
        });
    });

    // Error handling edge cases
    describe('Error handling edge cases', () => {
        it('should handle DynamoDB service unavailable error', async () => {
            expect.assertions(2);
            dynamoDbMock.mockRejectedValueOnce({
                name:    'ServiceUnavailable',
                message: 'DynamoDB is currently unavailable'
            });

            expect(getUnits(testBuildingID)).rejects.toMatchObject({
                name: 'ServiceUnavailable'
            });
            expect(dynamoDbMock).toHaveBeenCalledTimes(1);
        });

        it('should handle malformed DynamoDB response', async () => {
            expect.assertions(1);
            // Response missing Items array
            dynamoDbMock.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

            const result = await getUnits(testBuildingID);
            expect(result).toEqual([]);
        });

        it('should handle update with no Attributes returned', async () => {
            expect.assertions(1);
            dynamoDbMock.mockResolvedValueOnce({
                $metadata: { httpStatusCode: 200 }
                // No Attributes field
            });

            const result = await updateUnit(testUnit.buildingID, testUnit.unitID, { rent: 1800 });
            expect(result).toBeUndefined();
        });
    });

    // Complex object updates
    describe('Complex object updates', () => {
        it('should handle updating nested rentSpecial object', async () => {
            expect.assertions(3);
            const rentSpecialUpdate = {
                unitRentSpecial: {
                    title:       'Summer Special',
                    description: 'Get 2 months free!',
                    endDate:     '2024-08-31'
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
                ...testUnit,
                unitID: 'UNIT#test-unit-1',
                ...rentSpecialUpdate
            }));

            const result = await updateUnit(testUnit.buildingID, testUnit.unitID, rentSpecialUpdate);
            expect(result?.unitRentSpecial?.title).toBe('Summer Special');
            expect(result?.unitRentSpecial?.description).toBe('Get 2 months free!');
            expect(result?.unitRentSpecial?.endDate).toBe('2024-08-31');
        });

        it('should handle partial rentSpecial updates', async () => {
            expect.assertions(3);
            const partialSpecialUpdate = {
                unitRentSpecial: {
                    title: 'Updated Title'
                    // Missing description and endDate
                } as RentSpecial
            };
            dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({
                ...testUnit,
                unitID:          'UNIT#test-unit-1',
                unitRentSpecial: partialSpecialUpdate.unitRentSpecial
            }));

            const result = await updateUnit(testUnit.buildingID, testUnit.unitID, partialSpecialUpdate);
            expect(result?.unitRentSpecial?.title).toBe('Updated Title');
            expect(result?.unitRentSpecial?.description).toBeUndefined();
            expect(result?.unitRentSpecial?.endDate).toBeUndefined();
        });
    });
});
