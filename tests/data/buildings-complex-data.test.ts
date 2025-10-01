/**
 * Complex data tests for buildings data layer.
 * Tests Unicode handling, deeply nested objects, and field migration scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import { DayOfWeek, ContactInfo, AmenityCategory } from '../../src/types';
import {
    dynamoDbMock,
    setupBuildingsTests,
    setupBuildingsTest,
    cleanupBuildingsTest,
    mockPutResponse
} from './buildings-test-setup';
import {
    testBuilding,
    specialCharsBuilding,
    unicodeBuilding,
    complexPetPolicyBuilding,
    complexTourBuilding
} from './buildings-test-fixtures';

// Import the functions AFTER mocking
import { createBuilding } from '../../data/buildings';

describe('Building Data Layer - Complex Data', () => {
    beforeAll(() => {
        setupBuildingsTests();
    });

    beforeEach(() => {
        setupBuildingsTest();
    });

    afterEach(() => {
        cleanupBuildingsTest();
    });

    describe('Complex Nested Structures', () => {
        it('should handle building with complex nested structures', async () => {
            expect.assertions(4);
            const complexBuilding = {
                buildingID:   'complex-building-1',
                street:       '999 Complex St',
                rentSpecials: [
                    { title: 'Special 1', description: 'First special' },
                    { title: 'Special 2', description: 'Second special', startDate: '2024-12-01' }
                ],
                propertyAmenities: [
                    { name: 'Pool', category: AmenityCategory.PROPERTY },
                    { name: 'Gym', category: AmenityCategory.PROPERTY },
                    { name: 'Sauna', category: AmenityCategory.PROPERTY, description: 'Finnish sauna' }
                ]
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...complexBuilding, unitID: 'BUILDING' }));

            const createdBuilding = await createBuilding(complexBuilding);
            expect(createdBuilding.rentSpecials).toHaveLength(2);
            expect(createdBuilding.propertyAmenities).toHaveLength(3);
            expect(createdBuilding.rentSpecials![1].startDate).toBe('2024-12-01');
            expect(createdBuilding.propertyAmenities![2].description).toBe('Finnish sauna');
        });

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

    // Edge Case Tests - Special Characters and Unicode
    describe('Special Characters and Unicode', () => {
        it('should handle special characters in string fields', async () => {
            expect.assertions(5);
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
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...unicodeBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(unicodeBuilding);
            expect(result.street).toBe('北京市朝阳区建国路123号');
            expect(result.description).toBe('مبنى سكني فاخر');
            expect(result.propertyDescription).toContain('🏢');
            expect(result.contactInfo!.name).toBe('Владимир Петров');
        });

        it('should handle emoji and special Unicode symbols', async () => {
            expect.assertions(4);
            const emojiBuilding = {
                ...testBuilding,
                description:         '🏠 Beautiful building with 🌟 amenities! ✨',
                propertyDescription: 'Features: 🏊‍♂️ Pool, 💪 Gym, 🅿️ Parking',
                contactInfo:         {
                    name:  '🏢 Premium Properties Inc.',
                    email: 'info@premium🏠.com'
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...emojiBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(emojiBuilding);
            expect(result.description).toContain('🏠');
            expect(result.propertyDescription).toContain('🏊‍♂️');
            expect(result.contactInfo!.name).toContain('🏢');
            expect(result.contactInfo!.email).toContain('🏠');
        });

        it('should handle mixed character sets', async () => {
            expect.assertions(3);
            const mixedCharBuilding = {
                ...testBuilding,
                street:      '123 Москва Street 北京 Avenue',
                description: 'Mix: English, العربية, 中文, русский',
                contactInfo: {
                    name:  'Global Properties - العقارات العالمية - 全球地产',
                    phone: '+1-555-МОСКВА'
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...mixedCharBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(mixedCharBuilding);
            expect(result.street).toContain('Москва');
            expect(result.description).toContain('العربية');
            expect(result.contactInfo!.phone).toBe('+1-555-МОСКВА');
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

    describe('Complex Object Merging', () => {
        it('should handle nested object updates without losing existing data', async () => {
            expect.assertions(4);
            const baseBuilding = {
                ...testBuilding,
                screeningCriteria: {
                    incomeRatio:             3,
                    minCreditScore:          650,
                    backgroundCheckRequired: true,
                    employmentVerification:  true
                }
            };

            // Simulate partial update that should merge with existing
            const partialUpdate = {
                screeningCriteria: {
                    minCreditScore: 700 // Only updating credit score
                }
            };

            const expectedMerged = {
                ...baseBuilding,
                screeningCriteria: {
                    ...baseBuilding.screeningCriteria,
                    ...partialUpdate.screeningCriteria
                }
            };

            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...expectedMerged, unitID: 'BUILDING' }));

            const result = await createBuilding(expectedMerged);
            expect(result.screeningCriteria!.incomeRatio).toBe(3);
            expect(result.screeningCriteria!.minCreditScore).toBe(700);
            expect(result.screeningCriteria!.backgroundCheckRequired).toBe(true);
            expect(result.screeningCriteria!.employmentVerification).toBe(true);
        });

        it('should handle complex array of objects with mixed data types', async () => {
            expect.assertions(4);
            const complexArrayBuilding = {
                ...testBuilding,
                rentSpecials: [
                    {
                        title:       'Basic Special',
                        description: 'Simple discount',
                        startDate:   '2024-01-01',
                        endDate:     '2024-03-31'
                    },
                    {
                        title:       'Long-term Special',
                        description: 'Extended lease discount',
                        startDate:   '2024-04-01',
                        endDate:     '2024-12-31'
                    },
                    {
                        title:       'Summer Special',
                        description: 'Hot weather deal',
                        startDate:   '2024-06-01'
                        // endDate is optional
                    }
                ]
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...complexArrayBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(complexArrayBuilding);
            const specials = result.rentSpecials!;
            expect(specials).toHaveLength(3);
            expect(specials[0].startDate).toBe('2024-01-01');
            expect(specials[1].endDate).toBe('2024-12-31');
            expect(specials[2].title).toBe('Summer Special');
        });
    });

    describe('Data Type Coercion and Validation', () => {
        it('should handle string numbers in numeric fields', async () => {
            expect.assertions(3);
            const stringNumberBuilding = {
                ...testBuilding,
                // These would normally be coerced by the data layer
                yearBuilt:      2020,
                applicationFee: 75.50,
                totalUnits:     50
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...stringNumberBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(stringNumberBuilding);
            expect(typeof result.yearBuilt).toBe('number');
            expect(typeof result.applicationFee).toBe('number');
            expect(typeof result.totalUnits).toBe('number');
        });

        it('should preserve boolean values correctly', async () => {
            expect.assertions(4);
            const booleanTestBuilding = {
                ...testBuilding,
                roomsForRent:              false,
                shortTermLeaseAllowed:     true,
                acceptsOnlineApplications: false,
                petPolicies:               {
                    allowed: true
                }
            };
            dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...booleanTestBuilding, unitID: 'BUILDING' }));

            const result = await createBuilding(booleanTestBuilding);
            expect(result.roomsForRent).toBe(false);
            expect(result.shortTermLeaseAllowed).toBe(true);
            expect(result.acceptsOnlineApplications).toBe(false);
            expect(result.petPolicies!.allowed).toBe(true);
        });
    });
});
