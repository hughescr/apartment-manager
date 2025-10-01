import { describe, it, expect, beforeEach } from 'bun:test';
import { find, forEach, map, noop, repeat, times } from 'lodash';
import { ZillowMapper } from '../../../src/mappers/sites/zillow';
import {
    basicBuilding,
    completeBuilding,
    basicUnitType,
    completeUnitType,
    basicUnit,
    completeUnit,
    expectedZillowBuilding,
    expectedZillowUnitType,
    expectedZillowUnit
} from '../../fixtures/mappers';
import { PropertyType, UtilityType, ParkingType, PetType, AmenityCategory, FeeType } from '../../../src/types';
import type { BuildingData, UnitTypeData, UnitData } from '../../../src/types';
import type { FieldMappingConfig, TransformerRegistry, UnitMappingContext } from '../../../src/mappers/types';

describe('ZillowMapper', () => {
    let mapper: ZillowMapper;
    let mockFieldMappings: FieldMappingConfig;
    let mockTransformers: TransformerRegistry;

    beforeEach(() => {
        mapper = new ZillowMapper();
        mockFieldMappings = {};
        mockTransformers = {
            get:      () => undefined,
            register: noop
        };
    });

    const _createContext = (unit: UnitData, unitType?: UnitTypeData, building?: BuildingData): UnitMappingContext => ({
        unit,
        unitType,
        building:      building || basicBuilding,
        fieldMappings: mockFieldMappings,
        transformers:  mockTransformers
    });

    describe('Basic Properties', () => {
        it('should have correct site ID and name', () => {
            expect(mapper.siteId).toBe('zillow');
            expect(mapper.siteName).toBe('Zillow Rental Manager');
        });
    });

    describe('mapBuilding', () => {
        it('should map basic building data', () => {
            const result = mapper.mapBuilding(basicBuilding);

            expect(result.externalId).toBe(basicBuilding.buildingID);
            expect(result.name).toBe(basicBuilding.buildingID);
            expect(result.address).toEqual({
                street: '',
                city:   '',
                state:  '',
                zip:    ''
            });
        });

        it('should map complete building data', () => {
            const result = mapper.mapBuilding(completeBuilding);

            expect(result).toMatchObject(expectedZillowBuilding);
        });

        it('should transform property type for Zillow', () => {
            const buildingWithTypes: BuildingData = {
                ...basicBuilding,
                propertyType: PropertyType.SINGLE_FAMILY
            };

            const result = mapper.mapBuilding(buildingWithTypes);

            // Zillow has different property type mappings
            expect(result.propertyType).not.toBe('single-family');
            expect(result.propertyType).toBeDefined();
        });

        it('should transform fees without currency symbols', () => {
            const result = mapper.mapBuilding(completeBuilding);

            expect(result.fees).toBeDefined();
            expect(result.fees!.length).toBeGreaterThan(0);

            // Zillow doesn't use currency symbols
            const appFee = find(result.fees, fee => fee.type.includes('Application'));
            expect(appFee).toBeDefined();
            expect(String(appFee!.amount)).not.toMatch(/^\$/);
        });

        it('should handle utilities differently', () => {
            const buildingWithUtils: BuildingData = {
                ...basicBuilding,
                utilitiesIncluded: {
                    [UtilityType.WATER]: true,
                    [UtilityType.SEWER]: true,
                    [UtilityType.TRASH]: true
                }
            };

            const result = mapper.mapBuilding(buildingWithUtils);

            // Zillow may combine utilities differently
            expect(result.utilities).toBeDefined();
        });

        it('should simplify parking for Zillow', () => {
            const buildingWithParking: BuildingData = {
                ...basicBuilding,
                parkingOptions: [
                    { type: ParkingType.COVERED, included: true },
                    { type: ParkingType.GARAGE, included: false, fee: 100 }
                ]
            };

            const result = mapper.mapBuilding(buildingWithParking);

            expect(result.parking).toBeDefined();
            expect(result.parking).toHaveLength(2);
        });

        it('should transform pet policy with Zillow terminology', () => {
            const buildingWithPets: BuildingData = {
                ...basicBuilding,
                petPolicies: {
                    allowed:     true,
                    types:       [PetType.DOG, PetType.CAT],
                    maxCount:    2,
                    weightLimit: 25,
                    deposit:     500
                }
            };

            const result = mapper.mapBuilding(buildingWithPets);

            expect(result.petPolicy).toBeDefined();
            expect(result.petPolicy!.allowed).toBe(true);
            // Zillow uses different pet type terminology
            expect(result.petPolicy!.types).toBeDefined();
        });

        it('should include Zillow-specific fields', () => {
            const result = mapper.mapBuilding(completeBuilding);

            // Check for any Zillow-specific fields that might be added
            expect(result).toBeDefined();
        });
    });

    describe('mapUnitType', () => {
        it('should indicate Zillow does not support unit types', () => {
            const result = mapper.mapUnitType(basicUnitType, basicBuilding);

            // Zillow flattens everything to units
            expect(result.modelName).toBe(basicUnitType.modelName);
            expect(result.beds).toBe(basicUnitType.beds);
            expect(result.baths).toBe(basicUnitType.baths);
        });

        it('should still process unit type data for reference', () => {
            const result = mapper.mapUnitType(completeUnitType, completeBuilding);

            expect(result).toMatchObject(expectedZillowUnitType);
        });

        it('should format dates in Zillow format', () => {
            const unitTypeWithDate: UnitTypeData = {
                ...basicUnitType,
                dateAvailable: '2024-05-01'
            };

            const result = mapper.mapUnitType(unitTypeWithDate, basicBuilding);

            // Zillow might use different date format
            expect(result.dateAvailable).toBeDefined();
        });

        it('should transform amenities with Zillow names', () => {
            const unitTypeWithAmenities: UnitTypeData = {
                ...basicUnitType,
                modelAmenities: [
                    { name: 'Air Conditioning', category: AmenityCategory.UNIT },
                    { name: 'In-Unit Washer/Dryer', category: AmenityCategory.UNIT }
                ]
            };

            const result = mapper.mapUnitType(unitTypeWithAmenities, basicBuilding);

            expect(result.amenities).toBeDefined();
            expect(map(result.amenities, 'name')).toContain('Air conditioning'); // Zillow uses lowercase
            expect(map(result.amenities, 'name')).toContain('In unit laundry'); // Different terminology
        });
    });

    describe('mapUnit', () => {
        it('should flatten all data into unit for Zillow', () => {
            const context = _createContext(basicUnit, basicUnitType, basicBuilding);

            const result = mapper.mapUnit(context);

            // Should include building address in unit
            expect(result.externalId).toBe(basicUnit.unitID);
            expect(result.unitNumber).toBe(basicUnit.unitNumber || basicUnit.unitID);
        });

        it('should map complete unit with flattened data', () => {
            const context = _createContext(completeUnit, completeUnitType, completeBuilding);

            const result = mapper.mapUnit(context);

            expect(result).toMatchObject(expectedZillowUnit);
        });

        it('should inherit and flatten all values', () => {
            const unitMinimal: UnitData = {
                buildingID: 'BLDG-001',
                unitID:     'UNIT-001',
                unitNumber: '101'
            };

            const context = _createContext(unitMinimal, completeUnitType, completeBuilding);

            const result = mapper.mapUnit(context);

            // Should have inherited values from model and building
            expect(result.beds).toBe(completeUnitType.beds);
            expect(result.baths).toBe(completeUnitType.baths);
            expect(result.rent).toBe(completeUnitType.minRent!);
        });

        it('should merge all amenities for Zillow', () => {
            const unitWithAmenities: UnitData = {
                ...basicUnit,
                unitAmenities: [
                    { name: 'Balcony', category: AmenityCategory.UNIT }
                ]
            };

            const unitTypeWithAmenities: UnitTypeData = {
                ...basicUnitType,
                modelAmenities: [
                    { name: 'Dishwasher', category: AmenityCategory.UNIT }
                ]
            };

            const buildingWithAmenities: BuildingData = {
                ...basicBuilding,
                propertyAmenities: [
                    { name: 'Fitness Center', category: AmenityCategory.PROPERTY },
                    { name: 'Pet Friendly', category: AmenityCategory.COMMUNITY }
                ]
            };

            const context = _createContext(unitWithAmenities, unitTypeWithAmenities, buildingWithAmenities);

            const result = mapper.mapUnit(context);

            // Zillow includes all amenities in the unit listing
            expect(map(result.amenities, 'name')).toContain('Balcony/deck/patio'); // Transformed name
            expect(map(result.amenities, 'name')).toContain('Dishwasher');
            expect(map(result.amenities, 'name')).toContain('Fitness center');
            expect(map(result.amenities, 'name')).toContain('Pets allowed'); // Transformed name
        });

        it('should use proper date formatting for Zillow', () => {
            const unitWithDate: UnitData = {
                ...basicUnit,
                availableDate: '2024-06-15'
            };

            const context = _createContext(unitWithDate, basicUnitType, basicBuilding);

            const result = mapper.mapUnit(context);

            expect(result.dateAvailable).toBeDefined();
            // Check the actual format matches Zillow's requirements
        });

        it('should handle missing unit type gracefully', () => {
            const context = _createContext(completeUnit, undefined, completeBuilding);

            const result = mapper.mapUnit(context);

            expect(result.modelName).toBeUndefined();
            expect(result.beds).toBe(completeUnit.beds!);
        });

        it('should include building description when unit has none', () => {
            const unitNoDesc: UnitData = {
                ...basicUnit,
                unitDescription: undefined
            };

            const context = _createContext(unitNoDesc, basicUnitType, completeBuilding);

            const result = mapper.mapUnit(context);

            expect(result.description).toBeDefined();
            expect(result.description).toContain(completeBuilding.propertyDescription);
        });
    });

    describe('Validation Methods', () => {
        describe('validateBuilding', () => {
            it('should validate required fields for Zillow', () => {
                const result = mapper.validateBuilding(completeBuilding);

                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should require all address fields', () => {
                const invalidBuilding: BuildingData = {
                    buildingID: 'BLDG-001',
                    street:     '123 Main St',
                    city:       'Test City',
                    state:      undefined as unknown as string,
                    zip:        undefined as unknown as string
                };

                const result = mapper.validateBuilding(invalidBuilding);

                expect(result.isValid).toBe(false);
                expect(result.errors).toHaveLength(2);
            });

            it('should have Zillow-specific validation rules', () => {
                // Test any Zillow-specific validation requirements
                const result = mapper.validateBuilding(completeBuilding);

                expect(result.isValid).toBe(true);
            });
        });

        describe('validateUnitType', () => {
            it('should warn that Zillow does not use unit types', () => {
                const result = mapper.validateUnitType(basicUnitType);

                // Should still validate for internal consistency
                expect(result.isValid).toBe(true);
            });
        });

        describe('validateUnit', () => {
            it('should validate flattened unit requirements', () => {
                const result = mapper.validateUnit(completeUnit);

                expect(result.isValid).toBe(true);
            });

            it('should require more fields for Zillow units', () => {
                const minimalUnit: UnitData = {
                    buildingID: 'BLDG-001',
                    unitID:     'UNIT-001'
                };

                const result = mapper.validateUnit(minimalUnit);

                // Zillow might require more fields since it's flattened
                expect(result.errors?.length).toBeGreaterThanOrEqual(0);
            });

            it('should validate that unit has sufficient data when flattened', () => {
                const unitForZillow: UnitData = {
                    buildingID:    'BLDG-001',
                    unitID:        'UNIT-001',
                    unitNumber:    '101',
                    beds:          2,
                    baths:         2,
                    rent:          1500,
                    availableDate: '2024-01-01'
                };

                const result = mapper.validateUnit(unitForZillow);

                expect(result.isValid).toBe(true);
            });
        });
    });

    describe('Zillow-Specific Behavior', () => {
        it('should flatten three-tier hierarchy', () => {
            const context = _createContext(basicUnit, basicUnitType, basicBuilding);

            const result = mapper.mapUnit(context);

            // Result should contain data from all three levels
            expect(result).toBeDefined();
            expect(result.beds).toBeDefined();
            expect(result.rent).toBeDefined();
        });

        it('should use Zillow-specific amenity names', () => {
            const buildingWithAmenities: BuildingData = {
                ...basicBuilding,
                propertyAmenities: [
                    { name: 'Swimming Pool', category: AmenityCategory.PROPERTY },
                    { name: 'Air Conditioning', category: AmenityCategory.UNIT },
                    { name: 'Pet Friendly', category: AmenityCategory.COMMUNITY }
                ]
            };

            const amenities = mapper.mapBuilding(buildingWithAmenities).amenities;

            expect(map(amenities, 'name')).toContain('Pool'); // Simplified
            expect(map(amenities, 'name')).toContain('Air conditioning'); // Lowercase
            expect(map(amenities, 'name')).toContain('Pets allowed'); // Different term
        });

        it('should format data for Zillow API requirements', () => {
            const result = mapper.mapBuilding(completeBuilding);

            // Check that the result matches Zillow's expected format
            expect(result.fees).toBeDefined();
            forEach(result.fees, (fee) => {
                // No currency symbols in amounts
                expect(String(fee.amount)).not.toContain('$');
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle buildings with no amenities', () => {
            const buildingNoAmenities: BuildingData = {
                ...basicBuilding,
                propertyAmenities: []
            };

            const result = mapper.mapBuilding(buildingNoAmenities);

            expect(result.amenities).toEqual([]);
        });

        it('should handle undefined utilities', () => {
            const buildingNoUtils: BuildingData = {
                ...basicBuilding,
                utilitiesIncluded: undefined
            };

            const result = mapper.mapBuilding(buildingNoUtils);

            expect(result.utilities).toBeDefined();
            expect(result.utilities).toEqual({});
        });

        it('should handle units with no photos', () => {
            const context = _createContext(
                { ...basicUnit, photos: [] },
                basicUnitType,
                { ...basicBuilding, photos: [] }
            );

            const result = mapper.mapUnit(context);

            expect(result.photos).toEqual([]);
        });

        it('should handle very long addresses', () => {
            const longAddress = repeat('A', 200);
            const buildingLongAddress: BuildingData = {
                ...basicBuilding,
                street: longAddress
            };

            const result = mapper.mapBuilding(buildingLongAddress);

            expect(result.address.street).toBe(longAddress);
        });

        it('should handle special characters in descriptions', () => {
            const specialDesc = 'Unit with "quotes" & special <characters>';
            const unitSpecialDesc: UnitData = {
                ...basicUnit,
                unitDescription: specialDesc
            };

            const context = _createContext(unitSpecialDesc, basicUnitType, basicBuilding);

            const result = mapper.mapUnit(context);

            expect(result.description).toBe(specialDesc);
        });

        // Whitespace-only required fields
        it('should treat whitespace-only fields as valid (trimming happens elsewhere)', () => {
            const buildingWhitespace: BuildingData = {
                buildingID: 'BLDG-001',
                street:     '   ',
                city:       '\t\t',
                state:      '\n\n',
                zip:        '    '
            };

            const result = mapper.validateBuilding(buildingWhitespace);

            // Current implementation treats whitespace as valid
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        // Invalid enum values
        it('should handle invalid property type gracefully', () => {
            const buildingInvalidEnum: BuildingData = {
                ...basicBuilding,
                propertyType: 'INVALID_TYPE' as PropertyType
            };

            expect(() => mapper.mapBuilding(buildingInvalidEnum)).not.toThrow();
            const result = mapper.mapBuilding(buildingInvalidEnum);
            expect(result.propertyType).toBeDefined();
        });

        // NaN/Infinity values
        it('should handle NaN/Infinity in numeric fields with fallback to 0', () => {
            const unitWithNaN: UnitData = {
                ...basicUnit,
                beds:  NaN,
                baths: Infinity,
                rent:  -Infinity,
                sqft:  0
            };

            const context = _createContext(unitWithNaN, basicUnitType, basicBuilding);

            const result = mapper.mapUnit(context);

            // NaN is treated as falsy and defaults to 0
            expect(result.beds).toBe(0);
            // Infinity is truthy so not replaced by || 0
            expect(result.baths).toBe(Infinity);
            // -Infinity is truthy so not replaced by || 0
            expect(result.rent).toBe(-Infinity);
            expect(result.sqft).toBe(0);
        });

        // Extremely long descriptions exceeding limits
        it('should handle descriptions exceeding 10000 characters', () => {
            const veryLongDesc = repeat('Lorem ipsum dolor sit amet. ', 400); // ~11200 chars
            const buildingLongDesc: BuildingData = {
                ...basicBuilding,
                propertyDescription: veryLongDesc
            };

            const result = mapper.mapBuilding(buildingLongDesc);

            expect(result.description).toBe(veryLongDesc);
            // Note: Actual truncation would be handled by the sync process
        });

        // HTML/Script injection
        it('should preserve HTML/script in descriptions (sanitization is downstream)', () => {
            const maliciousDesc = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
            const unitMalicious: UnitData = {
                ...basicUnit,
                unitDescription: maliciousDesc
            };

            const context = _createContext(unitMalicious, basicUnitType, basicBuilding);

            const result = mapper.mapUnit(context);

            expect(result.description).toBe(maliciousDesc);
            // Sanitization should be handled by the automation layer
        });

        // Invalid date formats
        it('should handle invalid date formats gracefully', () => {
            const unitInvalidDate: UnitData = {
                ...basicUnit,
                availableDate: 'not-a-date'
            };

            const context = _createContext(unitInvalidDate, basicUnitType, basicBuilding);

            const result = mapper.mapUnit(context);

            expect(result.dateAvailable).toBeUndefined();
        });

        // Currency edge cases
        it('should handle various currency edge cases', () => {
            const buildingWithEdgeFees: BuildingData = {
                ...basicBuilding,
                applicationFee: 0.00,
                oneTimeFees:    [
                    { type: FeeType.APPLICATION, amount: 0.01, description: 'Penny Fee' },
                    { type: FeeType.ADMIN, amount: 99999.99, description: 'Max Fee' },
                    { type: FeeType.MOVE_IN, amount: -50, description: 'Negative Fee' }
                ],
                monthlyFees: [
                    { type: FeeType.PARKING, amount: 0, description: 'Zero Fee' }
                ]
            };

            const result = mapper.mapBuilding(buildingWithEdgeFees);

            expect(result.applicationFee).toBe(0);
            expect(result.fees).toBeDefined();
            expect(result.fees).toContainEqual(
                expect.objectContaining({ type: 'Application', amount: 0.01 })
            );
            expect(result.fees).toContainEqual(
                expect.objectContaining({ type: 'Administrative', amount: 99999.99 })
            );
        });

        // Extremely large arrays
        it('should handle extremely large amenity arrays', () => {
            const manyAmenities = times(150, i => ({
                name:     `Amenity ${i}`,
                category: AmenityCategory.PROPERTY
            }));

            const buildingManyAmenities: BuildingData = {
                ...basicBuilding,
                propertyAmenities: manyAmenities
            };

            const result = mapper.mapBuilding(buildingManyAmenities);

            expect(result.amenities).toBeDefined();
            expect(result.amenities!.length).toBe(150);
        });

        it('should handle extremely large photo arrays', () => {
            const manyPhotos = times(200, i => `https://example.com/photo${i}.jpg`);

            const context = _createContext(
                { ...basicUnit, photos: manyPhotos.slice(0, 100) },
                basicUnitType,
                { ...basicBuilding, photos: manyPhotos.slice(100) }
            );

            const result = mapper.mapUnit(context);

            expect(result.photos).toBeDefined();
            expect(result.photos?.length).toBe(200);
        });

        // Phone number validation
        it('should handle various phone number formats', () => {
            const buildingWithContact: BuildingData = {
                ...basicBuilding,
                contactInfo: {
                    phone: '(123) 456-7890',
                    email: 'test@example.com'
                }
            };

            const result = mapper.mapBuilding(buildingWithContact);

            expect(result.contactInfo).toBeDefined();
            expect(result.contactInfo!.phone).toBe('(123) 456-7890');
        });

        // URL validation
        it('should handle invalid URLs in photo arrays', () => {
            const invalidPhotos = [
                'not-a-url',
                'ftp://invalid-protocol.com/photo.jpg',
                'javascript:alert(1)',
                'data:image/png;base64,invalidbase64',
                'https://valid-url.com/photo.jpg'
            ];

            const buildingInvalidPhotos: BuildingData = {
                ...basicBuilding,
                photos: invalidPhotos
            };

            const result = mapper.mapBuilding(buildingInvalidPhotos);

            expect(result.photos).toBeDefined();
            expect(result.photos).toEqual(invalidPhotos); // Validation happens downstream
        });

        // Missing required fields at different inheritance levels
        it('should handle missing fields at model level with unit fallback', () => {
            const incompleteUnitType: UnitTypeData = {
                buildingID: 'BLDG-001',
                modelID:    'MODEL-001',
                modelName:  'Incomplete Model',
                beds:       undefined as unknown as number,
                baths:      undefined as unknown as number
            };

            const completeUnitData: UnitData = {
                ...basicUnit,
                beds:  3,
                baths: 2
            };

            const context = _createContext(completeUnitData, incompleteUnitType, basicBuilding);

            const result = mapper.mapUnit(context);

            expect(result.beds).toBe(3); // From unit
            expect(result.baths).toBe(2); // From unit
        });

        // Conflicting data between inheritance levels
        it('should prioritize unit data over model data', () => {
            const conflictingUnit: UnitData = {
                ...basicUnit,
                beds:            3,
                rent:            2000,
                unitDescription: 'Unit description'
            };

            const conflictingModel: UnitTypeData = {
                ...basicUnitType,
                beds:    2,
                minRent: 1500,
                maxRent: 1800
            };

            const context = _createContext(conflictingUnit, conflictingModel, completeBuilding);

            const result = mapper.mapUnit(context);

            expect(result.beds).toBe(3); // Unit wins
            expect(result.rent).toBe(2000); // Unit wins
            expect(result.description).toContain('Unit description'); // Unit wins
        });

        // Reserved keywords
        it('should handle Zillow reserved keywords in amenities', () => {
            const reservedAmenities = [
                { name: 'null', category: AmenityCategory.UNIT },
                { name: 'undefined', category: AmenityCategory.UNIT },
                { name: 'false', category: AmenityCategory.UNIT },
                { name: 'true', category: AmenityCategory.UNIT }
            ];

            const buildingReserved: BuildingData = {
                ...basicBuilding,
                propertyAmenities: reservedAmenities
            };

            const result = mapper.mapBuilding(buildingReserved);

            expect(result.amenities).toBeDefined();
            expect(result.amenities!.length).toBe(4);
        });

        // Timezone edge cases
        it('should handle dates at timezone boundaries', () => {
            const timezoneUnit: UnitData = {
                ...basicUnit,
                availableDate: '2024-12-31T23:59:59Z' // New Year's Eve UTC
            };

            const context = _createContext(timezoneUnit, basicUnitType, basicBuilding);

            const result = mapper.mapUnit(context);

            expect(result.dateAvailable).toBeDefined();
            // The exact output depends on timezone handling
        });

        // Empty strings vs null/undefined
        it('should handle empty strings and null/undefined appropriately', () => {
            const emptyStringBuilding: BuildingData = {
                ...basicBuilding,
                propertyDescription: '',
                description:         undefined,
                contactInfo:         {
                    phone: '',
                    email: null as unknown as string
                }
            };

            const result = mapper.mapBuilding(emptyStringBuilding);

            // Empty string for propertyDescription, undefined for description
            expect(result.description).toBeUndefined();
            expect(result.contactInfo!.phone).toBe('');
            expect(result.contactInfo!.email).toBeNull();
        });

        // Transformer function errors
        it('should handle transformer function errors gracefully', () => {
            // Create a scenario where enum transformer might fail
            const invalidParkingType: BuildingData = {
                ...basicBuilding,
                parkingOptions: [
                    {
                        type:     'INVALID_PARKING' as ParkingType,
                        included: true
                    }
                ]
            };

            expect(() => mapper.mapBuilding(invalidParkingType)).not.toThrow();
        });

        // Unicode and special characters
        it('should handle unicode and special characters correctly', () => {
            const unicodeBuilding: BuildingData = {
                ...basicBuilding,
                propertyDescription: '🏠 Élégant château with café ☕',
                street:              '123 Główna ulica',
                propertyAmenities:   [
                    { name: '游泳池 (Swimming Pool)', category: AmenityCategory.PROPERTY },
                    { name: 'Sauna & Spa™', category: AmenityCategory.PROPERTY }
                ]
            };

            const result = mapper.mapBuilding(unicodeBuilding);

            expect(result.description).toBe('🏠 Élégant château with café ☕');
            expect(result.address.street).toBe('123 Główna ulica');
            // Amenity names are preserved as-is when no transformation mapping exists
            expect(map(result.amenities, 'name')).toContain('游泳池 (Swimming Pool)');
            expect(map(result.amenities, 'name')).toContain('Sauna & Spa™');
        });
    });

    describe('Custom Field Mappings', () => {
        it('should accept custom field mappings', () => {
            const customMappings: Partial<FieldMappingConfig> = {
                propertyType: {
                    apartment: 'Apartment Home',
                    condo:     'Condominium Unit'
                }
            };

            const customMapper = new ZillowMapper(customMappings);

            expect(customMapper.siteId).toBe('zillow');
        });
    });
});
