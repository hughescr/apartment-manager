import _ from 'lodash';

/**
 * Security validation functions for API input sanitization
 */

// Pattern for valid IDs - alphanumeric plus hyphens and underscores only
const VALID_ID_PATTERN = /^[\w-]+$/;

// Pattern for detecting path traversal attempts
const PATH_TRAVERSAL_PATTERN = /\.\.|\/\//;

// Pattern for detecting null bytes
const NULL_BYTE_PATTERN = /\0/;

// Pattern for detecting newline characters (header injection)
const NEWLINE_PATTERN = /[\r\n]/;

// Maximum string length to prevent DoS
const MAX_STRING_LENGTH = 10000;

// Pattern for valid ZIP codes
const VALID_ZIP_PATTERN = /^\d{5}(?:-\d{4})?$/;

/**
 * Validates an ID field (buildingID, unitID, modelID) for security issues
 */
export function validateId(id: string, fieldName: string): string | null {
    if(!id || typeof id !== 'string') {
        return `${fieldName} is required`;
    }

    // Check for null bytes
    if(NULL_BYTE_PATTERN.test(id)) {
        return `${fieldName} contains invalid characters`;
    }

    // Check for newlines (header injection)
    if(NEWLINE_PATTERN.test(id)) {
        return `${fieldName} contains invalid characters`;
    }

    // Check for path traversal
    if(PATH_TRAVERSAL_PATTERN.test(id)) {
        return `${fieldName} contains invalid characters`;
    }

    // Check for valid pattern
    if(!VALID_ID_PATTERN.test(id)) {
        return `${fieldName} can only contain letters, numbers, underscores, and hyphens`;
    }

    // Check length
    if(id.length > 255) {
        return `${fieldName} is too long`;
    }

    return null;
}

/**
 * Sanitizes HTML to prevent XSS attacks
 */
export function sanitizeHtml(text: string): string {
    if(!text || !_.isString(text)) {
        return text;
    }

    // Preserve CDATA sections as they're meant to contain literal character data
    // Store CDATA sections temporarily
    const cdataPlaceholder = '___CDATA_PLACEHOLDER___';
    const cdataSections: string[] = [];
    let cdataIndex = 0;

    // Extract and replace CDATA sections with placeholders
    let processedText = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (match) => {
        cdataSections[cdataIndex] = match;
        return `${cdataPlaceholder}${cdataIndex++}`;
    });

    // Only remove dangerous tags and attributes, preserve other content
    processedText = processedText
        // Remove script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove other dangerous tags but keep their content
        .replace(/<\s*(iframe|embed|object|applet|form|input|button|textarea|select|option|optgroup|fieldset|label|output|keygen|datalist|script|style|link|meta|base)\b[^>]*>/gi, '')
        .replace(/<\/\s*(iframe|embed|object|applet|form|input|button|textarea|select|option|optgroup|fieldset|label|output|keygen|datalist|script|style|link|meta|base)\s*>/gi, '')
        // Remove event handlers
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
        // Remove javascript: protocol
        .replace(/javascript:/gi, '')
        // Remove data: protocol in certain contexts
        .replace(/data:text\/html/gi, '')
        .replace(/vbscript:/gi, '');

    // Restore CDATA sections
    processedText = processedText.replace(new RegExp(`${cdataPlaceholder}(\\d+)`, 'g'), (match, index) => {
        return cdataSections[parseInt(index)] || '';
    });

    return processedText;
}

/**
 * Validates and sanitizes text fields
 */
export function validateTextField(text: string | undefined, fieldName: string, required = false): { value: string | undefined, error: string | null } {
    if(!text) {
        return {
            value: text,
            error: required ? `${fieldName} is required` : null
        };
    }

    if(typeof text !== 'string') {
        return {
            value: undefined,
            error: `${fieldName} must be a string`
        };
    }

    // Check length
    if(text.length > MAX_STRING_LENGTH) {
        return {
            value: undefined,
            error: `${fieldName} is too long (max ${MAX_STRING_LENGTH} characters)`
        };
    }

    // Sanitize HTML
    const sanitized = sanitizeHtml(text);

    return {
        value: sanitized,
        error: null
    };
}

/**
 * Validates a path for path traversal attempts
 */
export function validatePath(path: string): boolean {
    if(!path || typeof path !== 'string') {
        return false;
    }

    // Check for path traversal patterns
    if(PATH_TRAVERSAL_PATTERN.test(path)) {
        return false;
    }

    // Check for null bytes
    if(NULL_BYTE_PATTERN.test(path)) {
        return false;
    }

    // Check for absolute paths
    if(path.startsWith('/') || path.match(/^[a-z]:\\/i)) {
        return false;
    }

    return true;
}

/**
 * Validates ZIP code format
 */
export function validateZipCode(zip: string): boolean {
    return VALID_ZIP_PATTERN.test(zip);
}

/**
 * Validates numeric values are within safe bounds
 */
export function validateNumericValue(value: number | undefined, fieldName: string, min?: number, max?: number): string | null {
    if(value === undefined) {
        return null;
    }

    if(typeof value !== 'number' || !Number.isFinite(value)) {
        return `${fieldName} must be a valid number`;
    }

    if(value > Number.MAX_SAFE_INTEGER) {
        return `${fieldName} is too large`;
    }

    if(min !== undefined && value < min) {
        return `${fieldName} must be at least ${min}`;
    }

    if(max !== undefined && value > max) {
        return `${fieldName} must be at most ${max}`;
    }

    return null;
}

/**
 * Validates array size to prevent DoS
 */
export function validateArraySize(array: unknown[], fieldName: string, maxSize = 100): string | null {
    if(!Array.isArray(array)) {
        return null;
    }

    if(array.length > maxSize) {
        return `${fieldName} has too many items (max ${maxSize})`;
    }

    return null;
}

/**
 * Sanitizes an object by removing prototype pollution attempts
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const cleaned = {} as T;

    for(const key in obj) {
        // Skip prototype pollution keys
        if(key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue;
        }

        // Skip if not own property
        if(!Object.prototype.hasOwnProperty.call(obj, key)) {
            continue;
        }

        cleaned[key] = obj[key];
    }

    return cleaned;
}
