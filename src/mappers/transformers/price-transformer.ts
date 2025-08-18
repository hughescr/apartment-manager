import { replace, trim } from 'lodash';
import type { TransformerFunction } from '../types.js';

/**
 * Format a price value as currency.
 * @param includeSymbol Whether to include the currency symbol
 * @param currencySymbol The currency symbol to use
 * @returns A transformer function
 */
export function createPriceFormatter(
    includeSymbol = true,
    currencySymbol = '$'
): TransformerFunction<number | undefined, string | undefined> {
    return (value: number | undefined): string | undefined => {
        if(value === undefined || value === null) {
            return undefined;
        }

        // Round to 2 decimal places
        const rounded = Math.round(value * 100) / 100;

        // Format with commas
        const formatted = rounded.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

        return includeSymbol ? `${currencySymbol}${formatted}` : formatted;
    };
}

/**
 * Parse a currency string to a number.
 * @param value The currency string
 * @returns The numeric value or undefined
 */
export function parseCurrency(value: string | undefined): number | undefined {
    if(!value) {
        return undefined;
    }

    // Remove currency symbols and commas
    const cleaned = trim(replace(value, /[$,]/g, ''));

    // Try to parse
    const parsed = parseFloat(cleaned);

    return isNaN(parsed) ? undefined : parsed;
}

/**
 * Format a price range.
 * @param min Minimum price
 * @param max Maximum price
 * @param includeSymbol Whether to include currency symbol
 * @returns Formatted price range
 */
export function formatPriceRange(
    min: number | undefined,
    max: number | undefined,
    includeSymbol = true
): string {
    const formatter = createPriceFormatter(includeSymbol);

    if(min === undefined && max === undefined) {
        return 'Call for pricing';
    }

    if(min === max || max === undefined) {
        return formatter(min) || 'Call for pricing';
    }

    if(min === undefined) {
        return `Up to ${formatter(max)}`;
    }

    return `${formatter(min)} - ${formatter(max)}`;
}

/**
 * Calculate price per square foot.
 * @param rent Monthly rent
 * @param sqft Square footage
 * @returns Price per square foot
 */
export function pricePerSqft(rent: number | undefined, sqft: number | undefined): number | undefined {
    if(!rent || !sqft || sqft === 0) {
        return undefined;
    }

    return Math.round((rent / sqft) * 100) / 100;
}

/**
 * Format a deposit amount, handling special cases.
 * @param deposit The deposit amount
 * @param rent The monthly rent (for percentage-based deposits)
 * @returns Formatted deposit string
 */
export function formatDeposit(deposit: number | undefined, rent?: number): string {
    if(!deposit) {
        return 'No deposit';
    }

    const formatter = createPriceFormatter();

    // Check if deposit equals rent (common case)
    if(rent && deposit === rent) {
        return `${formatter(deposit)} (1 month's rent)`;
    }

    // Check if deposit is a multiple of rent
    if(rent && deposit % rent === 0) {
        const months = deposit / rent;
        return `${formatter(deposit)} (${months} month${months > 1 ? 's' : ''} rent)`;
    }

    return formatter(deposit) || 'Call for deposit';
}

/**
 * Convert monthly rent to other periods.
 * @param monthlyRent The monthly rent amount
 * @param period The target period
 * @returns Converted amount
 */
export function convertRentPeriod(
    monthlyRent: number | undefined,
    period: 'weekly' | 'biweekly' | 'monthly' | 'yearly'
): number | undefined {
    if(!monthlyRent) {
        return undefined;
    }

    switch(period) {
        case 'weekly':
            return Math.round((monthlyRent * 12 / 52) * 100) / 100;
        case 'biweekly':
            return Math.round((monthlyRent * 12 / 26) * 100) / 100;
        case 'monthly':
            return monthlyRent;
        case 'yearly':
            return monthlyRent * 12;
        default:
            return monthlyRent;
    }
}
