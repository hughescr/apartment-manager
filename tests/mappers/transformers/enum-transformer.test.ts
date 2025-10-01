/* eslint-disable @typescript-eslint/no-explicit-any -- Testing edge cases with invalid types */
import { describe, it, expect } from 'bun:test';
import { values } from 'lodash';
import {
    createEnumTransformer,
    createReverseEnumTransformer,
    transformEnumArray
} from '../../../src/mappers/transformers/enum-transformer';
import {
    PropertyType,
    PetType,
    ParkingType,
    UtilityType,
    FeeType,
    AmenityCategory
} from '../../../src/types';
import type { EnumMapping } from '../../../src/mappers/types';

describe('Enum Transformer', () => {
    describe('createEnumTransformer', () => {
        describe('Property Type Mapping', () => {
            it('should transform apartment type for apartments.com', () => {
                const transformer = createEnumTransformer('propertyType', 'apartments_com');
                expect(transformer(PropertyType.APARTMENT)).toBe('Apartment');
            });

            it('should transform apartment type for zillow', () => {
                const transformer = createEnumTransformer('propertyType', 'zillow');
                expect(transformer(PropertyType.APARTMENT)).toBe('Apartment');
            });

            it('should transform townhome differently for each site', () => {
                const apartmentsTransformer = createEnumTransformer('propertyType', 'apartments_com');
                const zillowTransformer = createEnumTransformer('propertyType', 'zillow');

                expect(apartmentsTransformer(PropertyType.TOWNHOME)).toBe('Townhome');
                expect(zillowTransformer(PropertyType.TOWNHOME)).toBe('Townhouse');
            });

            it('should return original value when no mapping exists', () => {
                const transformer = createEnumTransformer('propertyType', 'apartments_com');
                const unmappedValue = 'UNKNOWN_TYPE' as PropertyType;
                expect(transformer(unmappedValue)).toBe('UNKNOWN_TYPE');
            });

            it('should return original value for unknown site', () => {
                const transformer = createEnumTransformer('propertyType', 'unknown_site');
                expect(transformer(PropertyType.APARTMENT)).toBe(PropertyType.APARTMENT);
            });
        });

        describe('Pet Type Mapping', () => {
            it('should transform pet types correctly', () => {
                const apartmentsTransformer = createEnumTransformer('petType', 'apartments_com');
                const zillowTransformer = createEnumTransformer('petType', 'zillow');

                expect(apartmentsTransformer(PetType.DOG)).toBe('Dogs');
                expect(zillowTransformer(PetType.DOG)).toBe('Dog');

                expect(apartmentsTransformer(PetType.NO_PETS)).toBe('No Pets');
                expect(zillowTransformer(PetType.NO_PETS)).toBe('No Pets Allowed');
            });
        });

        describe('Parking Type Mapping', () => {
            it('should transform parking types correctly', () => {
                const apartmentsTransformer = createEnumTransformer('parkingType', 'apartments_com');
                const zillowTransformer = createEnumTransformer('parkingType', 'zillow');

                expect(apartmentsTransformer(ParkingType.COVERED)).toBe('Covered');
                expect(zillowTransformer(ParkingType.COVERED)).toBe('Covered Parking');

                expect(apartmentsTransformer(ParkingType.UNCOVERED)).toBe('Uncovered');
                expect(zillowTransformer(ParkingType.UNCOVERED)).toBe('Off-street Parking');
            });
        });

        describe('Utility Type Mapping', () => {
            it('should transform utility types correctly', () => {
                const apartmentsTransformer = createEnumTransformer('utilityType', 'apartments_com');
                const zillowTransformer = createEnumTransformer('utilityType', 'zillow');

                expect(apartmentsTransformer(UtilityType.ELECTRICITY)).toBe('Electricity');
                expect(zillowTransformer(UtilityType.ELECTRICITY)).toBe('Electric');

                expect(apartmentsTransformer(UtilityType.AIR_CONDITIONING)).toBe('A/C');
                expect(zillowTransformer(UtilityType.AIR_CONDITIONING)).toBe('Air Conditioning');
            });
        });

        describe('Fee Type Mapping', () => {
            it('should transform fee types correctly', () => {
                const apartmentsTransformer = createEnumTransformer('feeType', 'apartments_com');
                const zillowTransformer = createEnumTransformer('feeType', 'zillow');

                expect(apartmentsTransformer(FeeType.ADMIN)).toBe('Admin Fee');
                expect(zillowTransformer(FeeType.ADMIN)).toBe('Administrative Fee');

                expect(apartmentsTransformer(FeeType.PARKING)).toBe('Parking Fee');
                expect(zillowTransformer(FeeType.PARKING)).toBe('Parking');
            });
        });

        describe('Amenity Category Mapping', () => {
            it('should transform amenity categories correctly', () => {
                const apartmentsTransformer = createEnumTransformer('amenityCategory', 'apartments_com');
                const zillowTransformer = createEnumTransformer('amenityCategory', 'zillow');

                expect(apartmentsTransformer(AmenityCategory.UNIT)).toBe('Unit');
                expect(zillowTransformer(AmenityCategory.UNIT)).toBe('Interior');

                expect(apartmentsTransformer(AmenityCategory.COMMUNITY)).toBe('Community');
                expect(zillowTransformer(AmenityCategory.COMMUNITY)).toBe('Community');
            });
        });

        describe('Custom Mappings', () => {
            it('should use custom mappings when provided', () => {
                const customMappings: EnumMapping<PropertyType>[] = [
                    {
                        internal: PropertyType.APARTMENT,
                        external: {
                            apartments_com: 'Custom Apartment',
                            zillow:         'Custom Apt'
                        }
                    }
                ];

                const transformer = createEnumTransformer('propertyType', 'apartments_com', customMappings);
                expect(transformer(PropertyType.APARTMENT)).toBe('Custom Apartment');
            });

            it('should fall back to original value when custom mapping not found', () => {
                const customMappings: EnumMapping<PropertyType>[] = [
                    {
                        internal: PropertyType.APARTMENT,
                        external: {
                            apartments_com: 'Custom Apartment',
                            zillow:         'Custom Apt'
                        }
                    }
                ];

                const transformer = createEnumTransformer('propertyType', 'apartments_com', customMappings);
                expect(transformer(PropertyType.CONDO)).toBe(PropertyType.CONDO);
            });
        });
    });

    describe('createReverseEnumTransformer', () => {
        it('should transform external values back to internal enums', () => {
            const reverseTransformer = createReverseEnumTransformer('propertyType', 'apartments_com');

            expect(reverseTransformer('Apartment')).toBe(PropertyType.APARTMENT);
            expect(reverseTransformer('Townhome')).toBe(PropertyType.TOWNHOME);
            expect(reverseTransformer('Single Family')).toBe(PropertyType.SINGLE_FAMILY);
        });

        it('should handle zillow-specific external values', () => {
            const reverseTransformer = createReverseEnumTransformer('propertyType', 'zillow');

            expect(reverseTransformer('Townhouse')).toBe(PropertyType.TOWNHOME);
            expect(reverseTransformer('Single Family Home')).toBe(PropertyType.SINGLE_FAMILY);
        });

        it('should return undefined for unknown external values', () => {
            const reverseTransformer = createReverseEnumTransformer('propertyType', 'apartments_com');

            expect(reverseTransformer('Unknown Type')).toBeUndefined();
            expect(reverseTransformer('')).toBeUndefined();
        });

        it('should work with custom mappings', () => {
            const customMappings: EnumMapping<PropertyType>[] = [
                {
                    internal: PropertyType.APARTMENT,
                    external: {
                        apartments_com: 'Custom External',
                        zillow:         'Custom Zillow'
                    }
                }
            ];

            const reverseTransformer = createReverseEnumTransformer('propertyType', 'apartments_com', customMappings);
            expect(reverseTransformer('Custom External')).toBe(PropertyType.APARTMENT);
            expect(reverseTransformer('Apartment')).toBeUndefined(); // Default mapping not used
        });

        it('should handle all enum types', () => {
            // Pet type
            const petTransformer = createReverseEnumTransformer('petType', 'zillow');
            expect(petTransformer('Dog')).toBe(PetType.DOG);
            expect(petTransformer('No Pets Allowed')).toBe(PetType.NO_PETS);

            // Parking type
            const parkingTransformer = createReverseEnumTransformer('parkingType', 'apartments_com');
            expect(parkingTransformer('Covered')).toBe(ParkingType.COVERED);

            // Utility type
            const utilityTransformer = createReverseEnumTransformer('utilityType', 'zillow');
            expect(utilityTransformer('Electric')).toBe(UtilityType.ELECTRICITY);

            // Fee type
            const feeTransformer = createReverseEnumTransformer('feeType', 'zillow');
            expect(feeTransformer('Administrative Fee')).toBe(FeeType.ADMIN);

            // Amenity category
            const amenityTransformer = createReverseEnumTransformer('amenityCategory', 'zillow');
            expect(amenityTransformer('Interior')).toBe(AmenityCategory.UNIT);
        });
    });

    describe('transformEnumArray', () => {
        it('should transform arrays of enum values', () => {
            const petTypes = [PetType.DOG, PetType.CAT, PetType.BIRD];
            const result = transformEnumArray(petTypes, 'petType', 'apartments_com');

            expect(result).toEqual(['Dogs', 'Cats', 'Birds']);
        });

        it('should handle empty arrays', () => {
            const result = transformEnumArray([], 'petType', 'apartments_com');
            expect(result).toEqual([]);
        });

        it('should handle arrays with unmapped values', () => {
            const values = [PropertyType.APARTMENT, 'UNKNOWN' as PropertyType, PropertyType.CONDO];
            const result = transformEnumArray(values, 'propertyType', 'apartments_com');

            expect(result).toEqual(['Apartment', 'UNKNOWN', 'Condo']);
        });

        it('should use custom mappings', () => {
            const customMappings: EnumMapping<PetType>[] = [
                {
                    internal: PetType.DOG,
                    external: {
                        apartments_com: 'Canine',
                        zillow:         'Doggo'
                    }
                }
            ];

            const petTypes = [PetType.DOG, PetType.CAT];
            const result = transformEnumArray(petTypes, 'petType', 'apartments_com', customMappings);

            expect(result).toEqual(['Canine', PetType.CAT]); // CAT falls back to original
        });

        it('should handle different sites', () => {
            const utilityTypes = [UtilityType.ELECTRICITY, UtilityType.AIR_CONDITIONING];

            const apartmentsResult = transformEnumArray(utilityTypes, 'utilityType', 'apartments_com');
            expect(apartmentsResult).toEqual(['Electricity', 'A/C']);

            const zillowResult = transformEnumArray(utilityTypes, 'utilityType', 'zillow');
            expect(zillowResult).toEqual(['Electric', 'Air Conditioning']);
        });
    });

    describe('Edge Cases', () => {
        it('should handle undefined enum types gracefully', () => {
            // This tests the case where an invalid enumType is passed
            const transformer = createEnumTransformer('invalidType' as any, 'apartments_com');
            expect(transformer('any value' as any)).toBe('any value');
        });

        it('should handle null/undefined in custom mappings', () => {
            const customMappings: EnumMapping<PropertyType>[] = [
                {
                    internal: PropertyType.APARTMENT,
                    external: {
                        apartments_com: null as any,
                        zillow:         undefined as any
                    }
                }
            ];

            const transformer = createEnumTransformer('propertyType', 'apartments_com', customMappings);
            expect(transformer(PropertyType.APARTMENT)).toBe(PropertyType.APARTMENT);
        });

        it('should handle special characters in enum values', () => {
            const customMappings: EnumMapping<string>[] = [
                {
                    internal: 'SPECIAL_&_CHARS' as any,
                    external: {
                        apartments_com: 'Special & Characters',
                        zillow:         'Special/Characters'
                    }
                }
            ];

            const transformer = createEnumTransformer('propertyType', 'apartments_com', customMappings);
            expect(transformer('SPECIAL_&_CHARS' as any)).toBe('Special & Characters');
        });
    });

    describe('Type Safety', () => {
        it('should maintain type safety with enum transformers', () => {
            // This is a compile-time test, but we can verify runtime behavior
            const transformer = createEnumTransformer('propertyType', 'apartments_com');
            const result: string = transformer(PropertyType.APARTMENT);
            expect(typeof result).toBe('string');
        });

        it('should handle reverse transformation type safety', () => {
            const reverseTransformer = createReverseEnumTransformer('propertyType', 'apartments_com');
            const result = reverseTransformer('Apartment');

            // Result should be PropertyType | undefined
            if(result) {
                expect(values(PropertyType)).toContain(result);
            }
        });
    });
});
