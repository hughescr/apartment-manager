/**
 * Enum Edge Cases Test Suite
 * Tests for enum value validation, assignment, and edge case behavior
 *
 * This file contains comprehensive tests for all enum-related edge cases
 * that were previously part of the larger edge-cases.test.ts file.
 */

import { repeat, times } from 'lodash';
import {
    describe,
    it,
    expect,
    // Types
    Fee,
    PetPolicy,
    Amenity,
    BuildingData,
    ParkingOption,
    StorageOption,
    // Enums
    FeeType,
    PetType,
    AmenityCategory,
    PropertyType,
    ParkingType,
    StorageType,
    UtilityType,
    WebsiteStatus,
    DayOfWeek,
    // Test utilities
    TestAssertions
} from './test-types';

describe('Enum Edge Cases', () => {
    describe('Empty and Null Enum Values', () => {
        it('should accept null/undefined enum values in optional fields', () => {
            const fee: Fee = {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing null assignment to enum type for edge case validation
                type: null as any, // Type system allows this with 'as any'
                amount: 100
            };
            expect(fee.type).toBeNull();

            const fee2: Fee = {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing undefined assignment to enum type for edge case validation
                type: undefined as any,
                amount: 100
            };
            expect(fee2.type).toBeUndefined();
        });

        it('should handle undefined enum values in arrays', () => {
            const policy: PetPolicy = {
                allowed: true,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing array with mixed valid/invalid enum values including null/undefined
                types: [PetType.DOG, undefined as any, PetType.CAT, null as any]
            };
            expect(policy.types).toContain(undefined);
            expect(policy.types).toContain(null);
            expect(policy.types).toHaveLength(4);
        });
    });

    describe('Invalid Enum Assignments', () => {
        it('should accept non-enum string values with type assertion', () => {
            const building: BuildingData = {
                buildingID: 'bldg-123',
                propertyType: 'invalid-type' as PropertyType
            };
            expect(building.propertyType as string).toBe('invalid-type');

            const building2: BuildingData = {
                buildingID: 'bldg-456',
                propertyType: 'APARTMENT' as PropertyType // Wrong case
            };
            expect(building2.propertyType as string).toBe('APARTMENT');
        });

        it('should accept numeric values as enum with type assertion', () => {
            const amenity: Amenity = {
                name: 'Test',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing numeric value assignment to enum type for edge case testing
                category: 123 as any as AmenityCategory
            };
            expect(amenity.category as unknown).toBe(123);

            const amenity2: Amenity = {
                name: 'Test2',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing boolean value assignment to enum type for edge case testing
                category: true as any as AmenityCategory
            };
            expect(amenity2.category as unknown).toBe(true);
        });

        it('should accept object types as enum values', () => {
            const parking: ParkingOption = {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing object assignment to enum type to verify type system behavior
                type: { invalid: 'object' } as any as ParkingType,
                included: true
            };
            expect(typeof parking.type).toBe('object');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing property on object assigned to enum type for test verification
            expect((parking.type as any).invalid).toBe('object');
        });
    });

    describe('Enum Array Edge Cases', () => {
        it('should accept empty arrays for enum array fields', () => {
            const policy: PetPolicy = {
                allowed: true,
                types: []
            };
            expect(policy.types).toEqual([]);
            expect(policy.types).toHaveLength(0);
        });

        it('should accept arrays with invalid enum values', () => {
            const policy: PetPolicy = {
                allowed: true,
                types: ['invalid-pet' as PetType, '' as PetType, '   ' as PetType]
            };
            expect(policy.types).toContain('invalid-pet');
            expect(policy.types).toContain('');
            expect(policy.types).toContain('   ');
        });

        it('should accept mixed valid and invalid enum values', () => {
            const policy: PetPolicy = {
                allowed: true,
                types: [
                    PetType.DOG,
                    'not-a-pet' as PetType,
                    PetType.CAT,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing numeric value in enum array for edge case validation
                    123 as any,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing null value in enum array for edge case validation
                    null as any,
                    PetType.BIRD
                ]
            };
            expect(policy.types).toHaveLength(6);
            expect(policy.types![0]).toBe(PetType.DOG);
            expect(policy.types![1] as string).toBe('not-a-pet');
            expect(policy.types![3] as unknown).toBe(123);
        });

        it('should accept very large enum arrays', () => {
            const manyTypes = times(10000, () => PetType.DOG);
            const policy: PetPolicy = {
                allowed: true,
                types: manyTypes
            };
            expect(policy.types).toHaveLength(10000);
        });
    });

    describe('Case Sensitivity in Enum Values', () => {
        it('should accept wrong-case enum values with type assertion', () => {
            const status: Record<string, WebsiteStatus> = {
                site1: 'ACTIVE' as WebsiteStatus, // Should be lowercase
                site2: 'Active' as WebsiteStatus, // Mixed case
                site3: 'AcTiVe' as WebsiteStatus, // Random case
                site4: WebsiteStatus.ACTIVE // Correct
            };
            expect(status.site1 as string).toBe('ACTIVE');
            expect(status.site2 as string).toBe('Active');
            expect(status.site3 as string).toBe('AcTiVe');
            expect(status.site4 as string).toBe('active');
        });

        it('should handle case variations in day names', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Creating flexible Record type for testing various day name formats
            const hours: Record<string, any> = {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing uppercase day name as key for case sensitivity validation
                ['MONDAY' as any]: { open: '09:00', close: '17:00' },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing title case day name as key for case sensitivity validation
                ['Monday' as any]: { open: '10:00', close: '18:00' },
                ['monday']: { open: '11:00', close: '19:00' },
                ['mondayCorrect']: { open: '12:00', close: '20:00' }
            };
            expect(hours.MONDAY).toBeDefined();
            expect(hours.Monday).toBeDefined();
            expect(hours.monday).toBeDefined();
            expect(hours[DayOfWeek.MONDAY]).toBeDefined();
        });
    });

    describe('Whitespace in Enum Values', () => {
        it('should accept enum values with leading/trailing whitespace', () => {
            const fee: Fee = {
                type: '  application  ' as FeeType,
                amount: 50
            };
            expect(fee.type as string).toBe('  application  ');

            const fee2: Fee = {
                type: '\tapplication\n' as FeeType,
                amount: 50
            };
            expect(fee2.type as string).toBe('\tapplication\n');
        });

        it('should accept enum values with internal spaces', () => {
            const storage: StorageOption = {
                type: 'external unit' as StorageType, // Missing hyphen
                included: true
            };
            expect(storage.type as string).toBe('external unit');

            const property: BuildingData = {
                buildingID: 'bldg-123',
                propertyType: 'single family' as PropertyType // Missing hyphen
            };
            expect(property.propertyType as string).toBe('single family');
        });
    });

    describe('Special Characters in Enum Strings', () => {
        it('should accept enum values with special characters', () => {
            const utility: Record<string, boolean> = {
                ['water!@#$' as UtilityType]: true,
                ['<script>alert("xss")</script>' as UtilityType]: false,
                ['water\u0000' as UtilityType]: true, // Null character
                ['💧' as UtilityType]: true // Emoji
            };
            expect(utility['water!@#$']).toBe(true);
            expect(utility['<script>alert("xss")</script>']).toBe(false);
            expect(utility['💧']).toBe(true);
        });

        it('should handle SQL injection attempts in enum values', () => {
            const fee: Fee = {
                type: "'; DROP TABLE fees; --" as FeeType,
                amount: 100
            };
            expect(fee.type as string).toBe("'; DROP TABLE fees; --");
        });

        it('should handle very long enum string values', () => {
            const longString = repeat('a', 10000);
            const amenity: Amenity = {
                name: 'Test',
                category: longString as AmenityCategory
            };
            expect(amenity.category).toHaveLength(10000);
        });
    });

    describe('Enum Type Coercion', () => {
        it('should show what happens with enum concatenation', () => {
            const combined = (PropertyType.APARTMENT as string) + (PropertyType.CONDO as string);
            const building: BuildingData = {
                buildingID: 'bldg-123',
                propertyType: combined as PropertyType
            };
            expect(building.propertyType as string).toBe('apartmentcondo');
        });

        it('should handle enum values that look like other types', () => {
            const parking: ParkingOption = {
                type: 'true' as ParkingType, // String that looks like boolean
                included: true
            };
            expect(parking.type as string).toBe('true');

            const parking2: ParkingOption = {
                type: '123' as ParkingType, // String that looks like number
                included: false
            };
            expect(parking2.type as string).toBe('123');

            const parking3: ParkingOption = {
                type: 'null' as ParkingType, // String that looks like null
                included: true
            };
            expect(parking3.type as string).toBe('null');
        });

        it('should demonstrate the test assertion utility for enum assignments', () => {
            TestAssertions.testEnumAssignment(
                PropertyType.APARTMENT,
                'custom-property-type'
            );

            TestAssertions.testEnumAssignment(
                FeeType.APPLICATION,
                123
            );

            TestAssertions.testEnumAssignment(
                PetType.DOG,
                null
            );
        });
    });
});
