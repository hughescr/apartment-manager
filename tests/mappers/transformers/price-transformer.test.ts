/* eslint-disable @typescript-eslint/no-explicit-any -- Testing edge cases with null values */
import { describe, it, expect } from 'bun:test';
import {
    createPriceFormatter,
    parseCurrency,
    formatPriceRange,
    pricePerSqft,
    formatDeposit,
    convertRentPeriod
} from '../../../src/mappers/transformers/price-transformer';

describe('Price Transformer', () => {
    describe('createPriceFormatter', () => {
        it('should format prices with default settings', () => {
            const formatter = createPriceFormatter();

            expect(formatter(1000)).toBe('$1,000');
            expect(formatter(1500.50)).toBe('$1,500.5');
            expect(formatter(1500.99)).toBe('$1,500.99');
            expect(formatter(0)).toBe('$0');
        });

        it('should format without currency symbol', () => {
            const formatter = createPriceFormatter(false);

            expect(formatter(1000)).toBe('1,000');
            expect(formatter(1500.50)).toBe('1,500.5');
            expect(formatter(1500.99)).toBe('1,500.99');
        });

        it('should use custom currency symbol', () => {
            const formatter = createPriceFormatter(true, '€');

            expect(formatter(1000)).toBe('€1,000');
            expect(formatter(1500.50)).toBe('€1,500.5');
        });

        it('should handle rounding correctly', () => {
            const formatter = createPriceFormatter();

            expect(formatter(1234.567)).toBe('$1,234.57');
            expect(formatter(1234.564)).toBe('$1,234.56');
            expect(formatter(1234.001)).toBe('$1,234');
        });

        it('should handle large numbers', () => {
            const formatter = createPriceFormatter();

            expect(formatter(1000000)).toBe('$1,000,000');
            expect(formatter(1234567.89)).toBe('$1,234,567.89');
        });

        it('should handle undefined and null values', () => {
            const formatter = createPriceFormatter();

            expect(formatter(undefined)).toBeUndefined();
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing null value edge case
            expect(formatter(null as any)).toBeUndefined();
        });

        it('should handle negative values', () => {
            const formatter = createPriceFormatter();

            expect(formatter(-1000)).toBe('$-1,000');
            expect(formatter(-50.50)).toBe('$-50.5');
        });
    });

    describe('parseCurrency', () => {
        it('should parse currency strings correctly', () => {
            expect(parseCurrency('$1,000')).toBe(1000);
            expect(parseCurrency('$1,500.50')).toBe(1500.5);
            expect(parseCurrency('1,500.99')).toBe(1500.99);
            expect(parseCurrency('$0')).toBe(0);
        });

        it('should handle strings without currency symbols', () => {
            expect(parseCurrency('1000')).toBe(1000);
            expect(parseCurrency('1500.50')).toBe(1500.5);
            expect(parseCurrency('1,500.99')).toBe(1500.99);
        });

        it('should handle whitespace', () => {
            expect(parseCurrency(' $1,000 ')).toBe(1000);
            expect(parseCurrency('  1,500.50  ')).toBe(1500.5);
        });

        it('should return undefined for invalid values', () => {
            expect(parseCurrency('invalid')).toBeUndefined();
            expect(parseCurrency('$abc')).toBeUndefined();
            expect(parseCurrency('')).toBeUndefined();
            expect(parseCurrency(undefined)).toBeUndefined();
        });

        it('should handle negative values', () => {
            expect(parseCurrency('$-1,000')).toBe(-1000);
            expect(parseCurrency('-$1,000')).toBe(-1000);
            expect(parseCurrency('-1500.50')).toBe(-1500.5);
        });

        it('should handle edge cases', () => {
            expect(parseCurrency('$0.01')).toBe(0.01);
            expect(parseCurrency('$0.00')).toBe(0);
            expect(parseCurrency('$.50')).toBe(0.5);
        });
    });

    describe('formatPriceRange', () => {
        it('should format price ranges correctly', () => {
            expect(formatPriceRange(1000, 1500)).toBe('$1,000 - $1,500');
            expect(formatPriceRange(800, 1200)).toBe('$800 - $1,200');
            expect(formatPriceRange(1500.50, 2000.99)).toBe('$1,500.5 - $2,000.99');
        });

        it('should handle equal min and max', () => {
            expect(formatPriceRange(1000, 1000)).toBe('$1,000');
            expect(formatPriceRange(1500.50, 1500.50)).toBe('$1,500.5');
        });

        it('should handle undefined max', () => {
            expect(formatPriceRange(1000, undefined)).toBe('$1,000');
            expect(formatPriceRange(1500.50, undefined)).toBe('$1,500.5');
        });

        it('should handle undefined min', () => {
            expect(formatPriceRange(undefined, 1500)).toBe('Up to $1,500');
            expect(formatPriceRange(undefined, 2000.99)).toBe('Up to $2,000.99');
        });

        it('should handle both undefined', () => {
            expect(formatPriceRange(undefined, undefined)).toBe('Call for pricing');
        });

        it('should work without currency symbol', () => {
            expect(formatPriceRange(1000, 1500, false)).toBe('1,000 - 1,500');
            expect(formatPriceRange(undefined, 1500, false)).toBe('Up to 1,500');
        });

        it('should handle edge cases', () => {
            expect(formatPriceRange(0, 1000)).toBe('$0 - $1,000');
            expect(formatPriceRange(0, 0)).toBe('$0');
            expect(formatPriceRange(0, undefined)).toBe('$0');
        });
    });

    describe('pricePerSqft', () => {
        it('should calculate price per square foot correctly', () => {
            expect(pricePerSqft(1000, 500)).toBe(2);
            expect(pricePerSqft(1500, 1000)).toBe(1.5);
            expect(pricePerSqft(2250, 1500)).toBe(1.5);
        });

        it('should round to 2 decimal places', () => {
            expect(pricePerSqft(1000, 333)).toBe(3);
            expect(pricePerSqft(1000, 334)).toBe(2.99);
            expect(pricePerSqft(1234, 567)).toBe(2.18);
        });

        it('should handle undefined values', () => {
            expect(pricePerSqft(undefined, 500)).toBeUndefined();
            expect(pricePerSqft(1000, undefined)).toBeUndefined();
            expect(pricePerSqft(undefined, undefined)).toBeUndefined();
        });

        it('should handle zero values', () => {
            expect(pricePerSqft(0, 500)).toBeUndefined();
            expect(pricePerSqft(1000, 0)).toBeUndefined();
            expect(pricePerSqft(0, 0)).toBeUndefined();
        });

        it('should handle edge cases', () => {
            expect(pricePerSqft(1, 1)).toBe(1);
            expect(pricePerSqft(0.5, 1)).toBe(0.5);
            expect(pricePerSqft(100, 10000)).toBe(0.01);
        });
    });

    describe('formatDeposit', () => {
        it('should format deposit amounts', () => {
            expect(formatDeposit(1000)).toBe('$1,000');
            expect(formatDeposit(1500.50)).toBe('$1,500.5');
            expect(formatDeposit(0)).toBe('No deposit');
        });

        it('should recognize when deposit equals rent', () => {
            expect(formatDeposit(1000, 1000)).toBe('$1,000 (1 month\'s rent)');
            expect(formatDeposit(1500, 1500)).toBe('$1,500 (1 month\'s rent)');
        });

        it('should recognize multiples of rent', () => {
            expect(formatDeposit(2000, 1000)).toBe('$2,000 (2 months rent)');
            expect(formatDeposit(4500, 1500)).toBe('$4,500 (3 months rent)');
            expect(formatDeposit(500, 500)).toBe('$500 (1 month\'s rent)');
        });

        it('should handle non-multiple deposits', () => {
            expect(formatDeposit(1250, 1000)).toBe('$1,250');
            expect(formatDeposit(1600, 1500)).toBe('$1,600');
        });

        it('should handle undefined values', () => {
            expect(formatDeposit(undefined)).toBe('No deposit');
            expect(formatDeposit(undefined, 1000)).toBe('No deposit');
        });

        it('should handle edge cases', () => {
            expect(formatDeposit(1, 1)).toBe('$1 (1 month\'s rent)');
            expect(formatDeposit(1000, 0)).toBe('$1,000');
            expect(formatDeposit(0, 1000)).toBe('No deposit');
        });
    });

    describe('convertRentPeriod', () => {
        it('should convert monthly to weekly', () => {
            expect(convertRentPeriod(1000, 'weekly')).toBe(230.77);
            expect(convertRentPeriod(1200, 'weekly')).toBe(276.92);
        });

        it('should convert monthly to biweekly', () => {
            expect(convertRentPeriod(1000, 'biweekly')).toBe(461.54);
            expect(convertRentPeriod(1200, 'biweekly')).toBe(553.85);
        });

        it('should return monthly unchanged', () => {
            expect(convertRentPeriod(1000, 'monthly')).toBe(1000);
            expect(convertRentPeriod(1500.50, 'monthly')).toBe(1500.50);
        });

        it('should convert monthly to yearly', () => {
            expect(convertRentPeriod(1000, 'yearly')).toBe(12000);
            expect(convertRentPeriod(1500, 'yearly')).toBe(18000);
        });

        it('should handle undefined values', () => {
            expect(convertRentPeriod(undefined, 'weekly')).toBeUndefined();
            expect(convertRentPeriod(undefined, 'yearly')).toBeUndefined();
        });

        it('should handle zero values', () => {
            // Implementation treats 0 as falsy, returns undefined
            expect(convertRentPeriod(0, 'weekly')).toBeUndefined();
            expect(convertRentPeriod(0, 'yearly')).toBeUndefined();
        });

        it('should handle default case', () => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Testing unknown period edge case
            expect(convertRentPeriod(1000, 'unknown' as any)).toBe(1000);
        });

        it('should handle precise calculations', () => {
            // Test that calculations are consistent
            const monthly = 1000;
            const weekly = convertRentPeriod(monthly, 'weekly')!;
            const yearly = convertRentPeriod(monthly, 'yearly')!;

            expect(weekly * 52).toBeCloseTo(yearly, 0);
            expect(Math.round(weekly * 52)).toBe(yearly);
        });
    });

    describe('Edge Cases', () => {
        it('should handle very large numbers', () => {
            const formatter = createPriceFormatter();
            expect(formatter(999999999.99)).toBe('$999,999,999.99');
            expect(formatPriceRange(1000000, 2000000)).toBe('$1,000,000 - $2,000,000');
        });

        it('should handle very small numbers', () => {
            const formatter = createPriceFormatter();
            expect(formatter(0.01)).toBe('$0.01');
            expect(formatter(0.001)).toBe('$0'); // Rounds down
            expect(formatter(0.005)).toBe('$0.01'); // Rounds up
        });

        it('should handle negative deposits and rents', () => {
            expect(formatDeposit(-1000)).toBe('$-1,000');
            expect(convertRentPeriod(-1000, 'weekly')).toBe(-230.77);
        });

        it('should handle floating point precision', () => {
            expect(pricePerSqft(1000.01, 333.33)).toBe(3);
            expect(convertRentPeriod(999.99, 'weekly')).toBe(230.77);
        });
    });
});
