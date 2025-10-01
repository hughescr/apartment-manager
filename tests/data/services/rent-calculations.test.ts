// CRITICAL: Import test setup FIRST before any other imports
import '../test-setup';

import { describe, it, expect } from 'bun:test';
import {
    calculateRent,
    calculateRentScenarios,
    validateRentCalculation,
    getRentSummary,
    compareRents,
    type RentCalculationOptions
} from '../../../data/services/rent-calculations';

describe('Rent Calculations Service', () => {
    describe('calculateRent', () => {
        it('should calculate absolute rent correctly', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'absolute',
                value:       2800
            };

            const result = calculateRent(options);

            expect(result).toBe(2800);
        });

        it('should calculate percentage increase correctly', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'percentage',
                value:       10
            };

            const result = calculateRent(options);

            expect(result).toBe(2750); // 2500 * 1.1 = 2750
        });

        it('should calculate percentage decrease correctly', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'percentage',
                value:       -10
            };

            const result = calculateRent(options);

            expect(result).toBe(2250); // 2500 * 0.9 = 2250
        });

        it('should round percentage calculations to nearest dollar', () => {
            const options: RentCalculationOptions = {
                currentRent: 2533,
                updateType:  'percentage',
                value:       10
            };

            const result = calculateRent(options);

            expect(result).toBe(2786); // 2533 * 1.1 = 2786.3, rounds to 2786
        });

        it('should handle zero current rent with percentage', () => {
            const options: RentCalculationOptions = {
                currentRent: 0,
                updateType:  'percentage',
                value:       50
            };

            const result = calculateRent(options);

            expect(result).toBe(0); // 0 * 1.5 = 0
        });

        it('should handle zero percentage change', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'percentage',
                value:       0
            };

            const result = calculateRent(options);

            expect(result).toBe(2500); // 2500 * 1.0 = 2500
        });

        it('should handle 100% increase', () => {
            const options: RentCalculationOptions = {
                currentRent: 1000,
                updateType:  'percentage',
                value:       100
            };

            const result = calculateRent(options);

            expect(result).toBe(2000); // 1000 * 2.0 = 2000
        });

        it('should handle fractional percentages', () => {
            const options: RentCalculationOptions = {
                currentRent: 2000,
                updateType:  'percentage',
                value:       2.5
            };

            const result = calculateRent(options);

            expect(result).toBe(2050); // 2000 * 1.025 = 2050
        });
    });

    describe('calculateRentScenarios', () => {
        it('should calculate multiple rent scenarios', () => {
            const currentRent = 2500;
            const percentageChanges = [5, 10, -5, -10];

            const results = calculateRentScenarios(currentRent, percentageChanges);

            expect(results).toHaveLength(4);
            expect(results[0]).toEqual({
                percentage: 5,
                newRent:    2625,
                difference: 125
            });
            expect(results[1]).toEqual({
                percentage: 10,
                newRent:    2750,
                difference: 250
            });
            expect(results[2]).toEqual({
                percentage: -5,
                newRent:    2375,
                difference: -125
            });
            expect(results[3]).toEqual({
                percentage: -10,
                newRent:    2250,
                difference: -250
            });
        });

        it('should handle empty percentage array', () => {
            const results = calculateRentScenarios(2500, []);

            expect(results).toEqual([]);
        });

        it('should handle zero current rent', () => {
            const results = calculateRentScenarios(0, [10, 20]);

            expect(results).toEqual([
                { percentage: 10, newRent: 0, difference: 0 },
                { percentage: 20, newRent: 0, difference: 0 }
            ]);
        });

        it('should handle fractional results correctly', () => {
            const results = calculateRentScenarios(2333, [3.5]);

            expect(results[0]).toEqual({
                percentage: 3.5,
                newRent:    2415, // 2333 * 1.035 = 2414.655, rounds to 2415
                difference: 82
            });
        });
    });

    describe('validateRentCalculation', () => {
        it('should validate correct absolute rent calculation', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'absolute',
                value:       2800
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
            expect(result.warnings).toBeUndefined();
        });

        it('should validate correct percentage rent calculation', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'percentage',
                value:       10
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
            expect(result.warnings).toBeUndefined();
        });

        it('should reject negative current rent', () => {
            const options: RentCalculationOptions = {
                currentRent: -100,
                updateType:  'absolute',
                value:       2800
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Current rent must be a non-negative number');
        });

        it('should reject NaN current rent', () => {
            const options: RentCalculationOptions = {
                currentRent: NaN,
                updateType:  'absolute',
                value:       2800
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Current rent must be a non-negative number');
        });

        it('should reject invalid update type', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'relative' as unknown as 'absolute' | 'percentage',
                value:       100
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Update type must be "absolute" or "percentage"');
        });

        it('should reject NaN value', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'absolute',
                value:       NaN
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Value must be a valid number');
        });

        it('should reject negative absolute rent', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'absolute',
                value:       -100
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Absolute rent amount cannot be negative');
        });

        it('should reject zero absolute rent', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'absolute',
                value:       0
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Absolute rent amount cannot be zero');
        });

        it('should warn about unusually high rent', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'absolute',
                value:       15000
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('Rent amount seems unusually high (>$10,000)');
        });

        it('should reject percentage over 100%', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'percentage',
                value:       150
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Percentage change cannot exceed ±100%');
        });

        it('should reject percentage under -100%', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'percentage',
                value:       -150
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Percentage change cannot exceed ±100%');
        });

        it('should allow exactly 100% and -100%', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'percentage',
                value:       100
            };

            let result = validateRentCalculation(options);
            expect(result.isValid).toBe(true);

            options.value = -100;
            result = validateRentCalculation(options);
            expect(result.isValid).toBe(true);
        });

        it('should warn about large percentage changes', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'percentage',
                value:       75
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('Large percentage change (>50%) - please verify');
        });

        it('should warn about significant rent decrease', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'percentage',
                value:       -30
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('Significant rent decrease detected');
        });

        it('should accumulate multiple errors', () => {
            const options: RentCalculationOptions = {
                currentRent: -100,
                updateType:  'invalid' as unknown as 'absolute' | 'percentage',
                value:       NaN
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(3);
            expect(result.errors).toContain('Current rent must be a non-negative number');
            expect(result.errors).toContain('Update type must be "absolute" or "percentage"');
            expect(result.errors).toContain('Value must be a valid number');
        });

        it('should handle valid parameters with warnings only', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'percentage',
                value:       -30
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
            expect(result.warnings).toContain('Significant rent decrease detected');
        });
    });

    describe('getRentSummary', () => {
        it('should generate summary for absolute rent update', () => {
            const summary = getRentSummary(2500, 'absolute', 2800);

            expect(summary).toBe('Set rent to $2800');
        });

        it('should generate summary for percentage increase', () => {
            const summary = getRentSummary(2500, 'percentage', 10);

            expect(summary).toBe('increase rent by 10% (from $2500 to $2750)');
        });

        it('should generate summary for percentage decrease', () => {
            const summary = getRentSummary(2500, 'percentage', -5);

            expect(summary).toBe('decrease rent by 5% (from $2500 to $2375)');
        });

        it('should handle zero percentage change', () => {
            const summary = getRentSummary(2500, 'percentage', 0);

            expect(summary).toBe('increase rent by 0% (from $2500 to $2500)');
        });

        it('should handle fractional percentage', () => {
            const summary = getRentSummary(2000, 'percentage', 2.5);

            expect(summary).toBe('increase rent by 2.5% (from $2000 to $2050)');
        });

        it('should handle zero current rent', () => {
            const summary = getRentSummary(0, 'percentage', 10);

            expect(summary).toBe('increase rent by 10% (from $0 to $0)');
        });
    });

    describe('compareRents', () => {
        it('should compare rent increase', () => {
            const result = compareRents(2500, 2750);

            expect(result.difference).toBe(250);
            expect(result.percentageChange).toBe(10);
            expect(result.analysis).toBe('Rent increase of $250 (10.0%)');
        });

        it('should compare rent decrease', () => {
            const result = compareRents(2500, 2250);

            expect(result.difference).toBe(-250);
            expect(result.percentageChange).toBe(-10);
            expect(result.analysis).toBe('Rent decrease of $250 (10.0%)');
        });

        it('should handle no rent change', () => {
            const result = compareRents(2500, 2500);

            expect(result.difference).toBe(0);
            expect(result.percentageChange).toBe(0);
            expect(result.analysis).toBe('No change in rent');
        });

        it('should handle zero old rent', () => {
            const result = compareRents(0, 2500);

            expect(result.difference).toBe(2500);
            expect(result.percentageChange).toBe(0); // Avoid division by zero
            expect(result.analysis).toBe('Rent increase of $2500 (0.0%)');
        });

        it('should handle fractional percentages', () => {
            const result = compareRents(2333, 2450);

            expect(result.difference).toBe(117);
            expect(result.percentageChange).toBeCloseTo(5.01, 1);
            expect(result.analysis).toContain('Rent increase of $117 (5.0%)');
        });

        it('should handle large percentage changes', () => {
            const result = compareRents(1000, 2000);

            expect(result.difference).toBe(1000);
            expect(result.percentageChange).toBe(100);
            expect(result.analysis).toBe('Rent increase of $1000 (100.0%)');
        });

        it('should round percentage to one decimal place', () => {
            const result = compareRents(3000, 3100);

            expect(result.percentageChange).toBeCloseTo(3.33, 1);
            expect(result.analysis).toContain('3.3%');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle extremely large numbers', () => {
            const options: RentCalculationOptions = {
                currentRent: 999999,
                updateType:  'percentage',
                value:       10
            };

            const result = calculateRent(options);

            expect(result).toBe(1099999); // 999999 * 1.1 = 1099998.9, rounds to 1099999
        });

        it('should handle very small percentage changes', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'percentage',
                value:       0.01
            };

            const result = calculateRent(options);

            expect(result).toBe(2500); // 2500 * 1.0001 = 2500.25, rounds to 2500
        });

        it('should validate edge case percentages correctly', () => {
            const options: RentCalculationOptions = {
                currentRent: 2500,
                updateType:  'percentage',
                value:       50.1
            };

            let result = validateRentCalculation(options);
            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('Large percentage change (>50%) - please verify');

            options.value = -25.1;
            result = validateRentCalculation(options);
            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('Significant rent decrease detected');
        });

        it('should handle boundary values in validation', () => {
            const options: RentCalculationOptions = {
                currentRent: 0,
                updateType:  'percentage',
                value:       100
            };

            const result = validateRentCalculation(options);

            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('Large percentage change (>50%) - please verify');
        });
    });
});
