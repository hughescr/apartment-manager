import { describe, it, expect, beforeEach } from 'bun:test';
import _ from 'lodash';
import { ApartmentsComMapper } from '../../../src/mappers/sites/apartments-com';
import {
    basicBuilding,
    completeBuilding,
    basicUnitType,
    completeUnitType,
    basicUnit,
    completeUnit,
    expectedApartmentsComBuilding,
    expectedApartmentsComUnitType,
    expectedApartmentsComUnit
} from '../../fixtures/mappers';
import { PropertyType, UtilityType, ParkingType, PetType, AmenityCategory, FeeType } from '../../../src/types';
import type { BuildingData, UnitTypeData, UnitData } from '../../../src/types';

describe('ApartmentsComMapper', () => {
    let mapper: ApartmentsComMapper;

    beforeEach(() => {
        mapper = new ApartmentsComMapper();
    });

    describe('Basic Properties', () => {
        it('should have correct site ID and name', () => {
            expect(mapper.siteId).toBe('apartments_com');
            expect(mapper.siteName).toBe('Apartments.com');
        });
    });

    describe('mapBuilding', () => {
        it('should map basic building data', () => {
            const result = mapper.mapBuilding(basicBuilding);

            expect(result.externalId).toBe(basicBuilding.buildingID);
            expect(result.name).toBe(basicBuilding.buildingID);
            expect(result.address).toEqual({
                street: '',
                city: '',
                state: '',
                zip: ''
            });
            expect(result.propertyType).toBe('Apartment'); // Default value
        });

        it('should map complete building data', () => {
            const result = mapper.mapBuilding(completeBuilding);

            expect(result).toMatchObject(expectedApartmentsComBuilding);
        });

        it('should transform property type enum values', () => {
            const buildingWithCondo: BuildingData = {
                ...basicBuilding,
                propertyType: PropertyType.CONDO
            };

            const result = mapper.mapBuilding(buildingWithCondo);

            expect(result.propertyType).not.toBe('condo');
            expect(result.propertyType).toBeDefined();
        });

        it('should categorize fees correctly', () => {
            const result = mapper.mapBuilding(completeBuilding);

            expect(result.fees).toBeDefined();
            expect(result.fees!.length).toBeGreaterThan(0);

            // Check that fees are transformed with currency symbols
            const appFee = _.find(result.fees, fee => fee.type.includes('Application'));
            expect(appFee).toBeDefined();
            expect(appFee!.amount).toMatch(/^\$/);
        });

        it('should transform utilities correctly', () => {
            const buildingWithUtils: BuildingData = {
                ...basicBuilding,
                utilitiesIncluded: {
                    [UtilityType.WATER]: true,
                    [UtilityType.ELECTRIC]: false,
                    [UtilityType.GAS]: true
                }
            };

            const result = mapper.mapBuilding(buildingWithUtils);

            expect(result.utilities).toBeDefined();
            expect(_.keys(result.utilities!)).toHaveLength(3);
        });

        it('should transform parking options', () => {
            const buildingWithParking: BuildingData = {
                ...basicBuilding,
                parkingOptions: [
                    { type: ParkingType.GARAGE, included: true },
                    { type: ParkingType.STREET, included: false, fee: 50 }
                ]
            };

            const result = mapper.mapBuilding(buildingWithParking);

            expect(result.parking).toBeDefined();
            expect(result.parking).toHaveLength(2);
            expect(result.parking![0].type).not.toBe('garage'); // Should be transformed
        });

        it('should transform pet policy', () => {
            const buildingWithPets: BuildingData = {
                ...basicBuilding,
                petPolicies: {
                    allowed: true,
                    types: [PetType.DOG, PetType.CAT],
                    maxCount: 2,
                    weightLimit: 50,
                    deposit: 300,
                    monthlyFee: 25,
                    notes: 'Breed restrictions apply'
                }
            };

            const result = mapper.mapBuilding(buildingWithPets);

            expect(result.petPolicy).toBeDefined();
            expect(result.petPolicy!.allowed).toBe(true);
            expect(result.petPolicy!.types).toHaveLength(2);
            expect(result.petPolicy!.restrictions).toBe('Breed restrictions apply');
        });

        it('should handle no pets allowed', () => {
            const buildingNoPets: BuildingData = {
                ...basicBuilding,
                petPolicies: {
                    allowed: false
                }
            };

            const result = mapper.mapBuilding(buildingNoPets);

            expect(result.petPolicy).toBeDefined();
            expect(result.petPolicy!.allowed).toBe(false);
            expect(result.petPolicy!.restrictions).toBe('No pets allowed');
        });

        it('should handle missing optional fields', () => {
            const minimalBuilding: BuildingData = {
                buildingID: 'BLDG-001',
                street: '123 Main St',
                city: 'Test City',
                state: 'TS',
                zip: '12345'
            };

            const result = mapper.mapBuilding(minimalBuilding);

            expect(result.yearBuilt).toBeUndefined();
            expect(result.totalUnits).toBeUndefined();
            expect(result.description).toBeUndefined();
            expect(result.photos).toEqual([]);
        });
    });

    describe('mapUnitType', () => {
        it('should map basic unit type data', () => {
            const result = mapper.mapUnitType(basicUnitType, basicBuilding);

            expect(result.externalId).toBe(basicUnitType.modelID);
            expect(result.modelName).toBe(basicUnitType.modelName);
            expect(result.beds).toBe(basicUnitType.beds);
            expect(result.baths).toBe(basicUnitType.baths);
        });

        it('should map complete unit type data', () => {
            const result = mapper.mapUnitType(completeUnitType, completeBuilding);

            expect(result).toMatchObject(expectedApartmentsComUnitType);
        });

        it('should format dates correctly', () => {
            const unitTypeWithDate: UnitTypeData = {
                ...basicUnitType,
                dateAvailable: '2024-03-15'
            };

            const result = mapper.mapUnitType(unitTypeWithDate, basicBuilding);

            expect(result.dateAvailable).toBe('03/15/2024');
        });

        it('should handle sqft ranges', () => {
            const result = mapper.mapUnitType(completeUnitType, basicBuilding);

            expect(result.sqft).toBeDefined();
            expect(result.sqft!.min).toBe(completeUnitType.minSqft);
            expect(result.sqft!.max).toBe(completeUnitType.maxSqft);
        });

        it('should handle rent ranges', () => {
            const result = mapper.mapUnitType(completeUnitType, basicBuilding);

            expect(result.rent).toBeDefined();
            expect(result.rent!.min).toBe(completeUnitType.minRent);
            expect(result.rent!.max).toBe(completeUnitType.maxRent);
        });

        it('should transform amenities', () => {
            const unitTypeWithAmenities: UnitTypeData = {
                ...basicUnitType,
                modelAmenities: [
                    { name: 'Air Conditioning', category: AmenityCategory.UNIT },
                    { name: 'Dishwasher', category: AmenityCategory.UNIT }
                ]
            };

            const result = mapper.mapUnitType(unitTypeWithAmenities, basicBuilding);

            expect(result.amenities).toBeDefined();
            expect(result.amenities).toContain('A/C');
            expect(result.amenities).toContain('Dishwasher');
        });

        it('should default photos to empty array', () => {
            const result = mapper.mapUnitType(basicUnitType, basicBuilding);

            expect(result.photos).toEqual([]);
        });
    });

    describe('mapUnit', () => {
        it('should map basic unit data', () => {
            const context = {
                unit: basicUnit,
                unitType: basicUnitType,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.externalId).toBe(basicUnit.unitID);
            expect(result.unitNumber).toBe(basicUnit.unitNumber || basicUnit.unitID);
            expect(result.modelName).toBe(basicUnitType.modelName);
        });

        it('should map complete unit data', () => {
            const context = {
                unit: completeUnit,
                unitType: completeUnitType,
                building: completeBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result).toMatchObject(expectedApartmentsComUnit);
        });

        it('should apply inheritance correctly', () => {
            const unitWithoutBeds: UnitData = {
                ...basicUnit,
                beds: undefined,
                baths: undefined
            };

            const context = {
                unit: unitWithoutBeds,
                unitType: basicUnitType,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.beds).toBe(basicUnitType.beds);
            expect(result.baths).toBe(basicUnitType.baths);
        });

        it('should merge amenities from all sources', () => {
            const unitWithAmenities: UnitData = {
                ...basicUnit,
                unitAmenities: [
                    { name: 'Hardwood Floors', category: AmenityCategory.UNIT }
                ]
            };

            const unitTypeWithAmenities: UnitTypeData = {
                ...basicUnitType,
                modelAmenities: [
                    { name: 'Air Conditioning', category: AmenityCategory.UNIT }
                ]
            };

            const buildingWithAmenities: BuildingData = {
                ...basicBuilding,
                propertyAmenities: [
                    { name: 'Swimming Pool', category: AmenityCategory.PROPERTY }
                ]
            };

            const context = {
                unit: unitWithAmenities,
                unitType: unitTypeWithAmenities,
                building: buildingWithAmenities
            };

            const result = mapper.mapUnit(context);

            // Should only include unit-category amenities for units
            expect(result.amenities).toContain('Wood Floors');
            expect(result.amenities).toContain('A/C');
            expect(result.amenities).not.toContain('Pool'); // Property amenity filtered out
        });

        it('should format available date', () => {
            const unitWithDate: UnitData = {
                ...basicUnit,
                availableDate: '2024-04-01'
            };

            const context = {
                unit: unitWithDate,
                unitType: basicUnitType,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.dateAvailable).toBe('04/01/2024');
        });

        it('should handle missing unit type', () => {
            const context = {
                unit: basicUnit,
                unitType: undefined,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.modelName).toBeUndefined();
            expect(result.beds).toBe(basicUnit.beds || 0);
        });

        it('should default numeric values to 0', () => {
            const unitWithMissing: UnitData = {
                ...basicUnit,
                beds: undefined,
                baths: undefined,
                rent: undefined
            };

            const context = {
                unit: unitWithMissing,
                unitType: undefined,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.beds).toBe(0);
            expect(result.baths).toBe(0);
            expect(result.rent).toBe(0);
        });
    });

    describe('Validation Methods', () => {
        describe('validateBuilding', () => {
            it('should validate required fields', () => {
                const result = mapper.validateBuilding(completeBuilding);

                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should catch missing address fields', () => {
                const invalidBuilding: BuildingData = {
                    buildingID: 'BLDG-001',
                    street: undefined as unknown as string,
                    city: undefined as unknown as string,
                    state: undefined as unknown as string,
                    zip: undefined as unknown as string
                };

                const result = mapper.validateBuilding(invalidBuilding);

                expect(result.isValid).toBe(false);
                expect(result.errors).toHaveLength(4);
                expect(_.map(result.errors, 'field')).toContain('street');
                expect(_.map(result.errors, 'field')).toContain('city');
                expect(_.map(result.errors, 'field')).toContain('state');
                expect(_.map(result.errors, 'field')).toContain('zip');
            });

            it('should validate partial missing fields', () => {
                const partialBuilding: BuildingData = {
                    buildingID: 'BLDG-001',
                    street: '123 Main St',
                    city: 'Test City',
                    state: undefined as unknown as string,
                    zip: undefined as unknown as string
                };

                const result = mapper.validateBuilding(partialBuilding);

                expect(result.isValid).toBe(false);
                expect(result.errors).toHaveLength(2);
            });
        });

        describe('validateUnitType', () => {
            it('should validate required fields', () => {
                const result = mapper.validateUnitType(basicUnitType);

                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should catch missing fields', () => {
                const invalidUnitType: UnitTypeData = {
                    buildingID: 'BLDG-001',
                    modelID: 'MODEL-001',
                    modelName: undefined as unknown as string,
                    beds: undefined as unknown as number,
                    baths: undefined as unknown as number
                };

                const result = mapper.validateUnitType(invalidUnitType);

                expect(result.isValid).toBe(false);
                expect(result.errors).toHaveLength(3);
                expect(_.map(result.errors, 'field')).toContain('modelName');
                expect(_.map(result.errors, 'field')).toContain('beds');
                expect(_.map(result.errors, 'field')).toContain('baths');
            });

            it('should accept zero values for beds/baths', () => {
                const studioUnitType: UnitTypeData = {
                    ...basicUnitType,
                    beds: 0,
                    baths: 1
                };

                const result = mapper.validateUnitType(studioUnitType);

                expect(result.isValid).toBe(true);
            });
        });

        describe('validateUnit', () => {
            it('should validate required fields', () => {
                const result = mapper.validateUnit(basicUnit);

                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should require unit number or ID', () => {
                const invalidUnit: UnitData = {
                    buildingID: 'BLDG-001',
                    unitID: undefined as unknown as string,
                    unitNumber: undefined
                };

                const result = mapper.validateUnit(invalidUnit);

                expect(result.isValid).toBe(false);
                expect(result.errors).toHaveLength(1);
                expect(result.errors[0].field).toBe('unitNumber');
            });

            it('should accept unit with only unitID', () => {
                const unitWithOnlyId: UnitData = {
                    buildingID: 'BLDG-001',
                    unitID: 'UNIT-001',
                    unitNumber: undefined
                };

                const result = mapper.validateUnit(unitWithOnlyId);

                expect(result.isValid).toBe(true);
            });

            it('should accept unit with only unitNumber', () => {
                const unitWithOnlyNumber: UnitData = {
                    buildingID: 'BLDG-001',
                    unitID: 'UNIT-001',
                    unitNumber: '101'
                };

                const result = mapper.validateUnit(unitWithOnlyNumber);

                expect(result.isValid).toBe(true);
            });
        });
    });

    describe('Custom Field Mappings', () => {
        it('should accept custom field mappings in constructor', () => {
            const customMappings = {
                propertyType: {
                    apartments_com: {
                        apartment: 'Apt',
                        condo: 'Condominium'
                    }
                }
            };

            const customMapper = new ApartmentsComMapper(customMappings);

            expect(customMapper.siteId).toBe('apartments_com');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty fees arrays', () => {
            const buildingNoFees: BuildingData = {
                ...basicBuilding,
                oneTimeFees: [],
                monthlyFees: []
            };

            const result = mapper.mapBuilding(buildingNoFees);

            expect(result.fees).toEqual([]);
        });

        it('should handle undefined pet policies', () => {
            const buildingNoPetInfo: BuildingData = {
                ...basicBuilding,
                petPolicies: undefined
            };

            const result = mapper.mapBuilding(buildingNoPetInfo);

            expect(result.petPolicy).toBeUndefined();
        });

        it('should handle empty parking options', () => {
            const buildingNoParking: BuildingData = {
                ...basicBuilding,
                parkingOptions: []
            };

            const result = mapper.mapBuilding(buildingNoParking);

            expect(result.parking).toEqual([]);
        });

        it('should handle very long descriptions', () => {
            const longDescription = _.repeat('A', 5000);
            const buildingLongDesc: BuildingData = {
                ...basicBuilding,
                propertyDescription: longDescription
            };

            const result = mapper.mapBuilding(buildingLongDesc);

            expect(result.description).toBe(longDescription);
        });

        // Whitespace-only required fields
        it('should treat whitespace-only fields as valid (trimming happens elsewhere)', () => {
            const buildingWhitespace: BuildingData = {
                buildingID: 'BLDG-001',
                street: '   ',
                city: '\t\t',
                state: '\n\n',
                zip: '    '
            };

            const result = mapper.validateBuilding(buildingWhitespace);

            // Current implementation treats whitespace as valid
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should treat whitespace in unit type names as valid', () => {
            const whitespaceUnitType: UnitTypeData = {
                ...basicUnitType,
                modelName: '   '
            };

            const result = mapper.validateUnitType(whitespaceUnitType);

            // Current implementation treats whitespace as valid
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        // Invalid enum values
        it('should handle invalid enum values gracefully', () => {
            const invalidEnumBuilding: BuildingData = {
                ...basicBuilding,
                propertyType: 'INVALID_TYPE' as PropertyType,
                parkingOptions: [
                    {
                        type: 'INVALID_PARKING' as ParkingType,
                        included: true
                    }
                ],
                petPolicies: {
                    allowed: true,
                    types: ['INVALID_PET' as PetType]
                }
            };

            expect(() => mapper.mapBuilding(invalidEnumBuilding)).not.toThrow();
        });

        // NaN/Infinity values
        it('should handle NaN/Infinity in numeric fields', () => {
            const nanBuilding: BuildingData = {
                ...basicBuilding,
                yearBuilt: NaN,
                totalUnits: Infinity,
                applicationFee: -Infinity
            };

            const result = mapper.mapBuilding(nanBuilding);

            expect(result.yearBuilt).toBeNaN();
            expect(result.totalUnits).toBe(Infinity);
            expect(result.applicationFee).toBe(-Infinity);
        });

        it('should default missing numeric values to 0 but preserve NaN/Infinity', () => {
            const nanUnit: UnitData = {
                ...basicUnit,
                beds: NaN,
                baths: Infinity,
                rent: -Infinity,
                sqft: -0
            };

            const context = {
                unit: nanUnit,
                unitType: undefined,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            // NaN gets defaulted to 0, but Infinity is preserved
            expect(result.beds).toBe(0);
            expect(result.baths).toBe(Infinity);
            expect(result.rent).toBe(-Infinity);
            expect(result.sqft).toBe(-0);
        });

        // Extremely long descriptions exceeding API limits
        it('should handle descriptions exceeding 10000 characters', () => {
            const veryLongDesc = _.repeat('Lorem ipsum dolor sit amet. ', 400); // ~11200 chars
            const unitLongDesc: UnitData = {
                ...basicUnit,
                unitDescription: veryLongDesc
            };

            const context = {
                unit: unitLongDesc,
                unitType: basicUnitType,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.description).toBe(veryLongDesc);
            // Truncation should be handled by the sync layer
        });

        // HTML/Script injection
        it('should preserve HTML/script content (sanitization is downstream)', () => {
            const maliciousContent = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
            const maliciousBuilding: BuildingData = {
                ...basicBuilding,
                propertyDescription: maliciousContent,
                propertyAmenities: [
                    { name: '<b>Bold Amenity</b>', category: AmenityCategory.PROPERTY }
                ]
            };

            const result = mapper.mapBuilding(maliciousBuilding);

            expect(result.description).toBe(maliciousContent);
            expect(result.amenities).toContain('<b>Bold Amenity</b>');
        });

        // Invalid date formats
        it('should handle various invalid date formats', () => {
            const invalidDates = [
                { input: 'not-a-date', expected: undefined },
                { input: '2024-13-45', expected: undefined }, // Invalid month/day
                { input: '2024/01/01', expected: '01/01/2024' }, // Valid date, different format
                { input: 'January 1, 2024', expected: '01/01/2024' }, // Valid date, different format
                { input: '', expected: undefined }
            ];

            _.forEach(invalidDates, ({ input, expected }) => {
                const unitInvalidDate: UnitData = {
                    ...basicUnit,
                    availableDate: input
                };

                const context = {
                    unit: unitInvalidDate,
                    unitType: basicUnitType,
                    building: basicBuilding
                };

                const result = mapper.mapUnit(context);

                expect(result.dateAvailable).toBe(expected);
            });
        });

        // Currency formatting edge cases
        it('should format currency values correctly', () => {
            const currencyBuilding: BuildingData = {
                ...basicBuilding,
                applicationFee: 0.00,
                oneTimeFees: [
                    { name: 'Penny Fee', amount: 0.01, type: FeeType.APPLICATION },
                    { name: 'Large Fee', amount: 99999.99, type: FeeType.ADMIN },
                    { name: 'Negative Fee', amount: -50, type: FeeType.MOVE_IN },
                    { name: 'Fractional Fee', amount: 123.456, type: FeeType.CLEANING }
                ]
            };

            const result = mapper.mapBuilding(currencyBuilding);

            expect(result.fees).toContainEqual(
                expect.objectContaining({ type: 'Application Fee', amount: '$0.01' })
            );
            expect(result.fees).toContainEqual(
                expect.objectContaining({ type: 'Administrative Fee', amount: '$99,999.99' })
            );
            expect(result.fees).toContainEqual(
                expect.objectContaining({ type: 'Move-in Fee', amount: '$-50' })
            );
        });

        // Extremely large arrays
        it('should handle extremely large amenity arrays', () => {
            const manyAmenities = _.times(200, (i) => {
                let category: AmenityCategory;
                if(i % 3 === 0) {
                    category = AmenityCategory.UNIT;
                } else if(i % 3 === 1) {
                    category = AmenityCategory.PROPERTY;
                } else {
                    category = AmenityCategory.COMMUNITY;
                }
                return {
                    name: `Amenity ${i}`,
                    category
                };
            });

            const buildingManyAmenities: BuildingData = {
                ...basicBuilding,
                propertyAmenities: manyAmenities
            };

            const result = mapper.mapBuilding(buildingManyAmenities);

            expect(result.amenities).toBeDefined();
            expect(result.amenities.length).toBe(200);
        });

        it('should handle extremely large photo arrays', () => {
            const manyPhotos = _.times(150, i => `https://example.com/photo${i}.jpg`);

            const buildingManyPhotos: BuildingData = {
                ...basicBuilding,
                photos: manyPhotos
            };

            const result = mapper.mapBuilding(buildingManyPhotos);

            expect(result.photos).toBeDefined();
            expect(result.photos.length).toBe(150);
        });

        // Phone number format validation
        it('should handle various phone number formats', () => {
            const phoneFormats = [
                '(123) 456-7890',
                '123-456-7890',
                '1234567890',
                '+1 (123) 456-7890',
                '123.456.7890',
                'invalid-phone'
            ];

            _.forEach(phoneFormats, (phone) => {
                const buildingWithPhone: BuildingData = {
                    ...basicBuilding,
                    contactInfo: { phone, email: 'test@example.com' }
                };

                const result = mapper.mapBuilding(buildingWithPhone);

                expect(result.contactInfo!.phone).toBe(phone);
            });
        });

        // URL validation for photos
        it('should handle various URL formats in photos', () => {
            const photoUrls = [
                'https://example.com/photo.jpg',
                'http://example.com/photo.jpg',
                'ftp://example.com/photo.jpg',
                'javascript:alert(1)',
                'data:image/png;base64,iVBORw0KGgo',
                '/relative/path/photo.jpg',
                'not-a-url',
                ''
            ];

            const buildingWithPhotos: BuildingData = {
                ...basicBuilding,
                photos: photoUrls
            };

            const result = mapper.mapBuilding(buildingWithPhotos);

            expect(result.photos).toEqual(photoUrls);
            // URL validation should be handled by the sync layer
        });

        // Missing required fields at different inheritance levels
        it('should handle missing model fields with unit override', () => {
            const incompleteModel: UnitTypeData = {
                buildingID: 'BLDG-001',
                modelID: 'MODEL-001',
                modelName: 'Incomplete',
                beds: undefined as unknown as number,
                baths: undefined as unknown as number,
                minRent: undefined,
                maxRent: undefined
            };

            const completeUnit: UnitData = {
                ...basicUnit,
                beds: 2,
                baths: 1.5,
                rent: 1800
            };

            const context = {
                unit: completeUnit,
                unitType: incompleteModel,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.beds).toBe(2);
            expect(result.baths).toBe(1.5);
            expect(result.rent).toBe(1800);
        });

        // Conflicting data between inheritance levels
        it('should resolve conflicting amenities correctly', () => {
            const unitAmenities: UnitData = {
                ...basicUnit,
                unitAmenities: [
                    { name: 'Hardwood Floors', category: AmenityCategory.UNIT },
                    { name: 'Balcony', category: AmenityCategory.UNIT }
                ]
            };

            const modelAmenities: UnitTypeData = {
                ...basicUnitType,
                modelAmenities: [
                    { name: 'Carpet Floors', category: AmenityCategory.UNIT }, // Conflicts with unit
                    { name: 'Dishwasher', category: AmenityCategory.UNIT }
                ]
            };

            const buildingAmenities: BuildingData = {
                ...basicBuilding,
                propertyAmenities: [
                    { name: 'Pool', category: AmenityCategory.PROPERTY },
                    { name: 'Gym', category: AmenityCategory.PROPERTY }
                ]
            };

            const context = {
                unit: unitAmenities,
                unitType: modelAmenities,
                building: buildingAmenities
            };

            const result = mapper.mapUnit(context);

            // Should filter to only unit amenities for units
            expect(result.amenities).toContain('Wood Floors');
            expect(result.amenities).toContain('Balcony');
            expect(result.amenities).toContain('Dishwasher');
            expect(result.amenities).not.toContain('Pool'); // Property amenity
        });

        // Reserved keywords in Apartments.com system
        it('should handle reserved keywords in text fields', () => {
            const reservedBuilding: BuildingData = {
                ...basicBuilding,
                propertyDescription: 'null undefined false true delete',
                propertyAmenities: [
                    { name: 'SELECT * FROM', category: AmenityCategory.PROPERTY },
                    { name: 'DROP TABLE', category: AmenityCategory.PROPERTY },
                    { name: '<iframe>', category: AmenityCategory.PROPERTY }
                ]
            };

            const result = mapper.mapBuilding(reservedBuilding);

            expect(result.description).toBe('null undefined false true delete');
            expect(result.amenities).toContain('SELECT * FROM');
        });

        // Timezone edge cases
        it('should format dates correctly across timezones', () => {
            const timezoneUnit: UnitData = {
                ...basicUnit,
                availableDate: '2024-01-01T00:00:00Z' // Midnight UTC
            };

            const context = {
                unit: timezoneUnit,
                unitType: basicUnitType,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            // Should format to MM/DD/YYYY regardless of timezone
            expect(result.dateAvailable).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        });

        // Empty strings vs null/undefined
        it('should handle empty strings differently from null/undefined', () => {
            const emptyStringsUnit: UnitData = {
                ...basicUnit,
                unitDescription: '',
                unitNumber: '',
                availableDate: ''
            };

            const context = {
                unit: emptyStringsUnit,
                unitType: basicUnitType,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            // Empty string descriptions are preserved
            expect(result.description).toBeUndefined(); // No description inherited
            expect(result.unitNumber).toBe(basicUnit.unitID); // Falls back to unitID
            expect(result.dateAvailable).toBeUndefined(); // Invalid date
        });

        // Transformer function errors
        it('should handle errors in transformation gracefully', () => {
            const invalidUtility: BuildingData = {
                ...basicBuilding,
                utilitiesIncluded: {
                    ['INVALID_UTILITY' as UtilityType]: true
                }
            };

            expect(() => mapper.mapBuilding(invalidUtility)).not.toThrow();
        });

        // Unicode and special characters
        it('should handle unicode and international characters', () => {
            const unicodeBuilding: BuildingData = {
                ...basicBuilding,
                propertyDescription: '🏢 Luksusowe mieszkanie w centrum Warszawy',
                street: '123 Rue de la Paix',
                city: 'São Paulo',
                propertyAmenities: [
                    { name: '🏊‍♂️ Swimming Pool', category: AmenityCategory.PROPERTY },
                    { name: 'Café & Restaurant', category: AmenityCategory.PROPERTY },
                    { name: '中文设施', category: AmenityCategory.PROPERTY }
                ]
            };

            const result = mapper.mapBuilding(unicodeBuilding);

            expect(result.description).toBe('🏢 Luksusowe mieszkanie w centrum Warszawy');
            expect(result.address.street).toBe('123 Rue de la Paix');
            expect(result.address.city).toBe('São Paulo');
            expect(result.amenities.length).toBe(3);
        });

        // Zero and negative values
        it('should handle zero and negative values appropriately', () => {
            const zeroUnit: UnitData = {
                ...basicUnit,
                beds: 0, // Studio
                baths: 0, // Invalid but should handle
                rent: -100, // Invalid
                sqft: 0,
                deposit: -500
            };

            const context = {
                unit: zeroUnit,
                unitType: undefined,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.beds).toBe(0);
            expect(result.baths).toBe(0);
            expect(result.rent).toBe(-100); // Preserves negative values
            expect(result.sqft).toBe(0);
            expect(result.deposit).toBe(-500); // Preserves negative deposit
        });
    });
});
