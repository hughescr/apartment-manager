import { describe, it, expect } from 'bun:test';
import _ from 'lodash';
import {
    // Types for testing
    Fee,
    PetPolicy,
    Amenity,
    BuildingData,
    UnitData,
    UnitTypeData,
    ParkingOption,
    StorageOption,
    RentSpecial,
    ContactInfo,
    TourAvailability,
    IncomeRestriction,
    ScreeningCriteria,
    WebsiteStatus,

    // Enums
    FeeType,
    PetType,
    AmenityCategory,
    PropertyType,
    ParkingType,
    StorageType,
    UtilityType,
    DayOfWeek
} from '../../../src/types';

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
            const manyTypes = _.fill(Array(10000), PetType.DOG);
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
            const longString = _.repeat('a', 10000);
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
    });
});

describe('Date and Time Edge Cases', () => {
    describe('Malformed ISO Dates', () => {
        it('should accept completely invalid date strings', () => {
            const special: RentSpecial = {
                title: 'Invalid Dates',
                startDate: 'not-a-date',
                endDate: 'definitely not a date either',
                description: 'Testing invalid date formats'
            };
            expect(special.startDate).toBe('not-a-date');
            expect(special.endDate).toBe('definitely not a date either');
        });

        it('should accept dates with invalid months and days', () => {
            const unit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-123',
                availableDate: '2024-13-32' // Month 13, Day 32
            };
            expect(unit.availableDate).toBe('2024-13-32');

            const unit2: UnitData = {
                buildingID: 'bldg-456',
                unitID: 'unit-456',
                availableDate: '2024-00-00' // Month 0, Day 0
            };
            expect(unit2.availableDate).toBe('2024-00-00');
        });

        it('should accept dates with wrong separators', () => {
            const special: RentSpecial = {
                title: 'Wrong Separators',
                startDate: '2024/12/31', // Slashes instead of hyphens
                endDate: '2024.12.31', // Dots instead of hyphens
                description: 'Testing wrong date separators'
            };
            expect(special.startDate).toBe('2024/12/31');
            expect(special.endDate).toBe('2024.12.31');
        });

        it('should accept dates with missing components', () => {
            const unitType: UnitTypeData = {
                buildingID: 'bldg-123',
                modelID: 'model-1',
                modelName: 'Test',
                beds: 1,
                baths: 1,
                dateAvailable: '2024-12' // Missing day
            };
            expect(unitType.dateAvailable).toBe('2024-12');

            const unitType2: UnitTypeData = {
                buildingID: 'bldg-456',
                modelID: 'model-2',
                modelName: 'Test2',
                beds: 2,
                baths: 1,
                dateAvailable: '2024' // Only year
            };
            expect(unitType2.dateAvailable).toBe('2024');
        });

        it('should accept dates with extra components', () => {
            const unit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-123',
                availableDate: '2024-12-31-01' // Extra component
            };
            expect(unit.availableDate).toBe('2024-12-31-01');
        });
    });

    describe('Timezone Handling in Dates', () => {
        it('should accept dates with various timezone formats', () => {
            const unit1: UnitData = {
                buildingID: 'bldg-1',
                unitID: 'unit-1',
                availableDate: '2024-12-31T23:59:59Z' // UTC
            };
            expect(unit1.availableDate).toBe('2024-12-31T23:59:59Z');

            const unit2: UnitData = {
                buildingID: 'bldg-2',
                unitID: 'unit-2',
                availableDate: '2024-12-31T23:59:59+00:00' // UTC with offset
            };
            expect(unit2.availableDate).toBe('2024-12-31T23:59:59+00:00');

            const unit3: UnitData = {
                buildingID: 'bldg-3',
                unitID: 'unit-3',
                availableDate: '2024-12-31T23:59:59-08:00' // PST
            };
            expect(unit3.availableDate).toBe('2024-12-31T23:59:59-08:00');

            const unit4: UnitData = {
                buildingID: 'bldg-4',
                unitID: 'unit-4',
                availableDate: '2024-12-31T23:59:59.999Z' // With milliseconds
            };
            expect(unit4.availableDate).toBe('2024-12-31T23:59:59.999Z');
        });

        it('should accept invalid timezone offsets', () => {
            const unit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-123',
                availableDate: '2024-12-31T23:59:59+25:00' // Invalid offset
            };
            expect(unit.availableDate).toBe('2024-12-31T23:59:59+25:00');

            const unit2: UnitData = {
                buildingID: 'bldg-456',
                unitID: 'unit-456',
                availableDate: '2024-12-31T23:59:59-99:99' // Invalid offset
            };
            expect(unit2.availableDate).toBe('2024-12-31T23:59:59-99:99');
        });
    });

    describe('Invalid Time Formats in Office Hours', () => {
        it('should accept hours outside 0-23 range', () => {
            const contact: ContactInfo = {
                officeHours: {
                    [DayOfWeek.MONDAY]: { open: '25:00', close: '30:00' },
                    [DayOfWeek.TUESDAY]: { open: '-5:00', close: '99:00' }
                }
            };
            expect(contact.officeHours?.[DayOfWeek.MONDAY]?.open).toBe('25:00');
            expect(contact.officeHours?.[DayOfWeek.TUESDAY]?.open).toBe('-5:00');
        });

        it('should accept minutes outside 0-59 range', () => {
            const tours: TourAvailability = {
                tourHours: {
                    [DayOfWeek.WEDNESDAY]: { open: '12:70', close: '14:99' },
                    [DayOfWeek.THURSDAY]: { open: '09:-30', close: '17:150' }
                }
            };
            expect(tours.tourHours?.[DayOfWeek.WEDNESDAY]?.open).toBe('12:70');
            expect(tours.tourHours?.[DayOfWeek.THURSDAY]?.close).toBe('17:150');
        });

        it('should accept non-numeric time values', () => {
            const contact: ContactInfo = {
                officeHours: {
                    [DayOfWeek.FRIDAY]: { open: 'noon', close: 'midnight' },
                    [DayOfWeek.SATURDAY]: { open: 'morning', close: 'evening' }
                }
            };
            expect(contact.officeHours?.[DayOfWeek.FRIDAY]?.open).toBe('noon');
            expect(contact.officeHours?.[DayOfWeek.SATURDAY]?.close).toBe('evening');
        });

        it('should accept time with wrong separators', () => {
            const tours: TourAvailability = {
                tourHours: {
                    [DayOfWeek.SUNDAY]: { open: '09.00', close: '17.00' }, // Dots
                    [DayOfWeek.MONDAY]: { open: '09-00', close: '17-00' }, // Hyphens
                    [DayOfWeek.TUESDAY]: { open: '09 00', close: '17 00' } // Spaces
                }
            };
            expect(tours.tourHours?.[DayOfWeek.SUNDAY]?.open).toBe('09.00');
            expect(tours.tourHours?.[DayOfWeek.MONDAY]?.open).toBe('09-00');
            expect(tours.tourHours?.[DayOfWeek.TUESDAY]?.open).toBe('09 00');
        });

        it('should accept 12-hour format with AM/PM', () => {
            const contact: ContactInfo = {
                officeHours: {
                    [DayOfWeek.MONDAY]: { open: '9:00 AM', close: '5:00 PM' },
                    [DayOfWeek.TUESDAY]: { open: '9:00AM', close: '5:00PM' }, // No space
                    [DayOfWeek.WEDNESDAY]: { open: '9:00 am', close: '5:00 pm' } // Lowercase
                }
            };
            expect(contact.officeHours?.[DayOfWeek.MONDAY]?.open).toBe('9:00 AM');
            expect(contact.officeHours?.[DayOfWeek.TUESDAY]?.open).toBe('9:00AM');
            expect(contact.officeHours?.[DayOfWeek.WEDNESDAY]?.close).toBe('5:00 pm');
        });

        it('should accept empty or missing time components', () => {
            const tours: TourAvailability = {
                tourHours: {
                    [DayOfWeek.MONDAY]: { open: '', close: '' },
                    [DayOfWeek.TUESDAY]: { open: ':', close: ':' },
                    [DayOfWeek.WEDNESDAY]: { open: '9:', close: ':30' }
                }
            };
            expect(tours.tourHours?.[DayOfWeek.MONDAY]?.open).toBe('');
            expect(tours.tourHours?.[DayOfWeek.TUESDAY]?.open).toBe(':');
            expect(tours.tourHours?.[DayOfWeek.WEDNESDAY]?.close).toBe(':30');
        });
    });

    describe('Tour Hours Edge Cases', () => {
        it('should accept tour hours crossing midnight', () => {
            const tours: TourAvailability = {
                tourHours: {
                    [DayOfWeek.FRIDAY]: { open: '22:00', close: '02:00' }, // 10 PM to 2 AM
                    [DayOfWeek.SATURDAY]: { open: '23:30', close: '00:30' } // 11:30 PM to 12:30 AM
                }
            };
            expect(tours.tourHours?.[DayOfWeek.FRIDAY]?.close).toBe('02:00');
            expect(tours.tourHours?.[DayOfWeek.SATURDAY]?.close).toBe('00:30');
        });

        it('should accept invalid day names as keys', () => {
            const tours: TourAvailability = {
                tourHours: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid day name as key for edge case validation
                    ['INVALID_DAY' as any]: { open: '09:00', close: '17:00' },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing custom string as day name key for edge case validation
                    ['everyday' as any]: { open: '10:00', close: '18:00' },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing empty string as day name key for edge case validation
                    ['' as any]: { open: '11:00', close: '19:00' }
                }
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing invalid day name key for test verification
            expect((tours.tourHours as any)?.INVALID_DAY).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing empty string key for test verification
            expect((tours.tourHours as any)?.['']).toBeDefined();
        });

        it('should accept numeric keys for days', () => {
            const contact: ContactInfo = {
                officeHours: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing numeric zero as day name key for edge case validation
                    [0 as any]: { open: '09:00', close: '17:00' }, // Numeric 0
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing string '1' as day name key for edge case validation
                    ['1' as any]: { open: '10:00', close: '18:00' }, // String '1'
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing out-of-range number as day name key for edge case validation
                    [7 as any]: { open: '11:00', close: '19:00' } // Out of range
                }
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing numeric zero key for test verification
            expect((contact.officeHours as any)?.[0]).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing string '1' key for test verification
            expect((contact.officeHours as any)?.['1']).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing out-of-range number key for test verification
            expect((contact.officeHours as any)?.[7]).toBeDefined();
        });
    });

    describe('Date Parsing Edge Cases', () => {
        it('should accept leap year edge cases', () => {
            const unit1: UnitData = {
                buildingID: 'bldg-1',
                unitID: 'unit-1',
                availableDate: '2024-02-29' // Valid leap year
            };
            expect(unit1.availableDate).toBe('2024-02-29');

            const unit2: UnitData = {
                buildingID: 'bldg-2',
                unitID: 'unit-2',
                availableDate: '2023-02-29' // Invalid - not a leap year
            };
            expect(unit2.availableDate).toBe('2023-02-29');

            const unit3: UnitData = {
                buildingID: 'bldg-3',
                unitID: 'unit-3',
                availableDate: '2100-02-29' // Invalid - 2100 is not a leap year
            };
            expect(unit3.availableDate).toBe('2100-02-29');
        });

        it('should accept DST transition dates', () => {
            const special: RentSpecial = {
                title: 'DST Special',
                startDate: '2024-03-10T02:30:00', // During spring forward (might not exist)
                endDate: '2024-11-03T01:30:00', // During fall back (happens twice)
                description: 'Testing DST transition dates'
            };
            expect(special.startDate).toBe('2024-03-10T02:30:00');
            expect(special.endDate).toBe('2024-11-03T01:30:00');
        });

        it('should accept extreme years', () => {
            const building: BuildingData = {
                buildingID: 'bldg-123',
                yearBuilt: 0
            };
            expect(building.yearBuilt).toBe(0);

            const building2: BuildingData = {
                buildingID: 'bldg-456',
                yearBuilt: 9999
            };
            expect(building2.yearBuilt).toBe(9999);

            const building3: BuildingData = {
                buildingID: 'bldg-789',
                yearBuilt: -1000 // BC dates
            };
            expect(building3.yearBuilt).toBe(-1000);
        });

        it('should accept various date string formats', () => {
            const units: UnitData[] = [
                {
                    buildingID: 'bldg-1',
                    unitID: 'unit-1',
                    availableDate: 'December 31, 2024' // Full month name
                },
                {
                    buildingID: 'bldg-2',
                    unitID: 'unit-2',
                    availableDate: 'Dec 31, 2024' // Abbreviated month
                },
                {
                    buildingID: 'bldg-3',
                    unitID: 'unit-3',
                    availableDate: '31/12/2024' // DD/MM/YYYY
                },
                {
                    buildingID: 'bldg-4',
                    unitID: 'unit-4',
                    availableDate: '12/31/2024' // MM/DD/YYYY
                },
                {
                    buildingID: 'bldg-5',
                    unitID: 'unit-5',
                    availableDate: '2024-W52-7' // ISO week date
                },
                {
                    buildingID: 'bldg-6',
                    unitID: 'unit-6',
                    availableDate: '2024-365' // Ordinal date
                }
            ];

            _.forEach(units, (unit) => {
                expect(unit.availableDate).toBeDefined();
                expect(typeof unit.availableDate).toBe('string');
            });
        });

        it('should accept special date values', () => {
            const unit1: UnitData = {
                buildingID: 'bldg-1',
                unitID: 'unit-1',
                availableDate: 'now'
            };
            expect(unit1.availableDate).toBe('now');

            const unit2: UnitData = {
                buildingID: 'bldg-2',
                unitID: 'unit-2',
                availableDate: 'today'
            };
            expect(unit2.availableDate).toBe('today');

            const unit3: UnitData = {
                buildingID: 'bldg-3',
                unitID: 'unit-3',
                availableDate: 'tomorrow'
            };
            expect(unit3.availableDate).toBe('tomorrow');

            const unit4: UnitData = {
                buildingID: 'bldg-4',
                unitID: 'unit-4',
                availableDate: 'ASAP'
            };
            expect(unit4.availableDate).toBe('ASAP');
        });
    });

    describe('Runtime Validation Documentation for Dates and Times', () => {
        it('should document date/time validations needed at runtime', () => {
            const dateTimeValidations = [
                'ISO 8601 date format validation (YYYY-MM-DD)',
                'Valid month range (01-12)',
                'Valid day range based on month and year',
                'Leap year validation for February 29th',
                '24-hour time format (HH:MM)',
                'Valid hour range (00-23)',
                'Valid minute range (00-59)',
                'Office hours logical consistency (open before close)',
                'Tour hours not crossing into next day unexpectedly',
                'Available date not before building construction year',
                'Rent special date ranges (start <= end)',
                'Timezone offset validation if included',
                'Reject non-standard date formats in API inputs',
                'Validate dates are not too far in past or future',
                'Handle DST transitions appropriately'
            ];

            expect(dateTimeValidations).toHaveLength(15);
            // These validations would prevent the invalid dates accepted by the type system
        });
    });
});

describe('Edge Cases and Boundary Conditions', () => {
    it('should handle zero values appropriately', () => {
        const unit: UnitData = {
            buildingID: 'bldg-123',
            unitID: 'unit-123',
            beds: 0, // Studio
            baths: 0, // Should probably be at least 1, but testing edge case
            sqft: 0, // Invalid but testing
            rent: 0, // Free rent special?
            deposit: 0 // No deposit special
        };
        expect(unit.beds).toBe(0);
        expect(unit.rent).toBe(0);
    });

    it('should handle negative values in numeric fields', () => {
        const building: BuildingData = {
            buildingID: 'bldg-123',
            yearBuilt: -1, // Invalid but testing
            numberStories: -5, // Invalid but testing
            totalUnits: -10 // Invalid but testing
        };
        expect(building.yearBuilt).toBe(-1);
    });

    it('should handle very large numbers', () => {
        const restriction: IncomeRestriction = {
            maxIncomeByHouseholdSize: {
                '1': Number.MAX_SAFE_INTEGER,
                '10': 999999999
            }
        };
        expect(restriction.maxIncomeByHouseholdSize[1]).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle empty strings', () => {
        const building: BuildingData = {
            buildingID: '', // Should probably not be empty but testing
            street: '',
            city: '',
            state: '',
            zip: '',
            description: ''
        };
        expect(building.buildingID).toBe('');
        expect(building.street).toBe('');
    });

    it('should handle null/undefined in optional Record fields', () => {
        const unit: UnitData = {
            buildingID: 'bldg-123',
            unitID: 'unit-123',
            feedInclusion: undefined,
            manualReferences: undefined,
            feedLastPulled: undefined,
            feedLastModified: undefined
        };
        expect(unit.feedInclusion).toBeUndefined();
        expect(unit.manualReferences).toBeUndefined();
        expect(unit.feedLastPulled).toBeUndefined();
        expect(unit.feedLastModified).toBeUndefined();
    });

    it('should handle ISO date strings', () => {
        const unit: UnitData = {
            buildingID: 'bldg-123',
            unitID: 'unit-123',
            availableDate: '2024-12-31T23:59:59.999Z'
        };
        expect(unit.availableDate).toBe('2024-12-31T23:59:59.999Z');
    });

    it('should handle complex nested empty structures', () => {
        const building: BuildingData = {
            buildingID: 'bldg-123',
            rentSpecials: [],
            incomeRestrictions: {
                maxIncomeByHouseholdSize: {}
            },
            utilitiesIncluded: {},
            petPolicies: {
                allowed: true,
                types: [],
                breedRestrictions: []
            },
            contactInfo: {
                officeHours: {}
            },
            tourAvailability: {
                tourHours: {}
            }
        };
        expect(building.incomeRestrictions?.maxIncomeByHouseholdSize).toEqual({});
        expect(building.petPolicies?.types).toEqual([]);
    });

    it('should handle maximum array lengths', () => {
        const manyAmenities: Amenity[] = _(Array(1000)).fill(null).map((_, i) => ({
            name: `Amenity ${i}`,
            category: AmenityCategory.UNIT
        })).value();

        const unitType: UnitTypeData = {
            buildingID: 'bldg-123',
            modelID: 'model-1',
            modelName: 'Test',
            beds: 1,
            baths: 1,
            modelAmenities: manyAmenities
        };

        expect(unitType.modelAmenities).toHaveLength(1000);
    });
});

describe('Business Logic Validation Tests (Type System Acceptance)', () => {
    describe('Rent Range Validation', () => {
        it('should accept minRent > maxRent (runtime validation needed)', () => {
            const unitType: UnitTypeData = {
                buildingID: 'bldg-123',
                modelID: 'model-1',
                modelName: 'Invalid Rent Range',
                beds: 2,
                baths: 2,
                minRent: 2000, // Higher than max
                maxRent: 1500
            };
            expect(unitType.minRent).toBe(2000);
            expect(unitType.maxRent).toBe(1500);
            // Note: Type system allows this, runtime validation would catch it
        });

        it('should accept negative rent values', () => {
            const unitType: UnitTypeData = {
                buildingID: 'bldg-123',
                modelID: 'model-2',
                modelName: 'Negative Rent',
                beds: 1,
                baths: 1,
                minRent: -500,
                maxRent: -100
            };
            expect(unitType.minRent).toBe(-500);
            expect(unitType.maxRent).toBe(-100);
        });
    });

    describe('Square Footage Validation', () => {
        it('should accept minSqft > maxSqft (runtime validation needed)', () => {
            const unitType: UnitTypeData = {
                buildingID: 'bldg-123',
                modelID: 'model-1',
                modelName: 'Invalid Sqft Range',
                beds: 1,
                baths: 1,
                minSqft: 1200, // Larger than max
                maxSqft: 800
            };
            expect(unitType.minSqft).toBe(1200);
            expect(unitType.maxSqft).toBe(800);
        });

        it('should accept zero or negative square footage', () => {
            const unit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-123',
                sqft: -100 // Invalid but type system allows it
            };
            expect(unit.sqft).toBe(-100);
        });
    });

    describe('Lease Term Validation', () => {
        it('should accept minLeaseTerm > maxLeaseTerm (runtime validation needed)', () => {
            const unitType: UnitTypeData = {
                buildingID: 'bldg-123',
                modelID: 'model-1',
                modelName: 'Invalid Lease Terms',
                beds: 2,
                baths: 1,
                minLeaseTerm: 24, // Longer than max
                maxLeaseTerm: 6
            };
            expect(unitType.minLeaseTerm).toBe(24);
            expect(unitType.maxLeaseTerm).toBe(6);
        });

        it('should accept zero or negative lease terms', () => {
            const building: BuildingData = {
                buildingID: 'bldg-123',
                leaseLength: -12 // Invalid but allowed by types
            };
            expect(building.leaseLength).toBe(-12);
        });
    });

    describe('Occupancy Validation', () => {
        it('should accept maxOccupants < beds (runtime validation needed)', () => {
            const unitType: UnitTypeData = {
                buildingID: 'bldg-123',
                modelID: 'model-1',
                modelName: 'Low Occupancy',
                beds: 3,
                baths: 2,
                maxOccupants: 1 // Less than number of beds
            };
            expect(unitType.beds).toBe(3);
            expect(unitType.maxOccupants).toBe(1);
        });

        it('should accept zero or negative occupants', () => {
            const unit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-123',
                maxOccupants: -5
            };
            expect(unit.maxOccupants).toBe(-5);
        });
    });

    describe('Fee Conflicts', () => {
        it('should accept conflicting security deposit fee types', () => {
            const building: BuildingData = {
                buildingID: 'bldg-123',
                oneTimeFees: [
                    {
                        type: FeeType.SECURITY_DEPOSIT,
                        amount: 1000,
                        refundable: true,
                        description: 'Refundable security deposit'
                    },
                    {
                        type: FeeType.SECURITY_DEPOSIT,
                        amount: 500,
                        refundable: false,
                        description: 'Non-refundable security deposit'
                    }
                ]
            };
            expect(building.oneTimeFees).toHaveLength(2);
            expect(building.oneTimeFees![0].refundable).toBe(true);
            expect(building.oneTimeFees![1].refundable).toBe(false);
            // Note: Having both refundable and non-refundable security deposits is illogical
        });

        it('should accept duplicate fee types with different amounts', () => {
            const building: BuildingData = {
                buildingID: 'bldg-123',
                monthlyFees: [
                    { type: FeeType.PARKING, amount: 100 },
                    { type: FeeType.PARKING, amount: 150 },
                    { type: FeeType.PARKING, amount: 200 }
                ]
            };
            expect(building.monthlyFees).toHaveLength(3);
        });
    });

    describe('Date Range Validation', () => {
        it('should accept startDate > endDate in RentSpecial', () => {
            const special: RentSpecial = {
                title: 'Backwards Special',
                startDate: '2024-12-31',
                endDate: '2024-01-01', // Earlier than start
                description: 'Invalid date range'
            };
            expect(special.startDate).toBe('2024-12-31');
            expect(special.endDate).toBe('2024-01-01');
        });

        it('should accept invalid date formats', () => {
            const special: RentSpecial = {
                title: 'Bad Dates',
                startDate: 'not-a-date',
                endDate: '2024-13-45', // Invalid month and day
                description: 'Invalid dates'
            };
            expect(special.startDate).toBe('not-a-date');
            expect(special.endDate).toBe('2024-13-45');
        });

        it('should accept unit available date before building was built', () => {
            const building: BuildingData = {
                buildingID: 'bldg-123',
                yearBuilt: 2020
            };
            const unit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-123',
                availableDate: '2010-01-01' // Before building existed
            };
            expect(building.yearBuilt).toBe(2020);
            expect(unit.availableDate).toBe('2010-01-01');
        });
    });

    describe('Office Hours Validation', () => {
        it('should accept invalid time formats', () => {
            const contact: ContactInfo = {
                officeHours: {
                    [DayOfWeek.MONDAY]: { open: '25:00', close: '12:70' }, // Invalid hours
                    [DayOfWeek.TUESDAY]: { open: 'not-a-time', close: '17:00' },
                    [DayOfWeek.WEDNESDAY]: { open: '12:00 PM', close: '5:00 PM' } // Wrong format
                }
            };
            expect(contact.officeHours?.[DayOfWeek.MONDAY]?.open).toBe('25:00');
            expect(contact.officeHours?.[DayOfWeek.MONDAY]?.close).toBe('12:70');
        });

        it('should accept office hours crossing midnight', () => {
            const contact: ContactInfo = {
                officeHours: {
                    [DayOfWeek.FRIDAY]: { open: '22:00', close: '02:00' } // Closes after midnight
                }
            };
            expect(contact.officeHours?.[DayOfWeek.FRIDAY]?.open).toBe('22:00');
            expect(contact.officeHours?.[DayOfWeek.FRIDAY]?.close).toBe('02:00');
            // Note: This might be valid for 24-hour properties, but needs business logic
        });

        it('should accept close time before open time', () => {
            const tours: TourAvailability = {
                tourHours: {
                    [DayOfWeek.SATURDAY]: { open: '14:00', close: '09:00' } // Closes before opening
                }
            };
            expect(tours.tourHours?.[DayOfWeek.SATURDAY]?.close).toBe('09:00');
        });
    });

    describe('Percentage and Ratio Limits', () => {
        it('should accept AMI limits outside 0-100 range', () => {
            const restriction: IncomeRestriction = {
                amiLimit: -50, // Negative percentage
                maxIncomeByHouseholdSize: { '1': 40000 }
            };
            expect(restriction.amiLimit).toBe(-50);

            const restriction2: IncomeRestriction = {
                amiLimit: 250, // Over 100%
                maxIncomeByHouseholdSize: { '1': 100000 }
            };
            expect(restriction2.amiLimit).toBe(250);
        });

        it('should accept invalid income ratios', () => {
            const screening: ScreeningCriteria = {
                incomeRatio: 0, // No income required?
                minCreditScore: 700
            };
            expect(screening.incomeRatio).toBe(0);

            const screening2: ScreeningCriteria = {
                incomeRatio: -2.5, // Negative ratio
                minCreditScore: 600
            };
            expect(screening2.incomeRatio).toBe(-2.5);

            const screening3: ScreeningCriteria = {
                incomeRatio: 100, // 100x rent required
                minCreditScore: 850
            };
            expect(screening3.incomeRatio).toBe(100);
        });
    });

    describe('Weight Limits', () => {
        it('should accept negative and extreme pet weight limits', () => {
            const policy: PetPolicy = {
                allowed: true,
                types: [PetType.DOG],
                weightLimit: -25 // Negative weight
            };
            expect(policy.weightLimit).toBe(-25);

            const policy2: PetPolicy = {
                allowed: true,
                types: [PetType.DOG],
                weightLimit: 10000 // 10,000 lbs
            };
            expect(policy2.weightLimit).toBe(10000);
        });
    });

    describe('Storage Dimension Format Validation', () => {
        it('should accept invalid storage dimension formats', () => {
            const storage: StorageOption = {
                type: StorageType.EXTERNAL_UNIT,
                dimensions: '5x', // Missing second dimension
                included: false
            };
            expect(storage.dimensions).toBe('5x');

            const storage2: StorageOption = {
                type: StorageType.EXTERNAL_UNIT,
                dimensions: 'x10', // Missing first dimension
                included: false
            };
            expect(storage2.dimensions).toBe('x10');

            const storage3: StorageOption = {
                type: StorageType.EXTERNAL_UNIT,
                dimensions: 'large', // Not a dimension format
                included: false
            };
            expect(storage3.dimensions).toBe('large');

            const storage4: StorageOption = {
                type: StorageType.EXTERNAL_UNIT,
                dimensions: '5.5x10.5x8', // Three dimensions (might be valid for height)
                included: false
            };
            expect(storage4.dimensions).toBe('5.5x10.5x8');
        });
    });

    describe('Pet Policy Conflicts', () => {
        it('should accept pets not allowed but types populated', () => {
            const policy: PetPolicy = {
                allowed: false,
                types: [PetType.DOG, PetType.CAT], // Shouldn't have types if not allowed
                maxCount: 2,
                weightLimit: 50,
                deposit: 500,
                monthlyFee: 50
            };
            expect(policy.allowed).toBe(false);
            expect(policy.types).toHaveLength(2);
            expect(policy.deposit).toBe(500);
        });

        it('should accept NO_PETS in allowed pet types', () => {
            const policy: PetPolicy = {
                allowed: true,
                types: [PetType.DOG, PetType.NO_PETS] // Contradictory
            };
            expect(policy.allowed).toBe(true);
            expect(policy.types).toContain(PetType.NO_PETS);
        });
    });

    describe('Price Consistency', () => {
        it('should accept deposit greater than annual rent', () => {
            const unit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-123',
                rent: 1000, // $1000/month = $12,000/year
                deposit: 50000 // $50,000 deposit
            };
            expect(unit.rent).toBe(1000);
            expect(unit.deposit).toBe(50000);
        });

        it('should accept per-person rent exceeding total rent', () => {
            const unit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-123',
                rent: 1000,
                perPersonRent: 800, // $800 per person could exceed total
                maxOccupants: 4 // $3200 if fully occupied
            };
            expect(unit.rent).toBe(1000);
            expect(unit.perPersonRent).toBe(800);
        });
    });

    describe('Compound Validation Scenarios', () => {
        it('should accept multiple conflicting business rules simultaneously', () => {
            const building: BuildingData = {
                buildingID: 'bldg-123',
                yearBuilt: 2025, // Future year
                totalUnits: 10,
                propertyType: PropertyType.APARTMENT,
                leaseLength: 0, // No lease?
                petPolicies: {
                    allowed: false,
                    types: [PetType.DOG, PetType.CAT],
                    deposit: 1000, // Deposit for pets that aren't allowed
                    weightLimit: -10 // Negative weight
                },
                screeningCriteria: {
                    incomeRatio: 0.5, // Less than 1x rent
                    minCreditScore: 1000, // Above max possible score
                    maxOccupantsPerBedroom: 0 // No occupants allowed?
                },
                applicationFee: -50 // They pay you to apply?
            };

            const unitType: UnitTypeData = {
                buildingID: 'bldg-123',
                modelID: 'model-chaos',
                modelName: 'Chaos Model',
                beds: 2,
                baths: 3, // More baths than beds
                maxOccupants: 1, // Less than beds
                minRent: 5000,
                maxRent: 1000, // Max less than min
                minSqft: 2000,
                maxSqft: 500, // Max less than min
                deposit: -1000, // Negative deposit
                minLeaseTerm: 36,
                maxLeaseTerm: 1 // Max less than min
            };

            // All these invalid values are accepted by the type system
            expect(building.yearBuilt).toBe(2025);
            expect(building.petPolicies!.allowed).toBe(false);
            expect(building.petPolicies!.deposit).toBe(1000);
            expect(unitType.minRent).toBe(5000);
            expect(unitType.maxRent).toBe(1000);
        });

        it('should document runtime validations needed for data integrity', () => {
            // This test documents all the runtime validations that would be needed:
            const validationRules = [
                'minRent must be <= maxRent',
                'minSqft must be <= maxSqft',
                'minLeaseTerm must be <= maxLeaseTerm',
                'maxOccupants should typically be >= beds',
                'Only one security deposit type (refundable OR non-refundable)',
                'startDate must be <= endDate for rent specials',
                'Office hours must be valid 24-hour format (HH:MM)',
                'AMI limit should be between 0 and 100',
                'Income ratio should be positive (typically 2-4)',
                'Pet weight limits should be positive',
                'Storage dimensions should match format like "5x10"',
                'If pets not allowed, pet-related fields should be empty',
                'Deposit should be reasonable relative to rent',
                'Available dates should be after building construction',
                'Credit scores should be in valid range (300-850)',
                'Year built should not be in the future',
                'Number of units, stories, etc. should be positive'
            ];

            expect(validationRules).toHaveLength(17);
            // These would all need to be implemented in runtime validation logic
        });
    });
});
