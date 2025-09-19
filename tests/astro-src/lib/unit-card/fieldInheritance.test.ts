import { describe, it, expect, beforeEach } from 'bun:test';
import { FieldInheritanceManager } from '../../../../astro-src/lib/unit-card/fieldInheritance';
import type { UnitData, UnitTypeData } from '../../../../src/types';

describe('FieldInheritanceManager', () => {
    let manager: FieldInheritanceManager;
    let mockUnit: UnitData;
    let mockUnitType: UnitTypeData;

    beforeEach(() => {
        manager = new FieldInheritanceManager();

        mockUnit = {
            buildingID: 'test-building',
            unitID: 'test-unit',
            unitNumber: '101',
            modelID: 'test-model',
            beds: undefined,
            baths: undefined,
            sqft: undefined,
            rent: undefined,
            occupied: false,
            availableDate: '2025-02-01',
            feedInclusion: {
                apartments_com: true,
                zillow: true
            }
        };

        mockUnitType = {
            buildingID: 'test-building',
            modelID: 'test-model',
            modelName: 'Test Model',
            beds: 2,
            baths: 1.5,
            minRent: 1500,
            maxRent: 1800,
            minSqft: 800,
            maxSqft: 900,
            deposit: 1500,
            minLeaseTerm: 12,
            maxLeaseTerm: 24,
            maxOccupants: 4,
            perPersonRent: 750,
            countAvailable: 5
        };
    });

    describe('isInherited', () => {
        it('should return true when unit field is null and unit type has value', () => {
            mockUnit.beds = null as unknown as number;
            mockUnitType.beds = 2;

            expect(manager.isInherited(mockUnit, mockUnitType, 'beds')).toBe(true);
        });

        it('should return true when unit field is undefined and unit type has value', () => {
            mockUnit.beds = undefined as unknown as number;
            mockUnitType.beds = 2;

            expect(manager.isInherited(mockUnit, mockUnitType, 'beds')).toBe(true);
        });

        it('should return true when unit field is empty string and unit type has value', () => {
            mockUnit.beds = '' as unknown as number;
            mockUnitType.beds = 2;

            expect(manager.isInherited(mockUnit, mockUnitType, 'beds')).toBe(true);
        });

        it('should return false when unit has explicit value', () => {
            mockUnit.beds = 1;
            mockUnitType.beds = 2;

            expect(manager.isInherited(mockUnit, mockUnitType, 'beds')).toBe(false);
        });

        it('should return false when unit type is null', () => {
            mockUnit.beds = null as unknown as number;

            expect(manager.isInherited(mockUnit, null, 'beds')).toBe(false);
        });

        it('should return false when unit type does not have the field', () => {
            mockUnit.beds = null as unknown as number;
            mockUnitType.beds = undefined as unknown as number;

            expect(manager.isInherited(mockUnit, mockUnitType, 'beds')).toBe(false);
        });

        describe('range fields (sqft, rent)', () => {
            it('should return true for sqft when unit is empty and unit type has min/max values', () => {
                mockUnit.sqft = null as unknown as number;
                mockUnitType.minSqft = 800;
                mockUnitType.maxSqft = 900;

                expect(manager.isInherited(mockUnit, mockUnitType, 'sqft')).toBe(true);
            });

            it('should return true for rent when unit is empty and unit type has min/max values', () => {
                mockUnit.rent = null as unknown as number;
                mockUnitType.minRent = 1500;
                mockUnitType.maxRent = 1800;

                expect(manager.isInherited(mockUnit, mockUnitType, 'rent')).toBe(true);
            });

            it('should return true when only minSqft is set', () => {
                mockUnit.sqft = null as unknown as number;
                mockUnitType.minSqft = 800;
                mockUnitType.maxSqft = undefined as unknown as number;

                expect(manager.isInherited(mockUnit, mockUnitType, 'sqft')).toBe(true);
            });

            it('should return false when unit type has no range values', () => {
                mockUnit.sqft = null as unknown as number;
                mockUnitType.minSqft = undefined as unknown as number;
                mockUnitType.maxSqft = undefined as unknown as number;

                expect(manager.isInherited(mockUnit, mockUnitType, 'sqft')).toBe(false);
            });
        });
    });

    describe('getInheritedValue', () => {
        it('should return unit type value for simple fields', () => {
            expect(manager.getInheritedValue(mockUnitType, 'beds')).toBe(2);
            expect(manager.getInheritedValue(mockUnitType, 'baths')).toBe(1.5);
            expect(manager.getInheritedValue(mockUnitType, 'deposit')).toBe(1500);
        });

        it('should return undefined when unit type is null', () => {
            expect(manager.getInheritedValue(null, 'beds')).toBeUndefined();
        });

        it('should return null when unit type does not have the field', () => {
            mockUnitType.beds = undefined as unknown as number;
            expect(manager.getInheritedValue(mockUnitType, 'beds')).toBe(null);
        });

        describe('range fields', () => {
            it('should return single value when min equals max', () => {
                mockUnitType.minRent = 1500;
                mockUnitType.maxRent = 1500;

                expect(manager.getInheritedValue(mockUnitType, 'rent')).toBe(1500);
            });

            it('should return range string when min differs from max', () => {
                mockUnitType.minRent = 1500;
                mockUnitType.maxRent = 1800;

                expect(manager.getInheritedValue(mockUnitType, 'rent')).toBe('1500 - 1800');
            });

            it('should return single value when only min is set', () => {
                mockUnitType.minSqft = 800;
                mockUnitType.maxSqft = undefined as unknown as number;

                expect(manager.getInheritedValue(mockUnitType, 'sqft')).toBe(800);
            });

            it('should return single value when only max is set', () => {
                mockUnitType.minSqft = undefined as unknown as number;
                mockUnitType.maxSqft = 900;

                expect(manager.getInheritedValue(mockUnitType, 'sqft')).toBe(900);
            });

            it('should return null when neither min nor max are set', () => {
                mockUnitType.minSqft = undefined as unknown as number;
                mockUnitType.maxSqft = undefined as unknown as number;

                expect(manager.getInheritedValue(mockUnitType, 'sqft')).toBe(null);
            });
        });

        describe('complex fields', () => {
            it('should handle lease terms', () => {
                expect(manager.getInheritedValue(mockUnitType, 'minLeaseTerm')).toBe(12);
                expect(manager.getInheritedValue(mockUnitType, 'maxLeaseTerm')).toBe(24);
            });

            it('should handle occupancy fields', () => {
                expect(manager.getInheritedValue(mockUnitType, 'maxOccupants')).toBe(4);
                expect(manager.getInheritedValue(mockUnitType, 'perPersonRent')).toBe(750);
            });
        });
    });

    describe('getEffectiveValue', () => {
        it('should return unit value when unit has explicit value', () => {
            mockUnit.beds = 3;
            mockUnitType.beds = 2;

            expect(manager.getEffectiveValue(mockUnit, mockUnitType, 'beds')).toBe(3);
        });

        it('should return inherited value when unit field is empty', () => {
            mockUnit.beds = null as unknown as number;
            mockUnitType.beds = 2;

            expect(manager.getEffectiveValue(mockUnit, mockUnitType, 'beds')).toBe(2);
        });

        it('should return inherited minimum rent when unit field is empty', () => {
            mockUnit.rent = null as unknown as number;
            mockUnitType.minRent = 1500;
            mockUnitType.maxRent = 1800;

            expect(manager.getEffectiveValue(mockUnit, mockUnitType, 'rent')).toBe(1500);
        });

        it('should return null when unit is empty and no inheritance available', () => {
            mockUnit.beds = null as unknown as number;
            mockUnitType.beds = undefined as unknown as number;

            expect(manager.getEffectiveValue(mockUnit, mockUnitType, 'beds')).toBe(null);
        });

        it('should return undefined when unit type is null', () => {
            mockUnit.beds = null as unknown as number;

            expect(manager.getEffectiveValue(mockUnit, null, 'beds')).toBeUndefined();
        });
    });

    describe('resetFieldToInherited', () => {
        it('should reset simple fields to undefined', () => {
            mockUnit.beds = 3;
            manager.resetFieldToInherited(mockUnit, 'beds');

            expect((mockUnit as unknown as Record<string, unknown>).beds).toBe(undefined);
        });

        it('should reset deposit field to undefined', () => {
            mockUnit.deposit = 2000;
            manager.resetFieldToInherited(mockUnit, 'deposit');

            expect((mockUnit as unknown as Record<string, unknown>).deposit).toBe(undefined);
        });

        it('should reset other fields correctly', () => {
            mockUnit.rent = 2000;
            mockUnit.sqft = 1000;
            mockUnit.baths = 2;

            manager.resetFieldToInherited(mockUnit, 'rent');
            manager.resetFieldToInherited(mockUnit, 'sqft');
            manager.resetFieldToInherited(mockUnit, 'baths');

            expect((mockUnit as unknown as Record<string, unknown>).rent).toBe(undefined);
            expect((mockUnit as unknown as Record<string, unknown>).sqft).toBe(undefined);
            expect((mockUnit as unknown as Record<string, unknown>).baths).toBe(undefined);
        });
    });

    describe('deposit helper methods', () => {
        it('should extract numeric deposit value from number', () => {
            expect(manager.getDepositValue(1500)).toBe(1500);
        });

        it('should extract deposit amount from deposit object', () => {
            const deposit = { amount: 1500, refundable: true };
            expect(manager.getDepositValue(deposit)).toBe(1500);
        });

        it('should return null for null deposit', () => {
            expect(manager.getDepositValue(null)).toBe(null);
        });

        it('should return null when deposit object has no amount', () => {
            const deposit = { amount: null, refundable: true };
            expect(manager.getDepositValue(deposit)).toBe(null);
        });

        it('should determine refundability for numeric deposit (defaults to true)', () => {
            expect(manager.isDepositRefundable(1500)).toBe(true);
        });

        it('should determine refundability for deposit object', () => {
            const refundableDeposit = { amount: 1500, refundable: true };
            const nonRefundableDeposit = { amount: 1500, refundable: false };

            expect(manager.isDepositRefundable(refundableDeposit)).toBe(true);
            expect(manager.isDepositRefundable(nonRefundableDeposit)).toBe(false);
        });

        it('should get partial refund percentage from deposit object', () => {
            const depositWithPartial = { amount: 1500, refundable: true, partialRefundPercentage: 50 };
            const depositWithoutPartial = { amount: 1500, refundable: true };

            expect(manager.getDepositPartialRefundPercentage(depositWithPartial)).toBe(50);
            expect(manager.getDepositPartialRefundPercentage(depositWithoutPartial)).toBe(null);
            expect(manager.getDepositPartialRefundPercentage(1500)).toBe(null);
        });
    });

    describe('edge cases', () => {
        it('should handle zero values correctly (not treated as empty)', () => {
            mockUnit.beds = 0;
            mockUnitType.beds = 2;

            expect(manager.isInherited(mockUnit, mockUnitType, 'beds')).toBe(false);
            expect(manager.getEffectiveValue(mockUnit, mockUnitType, 'beds')).toBe(0);
        });

        it('should handle negative values correctly (not treated as empty)', () => {
            mockUnit.rent = -100;
            mockUnitType.minRent = 1500;

            expect(manager.isInherited(mockUnit, mockUnitType, 'rent')).toBe(false);
            expect(manager.getEffectiveValue(mockUnit, mockUnitType, 'rent')).toBe(-100);
        });

        it('should handle decimal values', () => {
            mockUnit.baths = 1.5;
            mockUnitType.baths = 2;

            expect(manager.isInherited(mockUnit, mockUnitType, 'baths')).toBe(false);
            expect(manager.getEffectiveValue(mockUnit, mockUnitType, 'baths')).toBe(1.5);
        });

        it('should handle unknown field names gracefully', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing error handling for invalid field names
            expect(manager.getInheritedValue(mockUnitType, 'unknownField' as any)).toBe(null);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing error handling for invalid field names
            expect(manager.isInherited(mockUnit, mockUnitType, 'unknownField' as any)).toBe(false);
        });
    });

    describe('inheritance scenarios', () => {
        it('should handle studio apartment (0 bedrooms) inheritance', () => {
            mockUnit.beds = null as unknown as number;
            mockUnitType.beds = 0;

            expect(manager.isInherited(mockUnit, mockUnitType, 'beds')).toBe(true);
            expect(manager.getInheritedValue(mockUnitType, 'beds')).toBe(0);
            expect(manager.getEffectiveValue(mockUnit, mockUnitType, 'beds')).toBe(0);
        });

        it('should handle partial unit type data', () => {
            const partialUnitType = {
                ...mockUnitType,
                beds: undefined as unknown as number,
                maxSqft: undefined as unknown as number,
                maxRent: undefined as unknown as number
            };

            mockUnit.beds = null as unknown as number;
            mockUnit.sqft = null as unknown as number;
            mockUnit.rent = null as unknown as number;

            expect(manager.isInherited(mockUnit, partialUnitType, 'beds')).toBe(false);
            expect(manager.isInherited(mockUnit, partialUnitType, 'sqft')).toBe(true);
            expect(manager.isInherited(mockUnit, partialUnitType, 'rent')).toBe(true);
        });

        it('should handle mixed explicit and inherited values', () => {
            mockUnit.beds = 3;        // Explicit override
            mockUnit.baths = null as unknown as number;    // Should inherit
            mockUnit.sqft = 1200;     // Explicit override
            mockUnit.rent = null as unknown as number;     // Should inherit

            expect(manager.isInherited(mockUnit, mockUnitType, 'beds')).toBe(false);
            expect(manager.isInherited(mockUnit, mockUnitType, 'baths')).toBe(true);
            expect(manager.isInherited(mockUnit, mockUnitType, 'sqft')).toBe(false);
            expect(manager.isInherited(mockUnit, mockUnitType, 'rent')).toBe(true);

            expect(manager.getEffectiveValue(mockUnit, mockUnitType, 'beds')).toBe(3);
            expect(manager.getEffectiveValue(mockUnit, mockUnitType, 'baths')).toBe(1.5);
            expect(manager.getEffectiveValue(mockUnit, mockUnitType, 'sqft')).toBe(1200);
            expect(manager.getEffectiveValue(mockUnit, mockUnitType, 'rent')).toBe(1500);
        });
    });
});
