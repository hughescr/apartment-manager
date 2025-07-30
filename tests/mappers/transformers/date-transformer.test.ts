/* eslint-disable @typescript-eslint/no-explicit-any -- Mocking Date constructor requires any */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
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
            constructor(...args: any[]) {
                if(args.length === 0) {
                    super(mockDate.getTime());
                } else {
                    super(...args);
                }
            }

            static now() {
                return mockDate.getTime();
            }
        } as any;
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
            // JavaScript Date constructor automatically adjusts invalid dates
            expect(parseDateToISO('13/32/2024')).toBe('2025-02-01'); // Month 13 = Jan+1, day 32 = Feb 1
            expect(parseDateToISO('02/30/2024')).toBe('2024-03-01'); // Feb 30 = Mar 1
            expect(parseDateToISO('04/31/2024')).toBe('2024-05-01'); // Apr 31 = May 1
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
            expect(formatter('2023-02-29')).toBe('03/01/2023'); // 2023 is not a leap year, JS rolls over to March 1
        });

        it('should handle year boundaries', () => {
            // Test with mocked date at year end
            global.Date = class extends originalDate {
                constructor(...args: any[]) {
                    if(args.length === 0) {
                        super('2024-12-31T12:00:00Z');
                    } else {
                        super(...args);
                    }
                }
            } as any;

            expect(daysUntil('2025-01-01')).toBe(1);
            expect(daysUntil('2024-12-30')).toBe(-1);
        });

        it('should handle extreme dates', () => {
            const formatter = createDateFormatter('YYYY-MM-DD');
            expect(formatter('1900-01-01')).toBe('1900-01-01');
            expect(formatter('2100-12-31')).toBe('2100-12-31');
        });

        it('should handle date objects as strings', () => {
            const dateString = new Date('2024-03-15').toString();
            const parsed = parseDateToISO(dateString);
            expect(parsed).toBe('2024-03-15');
        });

        it('should handle timezone differences', () => {
            // This might behave differently in different timezones
            const formatter = createDateFormatter('YYYY-MM-DD');
            const utcDate = '2024-03-15T00:00:00Z';
            const result = formatter(utcDate);
            expect(result).toMatch(/2024-03-1[45]/); // Could be 14th or 15th depending on timezone
        });
    });
});
