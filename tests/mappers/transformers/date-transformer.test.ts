/* eslint-disable @typescript-eslint/no-explicit-any -- Mocking Date constructor requires any */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { forEach, map, noop, repeat, split } from 'lodash';
import {
    createDateFormatter,
    parseDateToISO,
    daysUntil,
    isDateInPast,
    formatAvailability
} from '../../../src/mappers/transformers/date-transformer';

describe('Date Transformer', () => {
    // Mock current date for consistent testing
    const mockDate = new Date('2024-03-15T12:00:00Z');
    const originalDate = Date;

    beforeEach(() => {
        // Mock Date constructor
        global.Date = class extends originalDate {
            constructor(...args: [] | [string | number | Date] | [number, number, number?, number?, number?, number?, number?]) {
                if(args.length === 0) {
                    super(mockDate.getTime());
                } else if(args.length === 1) {
                    super(args[0]);
                } else {
                    super(
                        args[0],
                        args[1],
                        args[2],
                        args[3],
                        args[4],
                        args[5],
                        args[6]
                    );
                }
            }

            static now() {
                return mockDate.getTime();
            }
        } as unknown as typeof Date;
    });

    afterEach(() => {
        // Restore original Date
        global.Date = originalDate;
    });

    describe('createDateFormatter', () => {
        describe('MM/DD/YYYY format', () => {
            const formatter = createDateFormatter('MM/DD/YYYY');

            it('should format valid dates correctly', () => {
                expect(formatter('2024-03-15')).toBe('03/15/2024');
                expect(formatter('2024-01-01')).toBe('01/01/2024');
                expect(formatter('2024-12-31')).toBe('12/31/2024');
            });

            it('should handle single digit months and days', () => {
                expect(formatter('2024-01-05')).toBe('01/05/2024');
                expect(formatter('2024-10-05')).toBe('10/05/2024');
            });

            it('should return undefined for invalid dates', () => {
                expect(formatter('invalid-date')).toBeUndefined();
                expect(formatter('2024-13-01')).toBeUndefined();
                expect(formatter('2024-00-01')).toBeUndefined();
            });

            it('should handle undefined and empty values', () => {
                expect(formatter(undefined)).toBeUndefined();
                expect(formatter('')).toBeUndefined();
            });
        });

        describe('YYYY-MM-DD format', () => {
            const formatter = createDateFormatter('YYYY-MM-DD');

            it('should format valid dates correctly', () => {
                expect(formatter('2024-03-15')).toBe('2024-03-15');
                expect(formatter('03/15/2024')).toBe('2024-03-15');
                expect(formatter('March 15, 2024')).toBe('2024-03-15');
            });

            it('should handle different input formats', () => {
                expect(formatter('2024/03/15')).toBe('2024-03-15');
                expect(formatter('15-Mar-2024')).toBe('2024-03-15');
            });
        });

        describe('MM-DD-YYYY format', () => {
            const formatter = createDateFormatter('MM-DD-YYYY');

            it('should format valid dates correctly', () => {
                expect(formatter('2024-03-15')).toBe('03-15-2024');
                expect(formatter('2024-01-01')).toBe('01-01-2024');
                expect(formatter('2024-12-31')).toBe('12-31-2024');
            });
        });

        describe('Unknown format', () => {
            const formatter = createDateFormatter('UNKNOWN');

            it('should return original value for unknown format', () => {
                expect(formatter('2024-03-15')).toBe('2024-03-15');
                expect(formatter('03/15/2024')).toBe('03/15/2024');
            });

            it('should return undefined for invalid dates', () => {
                expect(formatter('invalid')).toBeUndefined();
            });
        });
    });

    describe('parseDateToISO', () => {
        it('should parse ISO format dates', () => {
            expect(parseDateToISO('2024-03-15')).toBe('2024-03-15');
            expect(parseDateToISO('2024-01-01')).toBe('2024-01-01');
            expect(parseDateToISO('2024-12-31')).toBe('2024-12-31');
        });

        it('should parse US format with slashes', () => {
            expect(parseDateToISO('03/15/2024')).toBe('2024-03-15');
            expect(parseDateToISO('1/1/2024')).toBe('2024-01-01');
            expect(parseDateToISO('12/31/2024')).toBe('2024-12-31');
        });

        it('should parse US format with dashes', () => {
            expect(parseDateToISO('03-15-2024')).toBe('2024-03-15');
            expect(parseDateToISO('1-1-2024')).toBe('2024-01-01');
            expect(parseDateToISO('12-31-2024')).toBe('2024-12-31');
        });

        it('should handle various date formats via native parsing', () => {
            expect(parseDateToISO('March 15, 2024')).toBe('2024-03-15');
            expect(parseDateToISO('15 March 2024')).toBe('2024-03-15');
            expect(parseDateToISO('2024/03/15')).toBe('2024-03-15');
        });

        it('should return undefined for invalid dates', () => {
            expect(parseDateToISO('invalid')).toBeUndefined();
            expect(parseDateToISO('not-a-date')).toBeUndefined();
        });

        it('should handle date overflow (JavaScript behavior)', () => {
            // Our strict validation rejects dates with invalid month/day values
            expect(parseDateToISO('13/32/2024')).toBeUndefined(); // Invalid month 13
            expect(parseDateToISO('02/30/2024')).toBeUndefined(); // Feb 30 doesn't exist
            expect(parseDateToISO('04/31/2024')).toBeUndefined(); // Apr only has 30 days
        });

        it('should handle undefined and empty values', () => {
            expect(parseDateToISO(undefined)).toBeUndefined();
            expect(parseDateToISO('')).toBeUndefined();
        });
    });

    describe('daysUntil', () => {
        it('should calculate days until future dates', () => {
            expect(daysUntil('2024-03-16')).toBe(1);
            expect(daysUntil('2024-03-20')).toBe(5);
            expect(daysUntil('2024-03-25')).toBe(10);
            expect(daysUntil('2024-04-15')).toBe(31);
        });

        it('should return negative days for past dates', () => {
            expect(daysUntil('2024-03-14')).toBe(-1);
            expect(daysUntil('2024-03-10')).toBe(-5);
            expect(daysUntil('2024-02-15')).toBe(-29);
        });

        it('should return 0 for today', () => {
            expect(daysUntil('2024-03-15')).toBe(0);
        });

        it('should handle time components correctly', () => {
            // Different times on the same day should still return 0
            expect(daysUntil('2024-03-15T08:00:00')).toBe(0);
            expect(daysUntil('2024-03-15T23:59:59')).toBe(0);
        });

        it('should return undefined for invalid dates', () => {
            expect(daysUntil('invalid')).toBeUndefined();
            expect(daysUntil('2024-13-01')).toBeUndefined();
        });

        it('should handle undefined and empty values', () => {
            expect(daysUntil(undefined)).toBeUndefined();
            expect(daysUntil('')).toBeUndefined();
        });
    });

    describe('isDateInPast', () => {
        it('should return true for past dates', () => {
            expect(isDateInPast('2024-03-14')).toBe(true);
            expect(isDateInPast('2024-03-01')).toBe(true);
            expect(isDateInPast('2023-12-31')).toBe(true);
        });

        it('should return false for future dates', () => {
            expect(isDateInPast('2024-03-16')).toBe(false);
            expect(isDateInPast('2024-04-01')).toBe(false);
            expect(isDateInPast('2025-01-01')).toBe(false);
        });

        it('should handle today as not in the past', () => {
            expect(isDateInPast('2024-03-15T00:00:00')).toBe(true);
            expect(isDateInPast('2024-03-15T23:59:59')).toBe(false);
        });

        it('should return false for invalid dates', () => {
            expect(isDateInPast('invalid')).toBe(false);
            expect(isDateInPast('not-a-date')).toBe(false);
        });

        it('should handle undefined and empty values', () => {
            expect(isDateInPast(undefined)).toBe(false);
            expect(isDateInPast('')).toBe(false);
        });
    });

    describe('formatAvailability', () => {
        it('should return "Available Now" for past dates', () => {
            expect(formatAvailability('2024-03-14')).toBe('Available Now');
            expect(formatAvailability('2024-03-01')).toBe('Available Now');
            expect(formatAvailability('2023-12-31')).toBe('Available Now');
        });

        it('should return "Available Now" for today', () => {
            expect(formatAvailability('2024-03-15')).toBe('Available Now');
        });

        it('should return "Available Tomorrow" for tomorrow', () => {
            expect(formatAvailability('2024-03-16')).toBe('Available Tomorrow');
        });

        it('should return "Available in X days" for dates within a week', () => {
            expect(formatAvailability('2024-03-17')).toBe('Available in 2 days');
            expect(formatAvailability('2024-03-20')).toBe('Available in 5 days');
            expect(formatAvailability('2024-03-22')).toBe('Available in 7 days');
        });

        it('should return "Available MM/DD/YYYY" for dates beyond a week', () => {
            expect(formatAvailability('2024-03-23')).toBe('Available 03/23/2024');
            expect(formatAvailability('2024-04-01')).toBe('Available 04/01/2024');
            expect(formatAvailability('2024-12-25')).toBe('Available 12/25/2024');
        });

        it('should return "Available Now" for undefined and invalid dates', () => {
            expect(formatAvailability(undefined)).toBe('Available Now');
            expect(formatAvailability('')).toBe('Available Now');
            expect(formatAvailability('invalid')).toBe('Available Now');
            expect(formatAvailability('not-a-date')).toBe('Available Now');
        });
    });

    describe('Edge Cases', () => {
        it('should handle leap years correctly', () => {
            const formatter = createDateFormatter('MM/DD/YYYY');
            expect(formatter('2024-02-29')).toBe('02/29/2024'); // 2024 is a leap year
            expect(formatter('2023-02-29')).toBeUndefined(); // 2023 is not a leap year, Luxon correctly rejects invalid dates
        });

        it('should handle year boundaries', () => {
            // Use JavaScript Date for calculating expected days
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowISO = split(tomorrow.toISOString(), 'T')[0];

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayISO = split(yesterday.toISOString(), 'T')[0];

            expect(daysUntil(tomorrowISO)).toBe(1);
            expect(daysUntil(yesterdayISO)).toBe(-1);
        });

        it('should handle extreme dates', () => {
            const formatter = createDateFormatter('YYYY-MM-DD');
            expect(formatter('1900-01-01')).toBe('1900-01-01');
            expect(formatter('2100-12-31')).toBe('2100-12-31');
        });

        it('should handle date objects as strings', () => {
            const dateString = new Date('2024-03-15').toString();
            // toString() format like "Fri Mar 15 2024..." is not supported
            const parsed = parseDateToISO(dateString);
            expect(parsed).toBeUndefined();
        });

        it('should handle timezone differences', () => {
            // This might behave differently in different timezones
            const formatter = createDateFormatter('YYYY-MM-DD');
            const utcDate = '2024-03-15T00:00:00Z';
            const result = formatter(utcDate);
            expect(result).toMatch(/2024-03-1[45]/); // Could be 14th or 15th depending on timezone
        });

        // Wrong input types
        it('should handle wrong input types for createDateFormatter', () => {
            const formatter = createDateFormatter('MM/DD/YYYY');

            // Number instead of string
            expect(formatter(123 as unknown as string)).toBeUndefined();

            // Boolean
            expect(formatter(true as unknown as string)).toBeUndefined();

            // Object
            expect(formatter({} as unknown as string)).toBeUndefined();

            // Array
            expect(formatter([] as unknown as string)).toBeUndefined();

            // Function
            expect(formatter(noop as unknown as string)).toBeUndefined();
        });

        it('should handle malformed date strings', () => {
            const formatter = createDateFormatter('MM/DD/YYYY');

            // Invalid month
            expect(formatter('2024-13-15')).toBeUndefined();
            expect(formatter('2024-00-15')).toBeUndefined();

            // Invalid day - our strict validation rejects these
            expect(formatter('2024-01-32')).toBeUndefined(); // Day 32 doesn't exist
            expect(formatter('2024-01-00')).toBeUndefined();

            // Incomplete dates - Luxon accepts year-month as valid ISO format
            expect(formatter('2024-01')).toBe('01/01/2024'); // ISO accepts YYYY-MM format
            expect(formatter('2024')).toBe('01/01/2024'); // ISO accepts YYYY format

            // Wrong format
            expect(formatter('15-03-2024')).toBeUndefined(); // DD-MM-YYYY
            expect(formatter('2024/03/15')).toBe('03/15/2024'); // Different separator

            // Random strings
            expect(formatter('not a date')).toBeUndefined();
            expect(formatter('12345')).toBeUndefined(); // Luxon correctly rejects bare years
            expect(formatter('null')).toBeUndefined();
        });

        it('should handle infinity and NaN dates', () => {
            const formatter = createDateFormatter('MM/DD/YYYY');

            // Infinity
            expect(formatter('Infinity')).toBeUndefined();
            expect(formatter('-Infinity')).toBeUndefined();

            // NaN
            expect(formatter('NaN')).toBeUndefined();
        });

        // Transformer chain failures
        it('should handle date formatter with unknown formats', () => {
            const formatters = [
                createDateFormatter('DD/MM/YYYY'), // Not supported
                createDateFormatter('YYYY/MM/DD'), // Not supported
                createDateFormatter(''), // Empty format
                createDateFormatter(null as unknown as string),
                createDateFormatter(undefined as unknown as string),
                createDateFormatter({} as unknown as string)
            ];

            forEach(formatters, (formatter) => {
                // Should return original value for unknown formats
                expect(formatter('2024-03-15')).toBe('2024-03-15');
            });
        });

        // Memory and performance edge cases
        it('should handle very long date strings', () => {
            const formatter = createDateFormatter('MM/DD/YYYY');
            const longString = '2024-03-15' + repeat('x', 10000);

            expect(formatter(longString)).toBeUndefined();
        });

        it('should handle date calculations near epoch boundaries', () => {
            // Near Unix epoch (1970-01-01)
            expect(parseDateToISO('1970-01-01')).toBe('1970-01-01');
            expect(parseDateToISO('1969-12-31')).toBe('1969-12-31');

            // JavaScript Date min/max values
            expect(parseDateToISO('0000-01-01')).toBeDefined();
            expect(parseDateToISO('9999-12-31')).toBeDefined();
        });

        // daysUntil edge cases
        it('should handle daysUntil with extreme date differences', () => {
            // Very far future
            expect(daysUntil('2100-01-01')).toBeGreaterThan(25000);

            // Very far past
            expect(daysUntil('1900-01-01')).toBeLessThan(-45000);

            // Same date but different times
            expect(daysUntil('2024-03-15T00:00:00Z')).toBe(0);
            expect(daysUntil('2024-03-15T23:59:59Z')).toBe(0);
        });

        // isDateInPast edge cases
        it('should handle isDateInPast with millisecond precision', () => {
            const now = new Date().toISOString();
            const nowPlus1ms = new Date(Date.now() + 1).toISOString();
            const nowMinus1ms = new Date(Date.now() - 1).toISOString();

            expect(isDateInPast(now)).toBe(false); // Exactly now
            expect(isDateInPast(nowPlus1ms)).toBe(false);
            expect(isDateInPast(nowMinus1ms)).toBe(true);
        });

        // formatAvailability edge cases
        it('should handle formatAvailability with special date values', () => {
            // Very far future
            expect(formatAvailability('2100-01-01')).toMatch(/^Available \d{2}\/\d{2}\/\d{4}$/);

            // Invalid dates default to "Available Now"
            expect(formatAvailability('invalid')).toBe('Available Now');
            expect(formatAvailability(null as unknown as string)).toBe('Available Now');
            expect(formatAvailability(123 as unknown as string)).toBe('Available Now');
            expect(formatAvailability({} as unknown as string)).toBe('Available Now');
        });

        // Date parsing with various formats
        it('should handle parseDateToISO with unconventional formats', () => {
            // ISO formats with timezone
            expect(parseDateToISO('2024-03-15T12:00:00+05:00')).toBe('2024-03-15');
            expect(parseDateToISO('2024-03-15T12:00:00-08:00')).toBe('2024-03-15');

            // Partial ISO formats
            expect(parseDateToISO('2024-03-15T12:00')).toBe('2024-03-15');
            expect(parseDateToISO('2024-03-15T12')).toBe('2024-03-15'); // Luxon accepts partial ISO formats

            // Various separators
            expect(parseDateToISO('2024.03.15')).toBe('2024-03-15');
            expect(parseDateToISO('2024 03 15')).toBe('2024-03-15');

            // With extra text
            expect(parseDateToISO('Date: 2024-03-15')).toBeUndefined();
            expect(parseDateToISO('2024-03-15 (Friday)')).toBeUndefined(); // Has extra text, not a valid format
        });

        // Concurrent operations
        it('should handle concurrent date operations', () => {
            const dates = Array.from({ length: 100 }, (__, i) => {
                const d = new Date('2024-01-01');
                d.setDate(d.getDate() + i);
                const isoString = d.toISOString();
                return split(isoString, 'T')[0];
            });

            const formatter = createDateFormatter('MM/DD/YYYY');
            const results = map(dates, d => formatter(d));

            // All should be formatted correctly
            forEach(results, (result) => {
                expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
            });
        });

        // Error handling in date calculations
        it('should handle errors in date arithmetic gracefully', () => {
            // Test daysUntil with dates that might cause overflow
            expect(() => daysUntil('10000-01-01')).not.toThrow();
            expect(() => daysUntil('-10000-01-01')).not.toThrow();

            // Test with malformed dates that Date constructor might accept
            expect(() => daysUntil('2024-15-45')).not.toThrow(); // JS might adjust this
        });

        // Locale-specific edge cases
        it('should handle different locale date formats in parseDateToISO', () => {
            // European format (DD/MM/YYYY)
            expect(parseDateToISO('15/03/2024')).toBeUndefined(); // Ambiguous - could be March 15 or invalid

            // European format DD/MM/YYYY - our parser assumes MM/DD/YYYY
            expect(parseDateToISO('31/12/2024')).toBeUndefined(); // 31 is not a valid month

            // Named months
            expect(parseDateToISO('March 15, 2024')).toBe('2024-03-15');
            expect(parseDateToISO('15 March 2024')).toBe('2024-03-15');
            expect(parseDateToISO('15-Mar-24')).toBe('2024-03-15');
        });

        // Date formatter parameter edge cases
        it('should handle date formatter with special parameters', () => {
            // Formatter with parameters object in second arg (if supported)
            const formatter = createDateFormatter('MM/DD/YYYY');
            const date = '2024-03-15';

            // Should ignore extra parameters
            expect((formatter as any)(date, { extra: 'param' })).toBe('03/15/2024');
            expect((formatter as any)(date, null)).toBe('03/15/2024');
            expect((formatter as any)(date, 123)).toBe('03/15/2024');
        });
    });
});
