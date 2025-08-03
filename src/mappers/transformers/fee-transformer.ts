import _ from 'lodash';
import type { TransformerFunction } from '../types.js';
import type { Fee } from '../../types/index.js';
import { FeeType } from '../../types/index.js';
import { createPriceFormatter } from './price-transformer.js';

/**
 * Transform fees for a specific site.
 * @param fees Array of fees
 * @param siteId The target site
 * @returns Transformed fees with site-specific formatting
 */
export function transformFees(
    fees: Fee[] | undefined,
    siteId: string
): { type: string, amount: number, description?: string, refundable?: boolean }[] {
    // Check if fees is actually an array
    if(!fees || !_.isArray(fees) || fees.length === 0) {
        return [];
    }

    // Filter out null/undefined fees and map valid ones
    const compactFees = _.compact(fees);
    const validFees = _.filter(compactFees, (fee): fee is Fee => fee && _.isObject(fee) && !!fee.type);

    return _.map(validFees, fee => ({
        type: transformFeeTypeName(fee.type, siteId),
        amount: Number(fee.amount) || 0,
        description: fee.description,
        refundable: fee.refundable
    }));
}

/**
 * Transform a fee type name for a specific site.
 * @param feeType The internal fee type
 * @param siteId The target site
 * @returns Site-specific fee type name
 */
function transformFeeTypeName(feeType: FeeType, siteId: string): string {
    // This could use the enum transformer, but keeping it simple for now
    const mappings: Record<string, Record<FeeType, string>> = {
        apartments_com: {
            [FeeType.APPLICATION]: 'Application Fee',
            [FeeType.ADMIN]: 'Administrative Fee',
            [FeeType.SECURITY_DEPOSIT]: 'Security Deposit',
            [FeeType.PET_DEPOSIT]: 'Pet Deposit',
            [FeeType.PET_FEE]: 'Pet Fee',
            [FeeType.PARKING]: 'Parking Fee',
            [FeeType.STORAGE]: 'Storage Fee',
            [FeeType.MOVE_IN]: 'Move-in Fee',
            [FeeType.KEY_DEPOSIT]: 'Key Deposit',
            [FeeType.CLEANING]: 'Cleaning Fee'
        },
        zillow: {
            [FeeType.APPLICATION]: 'Application',
            [FeeType.ADMIN]: 'Administrative',
            [FeeType.SECURITY_DEPOSIT]: 'Security Deposit',
            [FeeType.PET_DEPOSIT]: 'Pet Deposit',
            [FeeType.PET_FEE]: 'Pet',
            [FeeType.PARKING]: 'Parking',
            [FeeType.STORAGE]: 'Storage',
            [FeeType.MOVE_IN]: 'Move-in',
            [FeeType.KEY_DEPOSIT]: 'Key Deposit',
            [FeeType.CLEANING]: 'Cleaning'
        }
    };

    const siteMapping = mappings[siteId] || mappings.apartments_com;
    return siteMapping[feeType] || feeType;
}

/**
 * Separate fees into one-time and monthly categories.
 * @param oneTimeFees Array of one-time fees
 * @param monthlyFees Array of monthly fees
 * @returns Object with categorized fees
 */
export function categorizeFees(
    oneTimeFees: Fee[] | undefined,
    monthlyFees: Fee[] | undefined
): {
        oneTime: Fee[]
        monthly: Fee[]
        deposits: Fee[]
    } {
    const oneTime: Fee[] = [];
    const monthly: Fee[] = monthlyFees || [];
    const deposits: Fee[] = [];

    // Separate deposits from other one-time fees
    if(oneTimeFees) {
        for(const fee of oneTimeFees) {
            if(fee.type === FeeType.SECURITY_DEPOSIT ||
              fee.type === FeeType.PET_DEPOSIT ||
              fee.type === FeeType.KEY_DEPOSIT) {
                deposits.push(fee);
            } else {
                oneTime.push(fee);
            }
        }
    }

    return { oneTime, monthly, deposits };
}

/**
 * Calculate total move-in costs.
 * @param rent Monthly rent
 * @param oneTimeFees One-time fees
 * @param firstMonthRent Whether first month's rent is required
 * @param lastMonthRent Whether last month's rent is required
 * @returns Total move-in cost
 */
export function calculateMoveInCost(
    rent: number | undefined,
    oneTimeFees: Fee[] | undefined,
    firstMonthRent = true,
    lastMonthRent = false
): number {
    let total = 0;

    // Add rent components
    if(rent) {
        if(firstMonthRent) {
            total += rent;
        }
        if(lastMonthRent) {
            total += rent;
        }
    }

    // Add all one-time fees
    if(oneTimeFees) {
        total += _.sumBy(oneTimeFees, 'amount');
    }

    return total;
}

/**
 * Format fees as a descriptive string.
 * @param fees Array of fees
 * @param separator String to separate fee items
 * @returns Formatted fee string
 */
export function formatFeeList(
    fees: Fee[] | undefined,
    separator = ', '
): string {
    if(!fees || fees.length === 0) {
        return 'No additional fees';
    }

    const formatter = createPriceFormatter();
    const feeStrings = _.map(fees, (fee) => {
        const amount = formatter(fee.amount) || '0';
        const refundable = fee.refundable ? ' (refundable)' : '';
        return `${fee.type}: ${amount}${refundable}`;
    });

    return feeStrings.join(separator);
}

/**
 * Merge fees from multiple sources, combining amounts for the same type.
 * @param sources Arrays of fees to merge
 * @returns Merged fees with combined amounts
 */
export function mergeFees(...sources: (Fee[] | undefined)[]): Fee[] {
    const feeMap = new Map<FeeType, Fee>();

    for(const source of sources) {
        if(source) {
            for(const fee of source) {
                const existing = feeMap.get(fee.type);
                if(existing) {
                    // Combine amounts for the same fee type
                    feeMap.set(fee.type, {
                        ...fee,
                        amount: existing.amount + fee.amount,
                        description: fee.description || existing.description
                    });
                } else {
                    feeMap.set(fee.type, fee);
                }
            }
        }
    }

    return Array.from(feeMap.values());
}

/**
 * Create a transformer that adds fees based on conditions.
 * @param condition Function to check if fee should be added
 * @param feeToAdd The fee to add if condition is met
 * @returns A transformer function
 */
export function createConditionalFeeAdder(
    condition: (fees: Fee[]) => boolean,
    feeToAdd: Fee
): TransformerFunction<Fee[], Fee[]> {
    return (fees: Fee[]): Fee[] => {
        if(condition(fees)) {
            return [...fees, feeToAdd];
        }
        return fees;
    };
}
