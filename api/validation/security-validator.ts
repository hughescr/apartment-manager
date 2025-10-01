/**
 * Security Validation Functions
 *
 * Provides security-focused validation and sanitization functions
 * to prevent XSS, injection attacks, and other security vulnerabilities.
 */

import validator from 'validator';
import { forEach, includes, isArray, isNumber, isPlainObject, isString, map, replace, startCase, toLower, trim } from 'lodash';
import { sanitizeHtml, validateArraySize, validateNumericValue } from '../security-validation';
import { ValidationError } from './types';

/**
 * Performs security validations on data before schema validation
 */
export function performSecurityValidations(data: unknown, entityType: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if(!isPlainObject(data)) {
        return errors;
    }

    const obj = data as Record<string, unknown>;

    // Validate array sizes to prevent DoS attacks
    if(obj.photos && isArray(obj.photos)) {
        const arrayError = validateArraySize(obj.photos, 'photos', 50);
        if(arrayError) {
            errors.push({
                field:   'photos',
                message: arrayError,
                code:    'ARRAY_TOO_LARGE'
            });
        }
    }

    if(obj.amenities && isArray(obj.amenities)) {
        const arrayError = validateArraySize(obj.amenities, 'amenities', 100);
        if(arrayError) {
            errors.push({
                field:   'amenities',
                message: arrayError,
                code:    'ARRAY_TOO_LARGE'
            });
        }
    }

    if(obj.features && isArray(obj.features)) {
        const arrayError = validateArraySize(obj.features, 'features', 100);
        if(arrayError) {
            errors.push({
                field:   'features',
                message: arrayError,
                code:    'ARRAY_TOO_LARGE'
            });
        }
    }

    // Validate numeric ranges and boundary values
    if(entityType === 'building') {
        if(obj.yearBuilt !== undefined) {
            const numError = validateNumericValue(obj.yearBuilt as number, 'yearBuilt', 1800, new Date().getFullYear() + 1);
            if(numError) {
                errors.push({
                    field:   'yearBuilt',
                    message: numError,
                    code:    'INVALID_RANGE'
                });
            }
        }
    }

    // Validate negative numbers for fields that shouldn't be negative
    const nonNegativeFields = ['beds', 'baths', 'sqft', 'rent', 'deposit', 'minRent', 'maxRent'];
    forEach(nonNegativeFields, (field) => {
        if(obj[field] !== undefined && isNumber(obj[field]) && (obj[field]) < 0) {
            errors.push({
                field,
                message: `${startCase(field)} cannot be negative`,
                code:    'NEGATIVE_VALUE'
            });
        }
    });

    return errors;
}

/**
 * Sanitizes data to prevent XSS and other injection attacks
 */
export function sanitizeDataForSecurity(data: unknown): unknown {
    if(!isPlainObject(data)) {
        return data;
    }

    const obj = data as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    forEach(obj, (value, key) => {
        const sanitizedValue = sanitizeField(key, value);
        // Preserve all fields, even if empty
        if(sanitizedValue !== undefined) {
            sanitized[key] = sanitizedValue;
        }
    });

    return sanitized;
}

/**
 * Sanitize a single field based on its type and name
 */
function sanitizeField(key: string, value: unknown): unknown {
    // Handle nested objects first
    if(isPlainObject(value)) {
        const sanitized = sanitizeDataForSecurity(value);
        // Preserve nested objects even if empty
        return sanitized;
    }

    // Handle arrays
    if(isArray(value)) {
        return sanitizeArray(value);
    }

    // Handle string values based on field type
    if(isString(value)) {
        return sanitizeStringField(key, value);
    }

    // Keep other values as-is (including null, undefined, numbers, booleans)
    return value;
}

/**
 * Sanitize array values
 */
function sanitizeArray(value: unknown[]): unknown[] {
    return map(value, (item) => {
        if(isString(item)) {
            return sanitizeHtml(item);
        } else if(isPlainObject(item)) {
            return sanitizeDataForSecurity(item);
        } else {
            return item;
        }
    });
}

/**
 * Sanitize string fields based on field name
 */
function sanitizeStringField(key: string, value: string): unknown {
    // Text fields that should be sanitized for XSS
    const textFields = [
        'buildingName', 'description', 'street', 'city', 'state',
        'modelName', 'unitNumber', 'notes'
    ];

    // Handle text fields
    if(includes(textFields, key)) {
        const result = sanitizeHtml(value);
        return result;
    }

    // Handle URL fields
    if(isUrlField(key)) {
        const trimmedValue = trim(value);
        if(trimmedValue && validator.isURL(trimmedValue, {
            protocols:              ['http', 'https'],
            require_protocol:       false,
            require_valid_protocol: true,
            allow_query_components: true,
            allow_fragments:        true
        })) {
            const result = sanitizeHtml(trimmedValue);
            return result;
        }
        // For invalid URLs, keep the sanitized value to maintain field presence
        // Empty string ensures the field exists for proper error reporting
        const result = trimmedValue ? sanitizeHtml(trimmedValue) : '';
        return result;
    }

    // Handle email fields
    if(isEmailField(key)) {
        const trimmedValue = trim(value);
        if(trimmedValue && validator.isEmail(trimmedValue)) {
            return sanitizeHtml(trimmedValue);
        }
        // Return sanitized value for validation to handle
        // This allows the schema to properly validate and return appropriate errors
        return sanitizeHtml(trimmedValue);
    }

    // Handle ZIP codes
    if(key === 'zip') {
        // Check if the ZIP code contains any suspicious characters
        // These could indicate SQL injection, XSS, or other attacks
        const suspiciousPatterns = /[;<>{}$|\\`"'\0\r\n]/;
        if(suspiciousPatterns.test(value)) {
            // Return the malicious value as-is so validation will reject it
            return value;
        }

        // For non-malicious input, clean and validate
        const cleanedZip = replace(value, /[^0-9-]/g, '');
        const zipRegex = /^\d{5}(?:-\d{4})?$/;
        if(cleanedZip && zipRegex.test(cleanedZip)) {
            return cleanedZip;
        }
        // Return original value for validation to handle
        return value;
    }

    // Default: return as-is
    return value;
}

/**
 * Check if a field name represents a URL field
 */
function isUrlField(fieldName: string): boolean {
    const lowerName = toLower(fieldName);
    return includes(lowerName, 'website') || includes(lowerName, 'url');
}

/**
 * Check if a field name represents an email field
 */
function isEmailField(fieldName: string): boolean {
    const lowerName = toLower(fieldName);
    return includes(lowerName, 'email');
}
