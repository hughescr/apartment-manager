import { includes, isArray, isNumber, isString, replace, startsWith, toLower } from 'lodash';
import { isValidBuildingId } from '../src/utils/index.js';

/**
 * Security validation functions for API input sanitization
 */

// Pattern for valid IDs - alphanumeric plus hyphens and underscores only
const VALID_ID_PATTERN = /^[\w-]+$/;

// Pattern for detecting path traversal attempts
const PATH_TRAVERSAL_PATTERN = /\.\.|\/\//;

// Pattern for detecting null bytes
const _NULL_BYTE_PATTERN = /\0/;

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
    if(!id || !isString(id)) {
        return `${fieldName} is required`;
    }

    // Special validation for building IDs (using short-uuid format)
    if(includes(toLower(fieldName), 'building')) {
        if(!isValidBuildingId(id)) {
            return `${fieldName} must be a valid building ID`;
        }
        return null;
    }

    // Check for null bytes
    if(id.includes('\0')) {
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
    if(!text || !isString(text)) {
        return text;
    }

    // Preserve CDATA sections as they're meant to contain literal character data
    // Store CDATA sections temporarily
    const cdataPlaceholder = '___CDATA_PLACEHOLDER___';
    const cdataSections: string[] = [];
    let cdataIndex = 0;

    // Extract and replace CDATA sections with placeholders
    let processedText = replace(text, /<!\[CDATA\[([\s\S]*?)\]\]>/g, (match) => {
        cdataSections[cdataIndex] = match;
        return `${cdataPlaceholder}${cdataIndex++}`;
    });

    // Only remove dangerous tags and attributes, preserve other content
    processedText = replace(processedText,
        // Remove script tags and their content
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    processedText = replace(processedText,
        // Remove other dangerous tags but keep their content
        /<\s*(iframe|embed|object|applet|form|input|button|textarea|select|option|optgroup|fieldset|label|output|keygen|datalist|script|style|link|meta|base)\b[^>]*>/gi, '');
    processedText = replace(processedText,
        /<\/\s*(iframe|embed|object|applet|form|input|button|textarea|select|option|optgroup|fieldset|label|output|keygen|datalist|script|style|link|meta|base)\s*>/gi, '');
    processedText = replace(processedText,
        // Remove event handlers
        /on\w+\s*=\s*["'][^"']*["']/gi, '');
    processedText = replace(processedText,
        /on\w+\s*=\s*[^\s>]*/gi, '');
    processedText = replace(processedText,
        // Remove javascript: protocol
        /javascript:/gi, '');
    processedText = replace(processedText,
        // Remove data: protocol in certain contexts
        /data:text\/html/gi, '');
    processedText = replace(processedText,
        /vbscript:/gi, '');

    // Restore CDATA sections
    processedText = replace(processedText, new RegExp(`${cdataPlaceholder}(\\d+)`, 'g'), (_match: string, index: string) => {
        const numericIndex = parseInt(index, 10);
        return cdataSections[numericIndex] ?? '';
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

    if(!isString(text)) {
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
    if(!path || !isString(path)) {
        return false;
    }

    // Decode URL-encoded characters to catch encoded path traversal attempts
    let decodedPath: string;
    try {
        decodedPath = decodeURIComponent(path);
    } catch{
        // Invalid URL encoding is suspicious
        return false;
    }

    // Check both original and decoded paths for path traversal patterns
    if(PATH_TRAVERSAL_PATTERN.test(path) || PATH_TRAVERSAL_PATTERN.test(decodedPath)) {
        return false;
    }

    // Check both original and decoded paths for null bytes
    if(path.includes('\0') || decodedPath.includes('\0')) {
        return false;
    }

    // Check both original and decoded paths for absolute paths
    if(startsWith(path, '/') || (/^[a-z]:\\/i.exec(path))
      || startsWith(decodedPath, '/') || (/^[a-z]:\\/i.exec(decodedPath))) {
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

    if(!isNumber(value) || !Number.isFinite(value)) {
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
    if(!isArray(array)) {
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
