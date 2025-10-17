import type { ValidationRule } from '../types';
import { isString, trim, isNumber } from 'lodash';

/**
 * Checks if a value is required and missing
 */
export function isRequiredAndMissing(value: unknown, required: boolean): boolean {
    return required && (value == null || value === '' || (isString(value) && trim(value) === ''));
}

/**
 * Validates pattern for string values - returns true if validation fails (error exists)
 */
export function validatePattern(value: unknown, pattern: RegExp): boolean {
    if(value == null || value === '' || !isString(value)) {
        return false; // Not an error for null/empty/non-string values
    }
    return !pattern.test(value); // Return true if pattern fails (error exists)
}

/**
 * Validates numeric range - returns true if validation fails (error exists)
 */
export function validateNumericRange(value: unknown, min?: number, max?: number): boolean {
    if(value === null || value === undefined || value === '') {
        return false; // Not an error for null/empty values
    }

    const numValue = Number(value);
    if(isNaN(numValue)) {
        return false; // Not an error for non-numeric values
    }

    return (min !== undefined && numValue < min) || (max !== undefined && numValue > max);
}

/**
 * Validates a single field against its rules
 */
export function validateField(value: unknown, rules: ValidationRule[]): string | null {
    for(const rule of rules) {
        if(isRequiredAndMissing(value, rule.required ?? false)) {
            return rule.message;
        }

        if(rule.pattern && validatePattern(value, rule.pattern)) {
            return rule.message;
        }

        if(validateNumericRange(value, rule.min, rule.max)) {
            return rule.message;
        }
    }

    return null;
}

/**
 * Converts value to number safely
 */
export function safeNumberConversion(value: unknown): number | null {
    if(value == null || value === '') {
        return null;
    }

    let numValue: number;
    if(isNumber(value)) {
        numValue = value;
    } else if(isString(value)) {
        numValue = Number(value);
    } else {
        // For non-string, non-number values, return null
        return null;
    }

    return isNaN(numValue) ? null : numValue;
}
