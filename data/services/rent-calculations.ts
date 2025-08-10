/**
 * Domain service for rent calculations
 * Encapsulates business logic for rent-related computations
 */
import _ from 'lodash';

export interface RentCalculationOptions {
    currentRent: number
    updateType: 'absolute' | 'percentage'
    value: number
}

export interface RentValidationResult {
    isValid: boolean
    errors: string[]
    warnings?: string[]
}

/**
 * Calculate new rent based on current rent, update type, and value
 * Core business logic for rent calculations
 */
export function calculateRent(options: RentCalculationOptions): number {
    const { currentRent, updateType, value } = options;

    if(updateType === 'absolute') {
        return value;
    } else {
        // Percentage change - round to nearest dollar
        return Math.round(currentRent * (1 + value / 100));
    }
}

/**
 * Calculate multiple rent scenarios for comparison
 */
export function calculateRentScenarios(currentRent: number, percentageChanges: number[]): {
    percentage: number
    newRent: number
    difference: number
}[] {
    return _.map(percentageChanges, (percentage) => {
        const newRent = calculateRent({
            currentRent,
            updateType: 'percentage',
            value: percentage
        });

        return {
            percentage,
            newRent,
            difference: newRent - currentRent
        };
    });
}

/**
 * Validate rent calculation parameters
 */
export function validateRentCalculation(options: RentCalculationOptions): RentValidationResult {
    const { currentRent, updateType, value } = options;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate current rent
    if(isNaN(currentRent) || currentRent < 0) {
        errors.push('Current rent must be a non-negative number');
    }

    // Validate update type
    if(!updateType || !['absolute', 'percentage'].includes(updateType)) {
        errors.push('Update type must be "absolute" or "percentage"');
    }

    // Validate value
    if(isNaN(value)) {
        errors.push('Value must be a valid number');
    }

    // Type-specific validations
    if(updateType === 'absolute') {
        if(value < 0) {
            errors.push('Absolute rent amount cannot be negative');
        }
        if(value === 0) {
            errors.push('Absolute rent amount cannot be zero');
        }
        if(value > 10000) {
            warnings.push('Rent amount seems unusually high (>$10,000)');
        }
    } else if(updateType === 'percentage') {
        if(Math.abs(value) > 100) {
            errors.push('Percentage change cannot exceed ±100%');
        }
        if(Math.abs(value) > 50) {
            warnings.push('Large percentage change (>50%) - please verify');
        }
        if(value < -25) {
            warnings.push('Significant rent decrease detected');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined
    };
}

/**
 * Get rent summary for display purposes
 */
export function getRentSummary(
    currentRent: number,
    updateType: 'absolute' | 'percentage',
    value: number
): string {
    if(updateType === 'absolute') {
        return `Set rent to $${value}`;
    } else {
        const direction = value >= 0 ? 'increase' : 'decrease';
        const newRent = calculateRent({ currentRent, updateType, value });
        const absValue = Math.abs(value);
        return `${direction} rent by ${absValue}% (from $${currentRent} to $${newRent})`;
    }
}

/**
 * Compare two rent amounts and provide analysis
 */
export function compareRents(oldRent: number, newRent: number): {
    difference: number
    percentageChange: number
    analysis: string
} {
    const difference = newRent - oldRent;
    const percentageChange = oldRent > 0 ? (difference / oldRent) * 100 : 0;

    let analysis: string;
    if(difference === 0) {
        analysis = 'No change in rent';
    } else if(difference > 0) {
        analysis = `Rent increase of $${difference} (${percentageChange.toFixed(1)}%)`;
    } else {
        analysis = `Rent decrease of $${Math.abs(difference)} (${Math.abs(percentageChange).toFixed(1)}%)`;
    }

    return {
        difference,
        percentageChange,
        analysis
    };
}
