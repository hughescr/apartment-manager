/**
 * Unit and Unit Type Validation Functions
 *
 * Provides validation logic for unit types and units, including
 * draft and published modes for both entity types.
 */

import { isEmpty, isPlainObject, map } from 'lodash';
import { ValidationResult, ValidationError } from './types';
import { performSecurityValidations, sanitizeDataForSecurity } from './security-validator';

// Import unit and unit type schemas
import { UnitTypeDraftSchema, UnitDraftSchema } from './draft';
import { UnitTypePublishedSchema, UnitPublishedSchema, ALL_MITS_ERROR_MESSAGES } from './published';

/**
 * Validates unit type data for saving (draft mode) - uses permissive validation
 * Accepts partial/incomplete data and allows saving with validation warnings.
 *
 * @param data - The unit type data to validate
 * @returns ValidationResult with success status and any errors
 */
export function validateUnitTypeForSave(data: unknown): ValidationResult {
    // Handle empty update bodies - allow them to pass through
    if(isEmpty(data) || (isPlainObject(data) && isEmpty(data as Record<string, unknown>))) {
        return {
            success: true,
            data: {},
            errors: []
        };
    }

    // Apply security validations before schema validation
    const securityErrors = performSecurityValidations(data, 'unitType');
    if(securityErrors.length > 0) {
        return {
            success: false,
            errors: securityErrors
        };
    }

    // Sanitize text fields to prevent XSS
    const sanitizedData = sanitizeDataForSecurity(data);
    const result = UnitTypeDraftSchema.safeParse(sanitizedData);

    if(result.success) {
        return {
            success: true,
            data: sanitizedData,  // Return sanitized data, not Zod's parsed result
            errors: []
        };
    }

    // Transform Zod errors to user-friendly format
    const errors = map(result.error.issues, (issue): ValidationError => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
        context: `Draft validation allows incomplete data. This field has an issue but you can still save.`
    }));

    return {
        success: false,
        errors
    };
}

/**
 * Validates unit type data for publishing - uses strict MITS schemas
 * Validates against MITS 4.1 requirements and returns detailed errors
 * explaining what's missing for publication.
 *
 * @param data - The unit type data to validate
 * @returns ValidationResult with detailed MITS compliance errors
 */
export function validateUnitTypeForPublish(data: unknown): ValidationResult {
    const result = UnitTypePublishedSchema.safeParse(data);

    if(result.success) {
        return {
            success: true,
            data: result.data,
            errors: []
        };
    }

    // Transform Zod errors with MITS context
    const errorMessages = ALL_MITS_ERROR_MESSAGES.UNIT_TYPE;
    const errors = map(result.error.issues, (issue): ValidationError => {
        const fieldPath = issue.path.join('.');
        const mitsContext = (errorMessages as Record<string, string>)[fieldPath] || 'Required for MITS 4.1 compliance';

        return {
            field: fieldPath,
            message: issue.message,
            code: issue.code,
            context: `MITS Requirement: ${mitsContext}`
        };
    });

    return {
        success: false,
        errors
    };
}

/**
 * Validates unit data for saving (draft mode) - uses permissive validation
 * Accepts partial/incomplete data and allows saving with validation warnings.
 *
 * @param data - The unit data to validate
 * @returns ValidationResult with success status and any errors
 */
export function validateUnitForSave(data: unknown): ValidationResult {
    // Handle empty update bodies - allow them to pass through
    if(isEmpty(data) || (isPlainObject(data) && isEmpty(data as Record<string, unknown>))) {
        return {
            success: true,
            data: {},
            errors: []
        };
    }

    // Apply security validations before schema validation
    const securityErrors = performSecurityValidations(data, 'unit');
    if(securityErrors.length > 0) {
        return {
            success: false,
            errors: securityErrors
        };
    }

    // Sanitize text fields to prevent XSS
    const sanitizedData = sanitizeDataForSecurity(data);
    const result = UnitDraftSchema.safeParse(sanitizedData);

    if(result.success) {
        return {
            success: true,
            data: sanitizedData,  // Return sanitized data, not Zod's parsed result
            errors: []
        };
    }

    // Transform Zod errors to user-friendly format
    const errors = map(result.error.issues, (issue): ValidationError => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
        context: `Draft validation allows incomplete data. This field has an issue but you can still save.`
    }));

    return {
        success: false,
        errors
    };
}

/**
 * Validates unit data for publishing - uses strict MITS schemas
 * Validates against MITS 4.1 requirements and returns detailed errors
 * explaining what's missing for publication.
 *
 * @param data - The unit data to validate
 * @returns ValidationResult with detailed MITS compliance errors
 */
export function validateUnitForPublish(data: unknown): ValidationResult {
    const result = UnitPublishedSchema.safeParse(data);

    if(result.success) {
        return {
            success: true,
            data: result.data,
            errors: []
        };
    }

    // Transform Zod errors with MITS context
    const errorMessages = ALL_MITS_ERROR_MESSAGES.UNIT;
    const errors = map(result.error.issues, (issue): ValidationError => {
        const fieldPath = issue.path.join('.');
        const mitsContext = (errorMessages as Record<string, string>)[fieldPath] || 'Required for MITS 4.1 compliance';

        return {
            field: fieldPath,
            message: issue.message,
            code: issue.code,
            context: `MITS Requirement: ${mitsContext}`
        };
    });

    return {
        success: false,
        errors
    };
}
