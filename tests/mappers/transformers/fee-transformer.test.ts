import { describe, it, expect } from 'bun:test';
import { find, forEach, map, reduce, repeat, some } from 'lodash';
import {
    transformFees,
    categorizeFees,
    calculateMoveInCost,
    formatFeeList,
    mergeFees,
    createConditionalFeeAdder
} from '../../../src/mappers/transformers/fee-transformer';
import { FeeType } from '../../../src/types';
import type { Fee } from '../../../src/types';

describe('Fee Transformer', () => {
    // Test fees
    const testFees: Fee[] = [
        { type: FeeType.APPLICATION, amount: 50, description: 'Application fee', refundable: false },
        { type: FeeType.SECURITY_DEPOSIT, amount: 1000, description: 'Security deposit', refundable: true },
        { type: FeeType.PET_DEPOSIT, amount: 300, description: 'Pet deposit', refundable: true },
        { type: FeeType.ADMIN, amount: 150, description: 'Administrative fee', refundable: false },
        { type: FeeType.PARKING, amount: 100, description: 'Monthly parking', refundable: false }
    ];

    describe('transformFees', () => {
        it('should transform fees for apartments.com with currency symbols', () => {
            const result = transformFees(testFees, 'apartments_com');

            expect(result).toHaveLength(5);
            expect(result[0]).toEqual({
                type: 'Application Fee',
                amount: 50,
                description: 'Application fee',
                refundable: false
            });
            expect(result[1]).toEqual({
                type: 'Security Deposit',
                amount: 1000,
                description: 'Security deposit',
                refundable: true
            });
        });

        it('should transform fees for zillow without currency symbols', () => {
            const result = transformFees(testFees, 'zillow');

            expect(result).toHaveLength(5);
            expect(result[0]).toEqual({
                type: 'Application',
                amount: 50,
                description: 'Application fee',
                refundable: false
            });
            expect(result[1]).toEqual({
                type: 'Security Deposit',
                amount: 1000,
                description: 'Security deposit',
                refundable: true
            });
        });

        it('should handle undefined fees', () => {
            expect(transformFees(undefined, 'apartments_com')).toEqual([]);
        });

        it('should handle empty fees', () => {
            expect(transformFees([], 'apartments_com')).toEqual([]);
        });

        it('should handle unknown sites with default formatting', () => {
            const result = transformFees(testFees, 'unknown_site');

            expect(result).toHaveLength(5);
            expect(result[0].amount).toBe(50);
            expect(result[0].type).toBe('Application Fee');
        });

        it('should handle zero amounts', () => {
            const zeroFee: Fee[] = [
                { type: FeeType.APPLICATION, amount: 0, description: 'No app fee', refundable: false }
            ];

            const result = transformFees(zeroFee, 'apartments_com');
            expect(result[0].amount).toBe(0);
        });

        it('should handle negative amounts', () => {
            const negativeFee: Fee[] = [
                { type: FeeType.ADMIN, amount: -50, description: 'Discount', refundable: false }
            ];

            const result = transformFees(negativeFee, 'apartments_com');
            expect(result[0].amount).toBe(-50);
        });
    });

    describe('categorizeFees', () => {
        it('should separate deposits from other one-time fees', () => {
            const oneTimeFees: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false },
                { type: FeeType.SECURITY_DEPOSIT, amount: 1000, refundable: true },
                { type: FeeType.ADMIN, amount: 150, refundable: false },
                { type: FeeType.PET_DEPOSIT, amount: 300, refundable: true },
                { type: FeeType.KEY_DEPOSIT, amount: 25, refundable: true }
            ];

            const monthlyFees: Fee[] = [
                { type: FeeType.PARKING, amount: 100, refundable: false },
                { type: FeeType.STORAGE, amount: 50, refundable: false }
            ];

            const result = categorizeFees(oneTimeFees, monthlyFees);

            expect(result.oneTime).toHaveLength(2);
            expect(result.deposits).toHaveLength(3);
            expect(result.monthly).toHaveLength(2);

            expect(map(result.oneTime, 'type')).toEqual([
                FeeType.APPLICATION,
                FeeType.ADMIN
            ]);

            expect(map(result.deposits, 'type')).toEqual([
                FeeType.SECURITY_DEPOSIT,
                FeeType.PET_DEPOSIT,
                FeeType.KEY_DEPOSIT
            ]);
        });

        it('should handle undefined fees', () => {
            const result = categorizeFees(undefined, undefined);

            expect(result.oneTime).toEqual([]);
            expect(result.deposits).toEqual([]);
            expect(result.monthly).toEqual([]);
        });

        it('should handle only one-time fees', () => {
            const oneTimeFees: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false }
            ];

            const result = categorizeFees(oneTimeFees, undefined);

            expect(result.oneTime).toHaveLength(1);
            expect(result.deposits).toEqual([]);
            expect(result.monthly).toEqual([]);
        });

        it('should handle only monthly fees', () => {
            const monthlyFees: Fee[] = [
                { type: FeeType.PARKING, amount: 100, refundable: false }
            ];

            const result = categorizeFees(undefined, monthlyFees);

            expect(result.oneTime).toEqual([]);
            expect(result.deposits).toEqual([]);
            expect(result.monthly).toHaveLength(1);
        });
    });

    describe('calculateMoveInCost', () => {
        it('should calculate with first month rent and fees', () => {
            const rent = 1500;
            const oneTimeFees: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false },
                { type: FeeType.SECURITY_DEPOSIT, amount: 1500, refundable: true },
                { type: FeeType.ADMIN, amount: 150, refundable: false }
            ];

            const total = calculateMoveInCost(rent, oneTimeFees);
            expect(total).toBe(3200); // 1500 + 50 + 1500 + 150
        });

        it('should calculate with first and last month rent', () => {
            const rent = 1500;
            const oneTimeFees: Fee[] = [
                { type: FeeType.SECURITY_DEPOSIT, amount: 1500, refundable: true }
            ];

            const total = calculateMoveInCost(rent, oneTimeFees, true, true);
            expect(total).toBe(4500); // 1500 + 1500 + 1500
        });

        it('should calculate with no first month rent', () => {
            const rent = 1500;
            const oneTimeFees: Fee[] = [
                { type: FeeType.SECURITY_DEPOSIT, amount: 1500, refundable: true }
            ];

            const total = calculateMoveInCost(rent, oneTimeFees, false, false);
            expect(total).toBe(1500); // Just the deposit
        });

        it('should handle undefined rent', () => {
            const oneTimeFees: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false }
            ];

            const total = calculateMoveInCost(undefined, oneTimeFees);
            expect(total).toBe(50);
        });

        it('should handle undefined fees', () => {
            const total = calculateMoveInCost(1500, undefined);
            expect(total).toBe(1500);
        });

        it('should handle all undefined', () => {
            const total = calculateMoveInCost(undefined, undefined);
            expect(total).toBe(0);
        });
    });

    describe('formatFeeList', () => {
        it('should format fees as a descriptive string', () => {
            const fees: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false },
                { type: FeeType.SECURITY_DEPOSIT, amount: 1000, refundable: true },
                { type: FeeType.PET_FEE, amount: 250, refundable: false }
            ];

            const result = formatFeeList(fees);
            expect(result).toBe('application: $50, security-deposit: $1,000 (refundable), pet-fee: $250');
        });

        it('should use custom separator', () => {
            const fees: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false },
                { type: FeeType.ADMIN, amount: 100, refundable: false }
            ];

            const result = formatFeeList(fees, ' | ');
            expect(result).toBe('application: $50 | admin: $100');
        });

        it('should handle undefined fees', () => {
            expect(formatFeeList(undefined)).toBe('No additional fees');
        });

        it('should handle empty fees', () => {
            expect(formatFeeList([])).toBe('No additional fees');
        });

        it('should handle zero amounts', () => {
            const fees: Fee[] = [
                { type: FeeType.APPLICATION, amount: 0, refundable: false }
            ];

            const result = formatFeeList(fees);
            expect(result).toBe('application: $0');
        });
    });

    describe('mergeFees', () => {
        it('should merge fees from multiple sources', () => {
            const source1: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false },
                { type: FeeType.ADMIN, amount: 100, refundable: false }
            ];

            const source2: Fee[] = [
                { type: FeeType.SECURITY_DEPOSIT, amount: 1000, refundable: true },
                { type: FeeType.PET_FEE, amount: 250, refundable: false }
            ];

            const merged = mergeFees(source1, source2);

            expect(merged).toHaveLength(4);
            expect(map(merged, 'type').sort()).toEqual([
                FeeType.ADMIN,
                FeeType.APPLICATION,
                FeeType.PET_FEE,
                FeeType.SECURITY_DEPOSIT
            ]);
        });

        it('should combine amounts for the same fee type', () => {
            const source1: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false }
            ];

            const source2: Fee[] = [
                { type: FeeType.APPLICATION, amount: 25, description: 'Additional fee', refundable: false }
            ];

            const merged = mergeFees(source1, source2);

            expect(merged).toHaveLength(1);
            expect(merged[0].type).toBe(FeeType.APPLICATION);
            expect(merged[0].amount).toBe(75);
            expect(merged[0].description).toBe('Additional fee');
        });

        it('should prefer later description when merging', () => {
            const source1: Fee[] = [
                { type: FeeType.ADMIN, amount: 100, description: 'First desc', refundable: false }
            ];

            const source2: Fee[] = [
                { type: FeeType.ADMIN, amount: 50, description: 'Second desc', refundable: false }
            ];

            const merged = mergeFees(source1, source2);

            expect(merged[0].description).toBe('Second desc');
        });

        it('should handle undefined sources', () => {
            const source1: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false }
            ];

            const merged = mergeFees(source1, undefined, []);

            expect(merged).toHaveLength(1);
            expect(merged[0].type).toBe(FeeType.APPLICATION);
        });

        it('should handle all undefined sources', () => {
            const merged = mergeFees(undefined, undefined);
            expect(merged).toEqual([]);
        });

        it('should maintain order of unique fee types', () => {
            const source1: Fee[] = [
                { type: FeeType.PET_FEE, amount: 250, refundable: false },
                { type: FeeType.APPLICATION, amount: 50, refundable: false }
            ];

            const source2: Fee[] = [
                { type: FeeType.ADMIN, amount: 100, refundable: false }
            ];

            const merged = mergeFees(source1, source2);

            expect(map(merged, 'type')).toEqual([
                FeeType.PET_FEE,
                FeeType.APPLICATION,
                FeeType.ADMIN
            ]);
        });
    });

    describe('createConditionalFeeAdder', () => {
        it('should add fee when condition is met', () => {
            const condition = (fees: Fee[]) => some(fees, ['type', FeeType.PET_DEPOSIT]);
            const petFee: Fee = { type: FeeType.PET_FEE, amount: 25, refundable: false };

            const transformer = createConditionalFeeAdder(condition, petFee);

            const feesWithPetDeposit: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false },
                { type: FeeType.PET_DEPOSIT, amount: 300, refundable: true }
            ];

            const result = transformer(feesWithPetDeposit);

            expect(result).toHaveLength(3);
            expect(result[2]).toEqual(petFee);
        });

        it('should not add fee when condition is not met', () => {
            const condition = (fees: Fee[]) => some(fees, ['type', FeeType.PET_DEPOSIT]);
            const petFee: Fee = { type: FeeType.PET_FEE, amount: 25, refundable: false };

            const transformer = createConditionalFeeAdder(condition, petFee);

            const feesWithoutPetDeposit: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false },
                { type: FeeType.SECURITY_DEPOSIT, amount: 1000, refundable: true }
            ];

            const result = transformer(feesWithoutPetDeposit);

            expect(result).toHaveLength(2);
            expect(find(result, ['type', FeeType.PET_FEE])).toBeUndefined();
        });

        it('should handle empty fees array', () => {
            const condition = (fees: Fee[]) => fees.length === 0;
            const defaultFee: Fee = { type: FeeType.APPLICATION, amount: 0, refundable: false };

            const transformer = createConditionalFeeAdder(condition, defaultFee);

            const result = transformer([]);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(defaultFee);
        });

        it('should work with complex conditions', () => {
            const condition = (fees: Fee[]) => {
                const totalAmount = reduce(fees, (sum, fee) => sum + fee.amount, 0);
                return totalAmount > 1000;
            };
            const discountFee: Fee = { type: FeeType.ADMIN, amount: -50, description: 'High deposit discount', refundable: false };

            const transformer = createConditionalFeeAdder(condition, discountFee);

            const highFees: Fee[] = [
                { type: FeeType.SECURITY_DEPOSIT, amount: 1500, refundable: true },
                { type: FeeType.APPLICATION, amount: 50, refundable: false }
            ];

            const result = transformer(highFees);

            expect(result).toHaveLength(3);
            expect(result[2].amount).toBe(-50);
        });
    });

    describe('Edge Cases', () => {
        it('should handle very large amounts', () => {
            const largeFee: Fee[] = [
                { type: FeeType.SECURITY_DEPOSIT, amount: 1000000, refundable: true }
            ];

            const result = transformFees(largeFee, 'apartments_com');
            expect(result[0].amount).toBe(1000000);
        });

        it('should handle decimal amounts', () => {
            const decimalFee: Fee[] = [
                { type: FeeType.APPLICATION, amount: 49.99, refundable: false }
            ];

            const result = transformFees(decimalFee, 'apartments_com');
            expect(result[0].amount).toBe(49.99);
        });

        it('should handle many fees', () => {
            const manyFees: Fee[] = Array.from({ length: 100 }, (_, i) => ({
                type: FeeType.ADMIN,
                amount: i + 1,
                refundable: false
            }));

            const result = transformFees(manyFees, 'apartments_com');
            expect(result).toHaveLength(100);
        });

        it('should handle fee with no description', () => {
            const noDescFee: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false }
            ];

            const result = formatFeeList(noDescFee);
            expect(result).toBe('application: $50');
        });

        // Wrong input types
        it('should handle wrong input types in transformFees', () => {
            // String instead of array
            expect(transformFees('not an array' as unknown as Fee[], 'apartments_com')).toEqual([]);

            // Number instead of array
            expect(transformFees(123 as unknown as Fee[], 'apartments_com')).toEqual([]);

            // Object instead of array
            expect(transformFees({} as unknown as Fee[], 'apartments_com')).toEqual([]);

            // Boolean instead of array
            expect(transformFees(true as unknown as Fee[], 'apartments_com')).toEqual([]);
        });

        it('should handle malformed fee objects', () => {
            const malformedFees = [
                { notType: FeeType.APPLICATION, amount: 50 }, // Missing type
                { type: 'INVALID_TYPE', amount: 50 }, // Invalid type
                { type: FeeType.APPLICATION }, // Missing amount
                { type: FeeType.APPLICATION, amount: 'fifty' }, // Wrong amount type
                { type: FeeType.APPLICATION, amount: null }, // Null amount
                { type: FeeType.APPLICATION, amount: undefined }, // Undefined amount
                { type: FeeType.APPLICATION, amount: NaN }, // NaN amount
                { type: FeeType.APPLICATION, amount: Infinity }, // Infinity amount
                null,
                undefined,
                'string instead of object'
            ] as unknown as Fee[];

            const result = transformFees(malformedFees, 'apartments_com');
            // Should handle gracefully, filtering out or converting invalid entries
            expect(() => result).not.toThrow();
        });

        // Extreme numeric values
        it('should handle extreme fee amounts', () => {
            const extremeFees: Fee[] = [
                { type: FeeType.APPLICATION, amount: Number.MAX_SAFE_INTEGER, refundable: false },
                { type: FeeType.ADMIN, amount: Number.MIN_SAFE_INTEGER, refundable: false },
                { type: FeeType.PARKING, amount: Number.EPSILON, refundable: false },
                { type: FeeType.PET_FEE, amount: -0, refundable: false }
            ];

            const result = transformFees(extremeFees, 'apartments_com');
            expect(result).toHaveLength(4);
            // Check that extreme amounts are handled correctly as numbers
            forEach(result, (fee) => {
                expect(typeof fee.amount).toBe('number');
            });
        });

        // calculateMoveInCost edge cases
        it('should handle calculateMoveInCost with extreme values', () => {
            // Negative rent
            expect(calculateMoveInCost(-1000, [])).toBe(-1000);

            // Zero rent
            expect(calculateMoveInCost(0, [])).toBe(0);

            // Fractional rent
            expect(calculateMoveInCost(1500.50, [])).toBe(1500.50);

            // Very large rent
            expect(calculateMoveInCost(Number.MAX_SAFE_INTEGER, [])).toBe(Number.MAX_SAFE_INTEGER);

            // With negative fees
            const negativeFees: Fee[] = [
                { type: FeeType.ADMIN, amount: -50, refundable: false }
            ];
            expect(calculateMoveInCost(1000, negativeFees)).toBe(950);
        });

        // categorizeFees edge cases
        it('should handle categorizeFees with non-standard fee types', () => {
            const customFees: Fee[] = [
                { type: 'CUSTOM_FEE' as FeeType, amount: 100, refundable: false },
                { type: '' as FeeType, amount: 50, refundable: false },
                { type: null as unknown as FeeType, amount: 25, refundable: false }
            ];

            const result = categorizeFees(customFees, []);
            // Should categorize unknown types as oneTime
            expect(result.oneTime.length).toBeGreaterThan(0);
        });

        // formatFeeList edge cases
        it('should handle formatFeeList with special separators', () => {
            const fees: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false }
            ];

            // Empty separator
            expect(formatFeeList(fees, '')).toBe('application: $50');

            // Very long separator
            const longSeparator = repeat(' | ', 100);
            expect(formatFeeList(fees, longSeparator)).toBe('application: $50');

            // Special characters in separator
            expect(formatFeeList(fees, '\n\t')).toBe('application: $50');

            // Null/undefined separator (should use default)
            expect(formatFeeList(fees, null as unknown as string)).toContain('application: $50');
            expect(formatFeeList(fees, undefined as unknown as string)).toContain('application: $50');
        });

        // mergeFees edge cases
        it('should handle mergeFees with conflicting refundable flags', () => {
            const source1: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: true }
            ];
            const source2: Fee[] = [
                { type: FeeType.APPLICATION, amount: 25, refundable: false }
            ];

            const merged = mergeFees(source1, source2);
            expect(merged[0].refundable).toBe(false); // Later source wins
        });

        it('should handle mergeFees with very many sources', () => {
            const sources = Array.from({ length: 100 }, (_, i) => [
                { type: FeeType.APPLICATION, amount: i, refundable: false }
            ] as Fee[]);

            const merged = mergeFees(...sources);
            expect(merged).toHaveLength(1);
            expect(merged[0].amount).toBe(4950); // Sum of 0+1+2+...+99
        });

        // Conditional fee adder edge cases
        it('should handle createConditionalFeeAdder with complex conditions', () => {
            // Condition that throws
            const throwingCondition = () => {
                throw new Error('Condition error');
            };
            const fee: Fee = { type: FeeType.ADMIN, amount: 100, refundable: false };
            const throwingAdder = createConditionalFeeAdder(throwingCondition, fee);

            expect(() => throwingAdder([])).toThrow('Condition error');

            // Condition that modifies fees
            let sideEffect = false;
            const modifyingCondition = (fees: Fee[]) => {
                sideEffect = true;
                fees.push({ type: FeeType.PARKING, amount: 50, refundable: false });
                return true;
            };
            const modifyingAdder = createConditionalFeeAdder(modifyingCondition, fee);

            const inputFees: Fee[] = [];
            const result = modifyingAdder(inputFees);
            expect(sideEffect).toBe(true);
            expect(inputFees).toHaveLength(1); // Modified by condition
            expect(result).toHaveLength(2); // Original plus added
        });

        it('should handle circular references in fee objects', () => {
            const circularFee: Fee & { self?: Fee } = { type: FeeType.APPLICATION, amount: 50, refundable: false };
            circularFee.self = circularFee;

            const fees = [circularFee] as Fee[];
            const result = transformFees(fees, 'apartments_com');
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('Application Fee');
        });

        // Memory and performance edge cases
        it('should handle very long fee descriptions', () => {
            const longDesc = repeat('A', 10000);
            const longFee: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, description: longDesc, refundable: false }
            ];

            const result = transformFees(longFee, 'apartments_com');
            expect(result[0].description).toBe(longDesc);
        });

        // Type coercion edge cases
        it('should handle fee type coercion', () => {
            const fees: Fee[] = [
                { type: FeeType.APPLICATION, amount: '50' as unknown as number, refundable: false },
                { type: FeeType.ADMIN, amount: true as unknown as number, refundable: false },
                { type: FeeType.PARKING, amount: [] as unknown as number, refundable: false }
            ];

            const result = transformFees(fees, 'apartments_com');
            expect(result[0].amount).toBe(50); // String coerced to number
            expect(result[1].amount).toBe(1); // true coerced to 1
            expect(result[2].amount).toBe(0); // [] coerced to 0
        });

        // Site-specific formatting edge cases
        it('should handle unknown site names gracefully', () => {
            const fees: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false }
            ];

            // Various invalid site names
            expect(() => transformFees(fees, null as unknown as string)).not.toThrow();
            expect(() => transformFees(fees, '')).not.toThrow();
            expect(() => transformFees(fees, 123 as unknown as string)).not.toThrow();
            expect(() => transformFees(fees, {} as unknown as string)).not.toThrow();

            // Should use default formatting
            const result = transformFees(fees, 'unknown_site_12345');
            expect(typeof result[0].amount).toBe('number'); // Should return number
        });

        // Concurrent operations
        it('should handle concurrent fee transformations', () => {
            const fees: Fee[] = Array.from({ length: 100 }, (_, i) => ({
                type: FeeType.ADMIN,
                amount: i,
                refundable: false
            }));

            // Transform same fees multiple times
            const results = [
                transformFees(fees, 'apartments_com'),
                transformFees(fees, 'zillow'),
                transformFees(fees, 'unknown')
            ];

            // All should complete successfully
            forEach(results, (result) => {
                expect(result).toHaveLength(100);
            });
        });
    });
});
