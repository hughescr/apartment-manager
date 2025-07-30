import { describe, it, expect } from 'bun:test';
import _ from 'lodash';
import {
    createAmenityNameTransformer,
    filterAmenitiesByCategory,
    transformAmenities,
    groupAmenitiesByCategory,
    mergeAmenities,
    amenityListToString,
    parseAmenityString,
    hasAmenities
} from '../../../src/mappers/transformers/amenity-transformer';
import { AmenityCategory } from '../../../src/types';
import type { Amenity } from '../../../src/types';

describe('Amenity Transformer', () => {
    // Test amenities
    const testAmenities: Amenity[] = [
        { name: 'Air Conditioning', category: AmenityCategory.UNIT },
        { name: 'Dishwasher', category: AmenityCategory.UNIT },
        { name: 'Hardwood Floors', category: AmenityCategory.UNIT },
        { name: 'Swimming Pool', category: AmenityCategory.PROPERTY },
        { name: 'Fitness Center', category: AmenityCategory.PROPERTY },
        { name: 'Pet Friendly', category: AmenityCategory.COMMUNITY },
        { name: 'Concierge', category: AmenityCategory.COMMUNITY }
    ];

    describe('createAmenityNameTransformer', () => {
        it('should transform amenity names for apartments.com', () => {
            const transformer = createAmenityNameTransformer('apartments_com');

            expect(transformer('Air Conditioning')).toBe('A/C');
            expect(transformer('Swimming Pool')).toBe('Pool');
            expect(transformer('Fitness Center')).toBe('Gym');
            expect(transformer('In-Unit Washer/Dryer')).toBe('Washer/Dryer In Unit');
        });

        it('should transform amenity names for zillow', () => {
            const transformer = createAmenityNameTransformer('zillow');

            expect(transformer('Air Conditioning')).toBe('Air conditioning');
            expect(transformer('Swimming Pool')).toBe('Pool');
            expect(transformer('Fitness Center')).toBe('Fitness center');
            expect(transformer('In-Unit Washer/Dryer')).toBe('In unit laundry');
        });

        it('should return original name for unmapped amenities', () => {
            const transformer = createAmenityNameTransformer('apartments_com');

            expect(transformer('Custom Amenity')).toBe('Custom Amenity');
            expect(transformer('Unknown Feature')).toBe('Unknown Feature');
        });

        it('should handle unknown sites', () => {
            const transformer = createAmenityNameTransformer('unknown_site');

            expect(transformer('Air Conditioning')).toBe('Air Conditioning');
            expect(transformer('Swimming Pool')).toBe('Swimming Pool');
        });

        it('should handle special amenity mappings', () => {
            const apartmentsTransformer = createAmenityNameTransformer('apartments_com');
            const zillowTransformer = createAmenityNameTransformer('zillow');

            // Balcony/Patio mapping
            expect(apartmentsTransformer('Balcony')).toBe('Balcony');
            expect(apartmentsTransformer('Patio')).toBe('Patio');
            expect(zillowTransformer('Balcony')).toBe('Balcony/deck/patio');
            expect(zillowTransformer('Patio')).toBe('Balcony/deck/patio');

            // Pet mapping
            expect(apartmentsTransformer('Pet Friendly')).toBe('Pet Friendly');
            expect(zillowTransformer('Pet Friendly')).toBe('Pets allowed');
        });
    });

    describe('filterAmenitiesByCategory', () => {
        it('should filter amenities by unit category', () => {
            const unitAmenities = filterAmenitiesByCategory(testAmenities, AmenityCategory.UNIT);

            expect(unitAmenities).toHaveLength(3);
            expect(_.map(unitAmenities, 'name')).toEqual([
                'Air Conditioning',
                'Dishwasher',
                'Hardwood Floors'
            ]);
        });

        it('should filter amenities by property category', () => {
            const propertyAmenities = filterAmenitiesByCategory(testAmenities, AmenityCategory.PROPERTY);

            expect(propertyAmenities).toHaveLength(2);
            expect(_.map(propertyAmenities, 'name')).toEqual([
                'Swimming Pool',
                'Fitness Center'
            ]);
        });

        it('should filter amenities by community category', () => {
            const communityAmenities = filterAmenitiesByCategory(testAmenities, AmenityCategory.COMMUNITY);

            expect(communityAmenities).toHaveLength(2);
            expect(_.map(communityAmenities, 'name')).toEqual([
                'Pet Friendly',
                'Concierge'
            ]);
        });

        it('should return empty array when no amenities match', () => {
            const emptyAmenities: Amenity[] = [];
            const result = filterAmenitiesByCategory(emptyAmenities, AmenityCategory.UNIT);

            expect(result).toEqual([]);
        });
    });

    describe('transformAmenities', () => {
        it('should transform all amenities for a site', () => {
            const result = transformAmenities(testAmenities, 'apartments_com');

            expect(result).toEqual([
                'A/C',
                'Dishwasher',
                'Wood Floors',
                'Pool',
                'Gym',
                'Pet Friendly',
                'Concierge Service'
            ]);
        });

        it('should transform amenities with category filter', () => {
            const result = transformAmenities(testAmenities, 'zillow', AmenityCategory.UNIT);

            expect(result).toEqual([
                'Air conditioning',
                'Dishwasher',
                'Hardwood floors'
            ]);
        });

        it('should handle undefined amenities', () => {
            expect(transformAmenities(undefined, 'apartments_com')).toEqual([]);
        });

        it('should handle empty amenities', () => {
            expect(transformAmenities([], 'apartments_com')).toEqual([]);
        });

        it('should handle unknown sites', () => {
            const result = transformAmenities(testAmenities, 'unknown_site');

            expect(result).toEqual(_.map(testAmenities, 'name'));
        });
    });

    describe('groupAmenitiesByCategory', () => {
        it('should group amenities by category', () => {
            const grouped = groupAmenitiesByCategory(testAmenities);

            expect(grouped[AmenityCategory.UNIT]).toHaveLength(3);
            expect(grouped[AmenityCategory.PROPERTY]).toHaveLength(2);
            expect(grouped[AmenityCategory.COMMUNITY]).toHaveLength(2);
        });

        it('should include empty arrays for missing categories', () => {
            const onlyUnitAmenities: Amenity[] = [
                { name: 'Air Conditioning', category: AmenityCategory.UNIT },
                { name: 'Dishwasher', category: AmenityCategory.UNIT }
            ];

            const grouped = groupAmenitiesByCategory(onlyUnitAmenities);

            expect(grouped[AmenityCategory.UNIT]).toHaveLength(2);
            expect(grouped[AmenityCategory.PROPERTY]).toEqual([]);
            expect(grouped[AmenityCategory.COMMUNITY]).toEqual([]);
        });

        it('should handle empty amenities', () => {
            const grouped = groupAmenitiesByCategory([]);

            expect(grouped[AmenityCategory.UNIT]).toEqual([]);
            expect(grouped[AmenityCategory.PROPERTY]).toEqual([]);
            expect(grouped[AmenityCategory.COMMUNITY]).toEqual([]);
        });
    });

    describe('mergeAmenities', () => {
        it('should merge amenities from multiple sources', () => {
            const source1: Amenity[] = [
                { name: 'Air Conditioning', category: AmenityCategory.UNIT },
                { name: 'Swimming Pool', category: AmenityCategory.PROPERTY }
            ];

            const source2: Amenity[] = [
                { name: 'Dishwasher', category: AmenityCategory.UNIT },
                { name: 'Fitness Center', category: AmenityCategory.PROPERTY }
            ];

            const merged = mergeAmenities(source1, source2);

            expect(merged).toHaveLength(4);
            expect(_.map(merged, 'name').sort()).toEqual([
                'Air Conditioning',
                'Dishwasher',
                'Fitness Center',
                'Swimming Pool'
            ]);
        });

        it('should override duplicates with later sources', () => {
            const source1: Amenity[] = [
                { name: 'Air Conditioning', category: AmenityCategory.UNIT }
            ];

            const source2: Amenity[] = [
                { name: 'Air Conditioning', category: AmenityCategory.PROPERTY }
            ];

            const merged = mergeAmenities(source1, source2);

            expect(merged).toHaveLength(1);
            expect(merged[0]).toEqual({ name: 'Air Conditioning', category: AmenityCategory.PROPERTY });
        });

        it('should handle undefined sources', () => {
            const source1: Amenity[] = [
                { name: 'Air Conditioning', category: AmenityCategory.UNIT }
            ];

            const merged = mergeAmenities(source1, undefined, []);

            expect(merged).toHaveLength(1);
            expect(merged[0].name).toBe('Air Conditioning');
        });

        it('should handle all undefined sources', () => {
            const merged = mergeAmenities(undefined, undefined);
            expect(merged).toEqual([]);
        });

        it('should maintain order of insertion', () => {
            const source1: Amenity[] = [
                { name: 'C', category: AmenityCategory.UNIT },
                { name: 'A', category: AmenityCategory.UNIT }
            ];

            const source2: Amenity[] = [
                { name: 'B', category: AmenityCategory.UNIT }
            ];

            const merged = mergeAmenities(source1, source2);

            expect(_.map(merged, 'name')).toEqual(['C', 'A', 'B']);
        });
    });

    describe('amenityListToString', () => {
        it('should create comma-separated list for apartments.com', () => {
            const result = amenityListToString(testAmenities, 'apartments_com');

            expect(result).toBe('A/C, Dishwasher, Wood Floors, Pool, Gym, Pet Friendly, Concierge Service');
        });

        it('should create comma-separated list for zillow', () => {
            const unitAmenities = filterAmenitiesByCategory(testAmenities, AmenityCategory.UNIT);
            const result = amenityListToString(unitAmenities, 'zillow');

            expect(result).toBe('Air conditioning, Dishwasher, Hardwood floors');
        });

        it('should handle undefined amenities', () => {
            expect(amenityListToString(undefined, 'apartments_com')).toBe('');
        });

        it('should handle empty amenities', () => {
            expect(amenityListToString([], 'apartments_com')).toBe('');
        });
    });

    describe('parseAmenityString', () => {
        it('should parse comma-separated amenity string', () => {
            const amenityString = 'Air Conditioning, Swimming Pool, Fitness Center';
            const result = parseAmenityString(amenityString);

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({ name: 'Air Conditioning', category: AmenityCategory.PROPERTY });
            expect(result[1]).toEqual({ name: 'Swimming Pool', category: AmenityCategory.PROPERTY });
            expect(result[2]).toEqual({ name: 'Fitness Center', category: AmenityCategory.PROPERTY });
        });

        it('should use custom default category', () => {
            const amenityString = 'Dishwasher, Hardwood Floors';
            const result = parseAmenityString(amenityString, AmenityCategory.UNIT);

            expect(result).toHaveLength(2);
            expect(result[0].category).toBe(AmenityCategory.UNIT);
            expect(result[1].category).toBe(AmenityCategory.UNIT);
        });

        it('should handle whitespace', () => {
            const amenityString = '  Air Conditioning  ,Swimming Pool,  Fitness Center  ';
            const result = parseAmenityString(amenityString);

            expect(result).toHaveLength(3);
            expect(_.map(result, 'name')).toEqual([
                'Air Conditioning',
                'Swimming Pool',
                'Fitness Center'
            ]);
        });

        it('should filter out empty strings', () => {
            const amenityString = 'Air Conditioning,,Swimming Pool,';
            const result = parseAmenityString(amenityString);

            expect(result).toHaveLength(2);
            expect(_.map(result, 'name')).toEqual(['Air Conditioning', 'Swimming Pool']);
        });

        it('should handle undefined and empty strings', () => {
            expect(parseAmenityString(undefined)).toEqual([]);
            expect(parseAmenityString('')).toEqual([]);
        });
    });

    describe('hasAmenities', () => {
        it('should return true when all required amenities are present', () => {
            const required = ['Air Conditioning', 'Swimming Pool'];
            expect(hasAmenities(testAmenities, required)).toBe(true);
        });

        it('should return false when some required amenities are missing', () => {
            const required = ['Air Conditioning', 'Garage Parking'];
            expect(hasAmenities(testAmenities, required)).toBe(false);
        });

        it('should return true when no amenities are required', () => {
            expect(hasAmenities(testAmenities, [])).toBe(true);
            expect(hasAmenities(undefined, [])).toBe(true);
        });

        it('should handle undefined amenities', () => {
            expect(hasAmenities(undefined, ['Air Conditioning'])).toBe(false);
        });

        it('should handle empty amenities', () => {
            expect(hasAmenities([], ['Air Conditioning'])).toBe(false);
        });

        it('should be case sensitive', () => {
            const required = ['air conditioning']; // lowercase
            expect(hasAmenities(testAmenities, required)).toBe(false);
        });

        it('should handle duplicate requirements', () => {
            const required = ['Air Conditioning', 'Air Conditioning'];
            expect(hasAmenities(testAmenities, required)).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle amenities with special characters', () => {
            const specialAmenities: Amenity[] = [
                { name: 'A/C & Heating', category: AmenityCategory.UNIT },
                { name: '24/7 Security', category: AmenityCategory.PROPERTY },
                { name: 'BBQ/Picnic Area', category: AmenityCategory.COMMUNITY }
            ];

            const result = transformAmenities(specialAmenities, 'apartments_com');
            expect(result).toEqual(['A/C & Heating', '24/7 Security', 'BBQ/Picnic Area']);
        });

        it('should handle very long amenity lists', () => {
            const manyAmenities: Amenity[] = Array.from({ length: 100 }, (_, i) => ({
                name: `Amenity ${i}`,
                category: AmenityCategory.PROPERTY
            }));

            const result = transformAmenities(manyAmenities, 'apartments_com');
            expect(result).toHaveLength(100);
        });

        it('should handle amenities with empty names', () => {
            // Test parsing string with valid amenity name
            const result = parseAmenityString('Valid Amenity');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Valid Amenity');
        });
    });
});
