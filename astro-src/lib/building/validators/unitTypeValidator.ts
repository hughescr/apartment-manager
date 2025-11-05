/**
 * Unit Type Validation Utilities
 *
 * Extracted from building/state.ts for better organization and testability.
 * Provides validation logic for unit type (floorplan) data.
 */

import type { UnitTypeData } from '../../../types';
import { trim, reduce, isString, isNumber } from 'lodash';

/**
 * Validation rules for numeric fields
 */
export const UNIT_TYPE_NUMERIC_RULES = [
    { field: 'beds', min: 0, max: 10, message: 'Beds must be between 0 and 10' },
    { field: 'baths', min: 0, max: 10, message: 'Baths must be between 0 and 10' },
    { field: 'minSqft', min: 0, max: 10000, message: 'Minimum square feet must be between 0 and 10,000' },
    { field: 'maxSqft', min: 0, max: 10000, message: 'Maximum square feet must be between 0 and 10,000' },
    { field: 'minRent', min: 0, max: 50000, message: 'Minimum rent must be between $0 and $50,000' },
    { field: 'maxRent', min: 0, max: 50000, message: 'Maximum rent must be between $0 and $50,000' }
] as const;

/**
 * Validates complete unit type data and returns validation result
 */
export function validateUnitType(unitType: Partial<UnitTypeData>): { isValid: boolean, errors: Record<string, string> } {
    const errors: string[] = [];

    // Validate required fields
    validateRequiredFields(unitType, errors);

    // Validate numeric ranges
    validateNumericRanges(unitType, errors);

    // Validate logical constraints
    validateLogicalConstraints(unitType, errors);

    return {
        isValid: errors.length === 0,
        errors:  reduce(errors, (acc, error, index) => {
            acc[`error_${index}`] = error;
            return acc;
        }, {} as Record<string, string>)
    };
}

/**
 * Validates a single unit type field and returns error message if invalid
 */
export function validateUnitTypeField(
    fieldName: keyof UnitTypeData,
    value: unknown
): string | null {
    switch(fieldName) {
        case 'modelID':
            return validateRequiredString(value, 'Model ID');
        case 'modelName':
            return validateRequiredString(value, 'Model name');
        case 'beds':
            return validateNumericField(value, 0, 10, 'Beds');
        case 'baths':
            return validateNumericField(value, 0, 10, 'Baths');
        case 'minSqft':
            return validateNumericField(value, 0, 10000, 'Minimum square feet');
        case 'maxSqft':
            return validateNumericField(value, 0, 10000, 'Maximum square feet');
        case 'minRent':
            return validateNumericField(value, 0, 50000, 'Minimum rent');
        case 'maxRent':
            return validateNumericField(value, 0, 50000, 'Maximum rent');
        default:
            return null;
    }
}

/**
 * Validate required fields for unit type
 */
function validateRequiredFields(unitType: Partial<UnitTypeData>, errors: string[]): void {
    if(!unitType.modelID || trim(unitType.modelID) === '') {
        errors.push('Model ID is required');
    }

    if(!unitType.modelName || trim(unitType.modelName) === '') {
        errors.push('Model name is required');
    }
}

/**
 * Validate numeric ranges for unit type
 */
function validateNumericRanges(unitType: Partial<UnitTypeData>, errors: string[]): void {
    for(const rule of UNIT_TYPE_NUMERIC_RULES) {
        const value = unitType[rule.field as keyof UnitTypeData];
        if(!isValidNumericField(value, rule.min, rule.max)) {
            errors.push(rule.message);
        }
    }
}

/**
 * Validate logical constraints (min <= max relationships)
 */
function validateLogicalConstraints(unitType: Partial<UnitTypeData>, errors: string[]): void {
    // Validate sqft range
    if(unitType.minSqft !== undefined && unitType.maxSqft !== undefined) {
        if(unitType.minSqft > unitType.maxSqft) {
            errors.push('Minimum square feet cannot be greater than maximum square feet');
        }
    }

    // Validate rent range
    if(unitType.minRent !== undefined && unitType.maxRent !== undefined) {
        if(unitType.minRent > unitType.maxRent) {
            errors.push('Minimum rent cannot be greater than maximum rent');
        }
    }
}

/**
 * Validate a single numeric field
 */
function isValidNumericField(
    value: unknown,
    min: number,
    max: number
): boolean {
    if(value === undefined || value === null) {
        return true; // Skip validation for undefined/null values
    }
    const numValue = value as number;
    return numValue >= min && numValue <= max;
}

/**
 * Validate a required string field
 */
function validateRequiredString(value: unknown, fieldName: string): string | null {
    if(!value || !isString(value) || trim(value) === '') {
        return `${fieldName} is required`;
    }
    return null;
}

/**
 * Validate a numeric field with bounds
 */
function validateNumericField(
    value: unknown,
    min: number,
    max: number,
    fieldName: string
): string | null {
    if(value === undefined || value === null) {
        return null; // Optional fields
    }

    const numValue = value as number;
    if(!isNumber(numValue) || isNaN(numValue)) {
        return `${fieldName} must be a valid number`;
    }

    if(numValue < min || numValue > max) {
        return `${fieldName} must be between ${min} and ${max.toLocaleString()}`;
    }

    return null;
}
