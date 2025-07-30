import _ from 'lodash';
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

        const date = new Date(value);
        if(isNaN(date.getTime())) {
            return undefined;
        }

        switch(format) {
            case 'MM/DD/YYYY':
                return formatMMDDYYYY(date);
            case 'YYYY-MM-DD':
                return formatYYYYMMDD(date);
            case 'MM-DD-YYYY':
                return formatMMDDYYYYDash(date);
            default:
                return value;
        }
    };
}

/**
 * Format date as MM/DD/YYYY
 */
function formatMMDDYYYY(date: Date): string {
    const month = _.padStart(String(date.getMonth() + 1), 2, '0');
    const day = _.padStart(String(date.getDate()), 2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
}

/**
 * Format date as YYYY-MM-DD (ISO format)
 */
function formatYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = _.padStart(String(date.getMonth() + 1), 2, '0');
    const day = _.padStart(String(date.getDate()), 2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date as MM-DD-YYYY
 */
function formatMMDDYYYYDash(date: Date): string {
    const month = _.padStart(String(date.getMonth() + 1), 2, '0');
    const day = _.padStart(String(date.getDate()), 2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
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

    // Try to parse various formats
    const patterns = [
        // ISO format
        /^(\d{4})-(\d{2})-(\d{2})$/,
        // US format with slashes
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
        // US format with dashes
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    ];

    for(const pattern of patterns) {
        const match = value.match(pattern);
        if(match) {
            let year: number, month: number, day: number;

            if(pattern === patterns[0]) {
                // ISO format
                [, year, month, day] = _.map(match, Number);
            } else {
                // US format
                [, month, day, year] = _.map(match, Number);
            }

            const date = new Date(year, month - 1, day);
            if(!isNaN(date.getTime())) {
                return formatYYYYMMDD(date);
            }
        }
    }

    // Try native Date parsing as fallback
    const date = new Date(value);
    if(!isNaN(date.getTime())) {
        return formatYYYYMMDD(date);
    }

    return undefined;
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

    const targetDate = new Date(value);
    if(isNaN(targetDate.getTime())) {
        return undefined;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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

    const date = new Date(value);
    if(isNaN(date.getTime())) {
        return false;
    }

    return date < new Date();
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
