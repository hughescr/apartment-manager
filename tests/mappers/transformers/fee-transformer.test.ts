import { describe, it, expect } from 'bun:test';
import _ from 'lodash';
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
                amount: '$50',
                description: 'Application fee',
                refundable: false
            });
            expect(result[1]).toEqual({
                type: 'Security Deposit',
                amount: '$1,000',
                description: 'Security deposit',
                refundable: true
            });
        });

        it('should transform fees for zillow without currency symbols', () => {
            const result = transformFees(testFees, 'zillow');

            expect(result).toHaveLength(5);
            expect(result[0]).toEqual({
                type: 'Application',
                amount: '50',
                description: 'Application fee',
                refundable: false
            });
            expect(result[1]).toEqual({
                type: 'Security Deposit',
                amount: '1,000',
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
            expect(result[0].amount).toBe('$50');
            expect(result[0].type).toBe('Application Fee');
        });

        it('should handle zero amounts', () => {
            const zeroFee: Fee[] = [
                { type: FeeType.APPLICATION, amount: 0, description: 'No app fee', refundable: false }
            ];

            const result = transformFees(zeroFee, 'apartments_com');
            expect(result[0].amount).toBe('$0');
        });

        it('should handle negative amounts', () => {
            const negativeFee: Fee[] = [
                { type: FeeType.ADMIN, amount: -50, description: 'Discount', refundable: false }
            ];

            const result = transformFees(negativeFee, 'apartments_com');
            expect(result[0].amount).toBe('$-50');
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

            expect(_.map(result.oneTime, 'type')).toEqual([
                FeeType.APPLICATION,
                FeeType.ADMIN
            ]);

            expect(_.map(result.deposits, 'type')).toEqual([
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
            expect(_.map(merged, 'type').sort()).toEqual([
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

            expect(_.map(merged, 'type')).toEqual([
                FeeType.PET_FEE,
                FeeType.APPLICATION,
                FeeType.ADMIN
            ]);
        });
    });

    describe('createConditionalFeeAdder', () => {
        it('should add fee when condition is met', () => {
            const condition = (fees: Fee[]) => _.some(fees, ['type', FeeType.PET_DEPOSIT]);
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
            const condition = (fees: Fee[]) => _.some(fees, ['type', FeeType.PET_DEPOSIT]);
            const petFee: Fee = { type: FeeType.PET_FEE, amount: 25, refundable: false };

            const transformer = createConditionalFeeAdder(condition, petFee);

            const feesWithoutPetDeposit: Fee[] = [
                { type: FeeType.APPLICATION, amount: 50, refundable: false },
                { type: FeeType.SECURITY_DEPOSIT, amount: 1000, refundable: true }
            ];

            const result = transformer(feesWithoutPetDeposit);

            expect(result).toHaveLength(2);
            expect(_.find(result, ['type', FeeType.PET_FEE])).toBeUndefined();
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
                const totalAmount = _.reduce(fees, (sum, fee) => sum + fee.amount, 0);
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
            expect(result[0].amount).toBe('$1,000,000');
        });

        it('should handle decimal amounts', () => {
            const decimalFee: Fee[] = [
                { type: FeeType.APPLICATION, amount: 49.99, refundable: false }
            ];

            const result = transformFees(decimalFee, 'apartments_com');
            expect(result[0].amount).toBe('$49.99');
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
    });
});
