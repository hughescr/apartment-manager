import { isString } from 'lodash';
import { DateTime } from 'luxon';
import type { TransformerFunction } from '../types.js';

/**
 * Format a date string to a specific format.
 * @param format The target date format
 * @returns A transformer function
 */
export function createDateFormatter(format: string): TransformerFunction<string | undefined, string | undefined> {
    return (value: string | undefined): string | undefined => {
        if(!value) {
            return undefined;
        }

        // Ensure value is a string
        if(!isString(value)) {
            return undefined;
        }

        // Parse the date using our flexible parser
        const dateTime = parseDateToDateTime(value);
        if(!dateTime?.isValid) {
            return undefined;
        }

        // Format according to the requested format
        switch(format) {
            case 'MM/DD/YYYY':
                return dateTime.toFormat('MM/dd/yyyy');
            case 'YYYY-MM-DD':
                // Luxon's toISODate() returns string | null, convert null to undefined for consistency
                return dateTime.toISODate() ?? undefined;
            case 'MM-DD-YYYY':
                return dateTime.toFormat('MM-dd-yyyy');
            default:
                return value;
        }
    };
}

/**
 * Parse a date from various formats and return ISO string.
 * @param value The date string to parse
 * @returns ISO date string or undefined if invalid
 */
export function parseDateToISO(value: string | undefined): string | undefined {
    if(!value) {
        return undefined;
    }

    // Ensure value is a string
    if(!isString(value)) {
        return undefined;
    }

    const dateTime = parseDateToDateTime(value);
    // Luxon's toISODate() returns string | null, convert null to undefined for consistency
    return dateTime?.isValid ? (dateTime.toISODate() ?? undefined) : undefined;
}

/**
 * Parse a date string to a Luxon DateTime object using various formats.
 * @param value The date string to parse
 * @returns DateTime object or null if invalid
 */
function parseDateToDateTime(value: unknown): DateTime | null {
    // Define the formats we want to support explicitly
    const formats = [
        'yyyy-MM-dd',     // ISO format: 2024-03-15
        'MM/dd/yyyy',     // US format with slashes: 03/15/2024
        'M/d/yyyy',       // US format with slashes, single digits: 3/5/2024
        'MM-dd-yyyy',     // US format with dashes: 03-15-2024
        'M-d-yyyy',       // US format with dashes, single digits: 3-5-2024
        'LLLL d, yyyy',   // Natural language: March 15, 2024
        'd LLLL yyyy',    // Natural language: 15 March 2024
        'yyyy/MM/dd',     // Alternative format: 2024/03/15
        'yyyy.MM.dd',     // Alternative format: 2024.03.15
        'yyyy MM dd',     // Alternative format: 2024 03 15
        'd-LLL-yy',       // Abbreviated format: 15-Mar-24
    ];

    // Type safety check
    if(!isString(value)) {
        return null;
    }

    // Try each format with Luxon
    for(const format of formats) {
        const parsed = DateTime.fromFormat(value, format);
        if(parsed.isValid) {
            return parsed;
        }
    }

    // Try ISO parsing for datetime strings with time components
    // But be strict - only accept complete ISO formats
    const isoDateTime = DateTime.fromISO(value);
    if(isoDateTime.isValid) {
        return isoDateTime;
    }

    // Try SQL format
    const sqlDateTime = DateTime.fromSQL(value);
    if(sqlDateTime.isValid) {
        return sqlDateTime;
    }

    // Try RFC2822 format
    const rfcDateTime = DateTime.fromRFC2822(value);
    if(rfcDateTime.isValid) {
        return rfcDateTime;
    }

    // Try HTTP format
    const httpDateTime = DateTime.fromHTTP(value);
    if(httpDateTime.isValid) {
        return httpDateTime;
    }

    return null;
}

/**
 * Calculate days until a date.
 * @param value The target date
 * @returns Number of days until the date
 */
export function daysUntil(value: string | undefined): number | undefined {
    if(!value) {
        return undefined;
    }

    const targetDateTime = parseDateToDateTime(value);
    if(!targetDateTime?.isValid) {
        return undefined;
    }

    const today = DateTime.now().startOf('day');
    const target = targetDateTime.startOf('day');

    const diffDays = Math.ceil(target.diff(today, 'days').days);
    return diffDays;
}

/**
 * Check if a date is in the past.
 * @param value The date to check
 * @returns true if the date is in the past
 */
export function isDateInPast(value: string | undefined): boolean {
    if(!value) {
        return false;
    }

    const dateTime = parseDateToDateTime(value);
    if(!dateTime?.isValid) {
        return false;
    }

    const now = DateTime.now();

    // Check if the input has time components by looking for indicators
    const hasTimeComponent = value.includes('T')
      || value.includes(':')
      || /\d{2}:\d{2}/.test(value);

    if(hasTimeComponent) {
        // For datetime values, use precise comparison
        return dateTime < now;
    } else {
        // For date-only values, compare at start of day
        const today = now.startOf('day');
        const targetDay = dateTime.startOf('day');
        return targetDay < today;
    }
}

/**
 * Format a date as "Available Now" or "Available MM/DD/YYYY"
 * @param value The availability date
 * @returns Formatted availability string
 */
export function formatAvailability(value: string | undefined): string {
    if(!value) {
        return 'Available Now';
    }

    const daysLeft = daysUntil(value);
    if(daysLeft === undefined) {
        return 'Available Now';
    }

    if(daysLeft <= 0) {
        return 'Available Now';
    } else if(daysLeft === 1) {
        return 'Available Tomorrow';
    } else if(daysLeft <= 7) {
        return `Available in ${daysLeft} days`;
    } else {
        const formatter = createDateFormatter('MM/DD/YYYY');
        return `Available ${formatter(value)}`;
    }
}
