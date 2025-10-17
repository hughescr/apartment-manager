import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { forEach, isError, toLower } from 'lodash';
import { validateId, sanitizeObject } from '../security-validation';
import { validateForSave } from '../validation/helpers';
import { logger } from '@hughescr/logger';

/**
 * Shared request handling utilities to eliminate duplicate validation patterns
 */

/**
 * Result type for ID validation operations
 */
export interface IdValidationResult {
    valid:     boolean
    response?: APIGatewayProxyStructuredResultV2
}

/**
 * Result type for request body parsing operations
 */
export interface ParseRequestResult<T = unknown> {
    success:   boolean
    data?:     T
    response?: APIGatewayProxyStructuredResultV2
}

/**
 * Result type for entity validation operations
 */
export interface EntityValidationResult<T = unknown> {
    success:   boolean
    data?:     T
    response?: APIGatewayProxyStructuredResultV2
}

/**
 * Validates a single ID and returns standardized error response if invalid
 * Consolidates the common pattern: validateId() + 404 response
 */
export function validateSingleId(id: string, fieldName: string): IdValidationResult {
    const idError = validateId(id, fieldName);
    if(idError) {
        return {
            valid:    false,
            response: { statusCode: 404, body: 'Not Found' }
        };
    }
    return { valid: true };
}

/**
 * Validates multiple IDs and returns standardized error response if any are invalid
 * Consolidates the common pattern used in units.ts and other handlers
 */
export function validateMultipleIds(ids: { value: string, fieldName: string }[]): IdValidationResult {
    for(const { value, fieldName } of ids) {
        const idError = validateId(value, fieldName);
        if(idError) {
            return {
                valid:    false,
                response: { statusCode: 404, body: 'Not Found' }
            };
        }
    }
    return { valid: true };
}

/**
 * Parses and validates JSON request body with standardized error handling
 * Consolidates the duplicate JSON parsing pattern across all handlers
 */
export function parseRequestBody<T = unknown>(
    body: string | null,
    context: string,
    additionalLogContext?: Record<string, unknown>,
    simpleErrorFormat = false
): ParseRequestResult<T> {
    let rawData: T;
    try {
        rawData = JSON.parse(body ?? '{}') as T;
    } catch (parseError) {
        logger.warn(`Failed to parse ${context} request body`, {
            error: parseError,
            context,
            ...additionalLogContext
        });
        return {
            success:  false,
            response: {
                statusCode: 400,
                body:       JSON.stringify(simpleErrorFormat
                    ? { error: 'Invalid request body' }
                    : {
                        error:   'Invalid request body',
                        details: isError(parseError) ? parseError.message : 'Invalid JSON format'
                    }
                ),
            }
        };
    }

    return {
        success: true,
        data:    sanitizeObject(rawData as Record<string, unknown>) as T
    };
}

/**
 * Validates entity data using the validation system and formats errors consistently
 * Consolidates the duplicate validation + error formatting pattern
 */
export function validateEntity<T = unknown>(
    entityType: 'building' | 'unit' | 'unitType',
    data: unknown
): EntityValidationResult<T> {
    const validation = validateForSave(entityType, data);
    if(!validation.success) {
        const errors: Record<string, string> = {};
        forEach(validation.errors, (err) => {
            errors[err.field] = err.message;
        });
        return {
            success:  false,
            response: {
                statusCode: 400,
                body:       JSON.stringify({ error: 'Validation failed', errors }),
            }
        };
    }

    return {
        success: true,
        data:    validation.data as T
    };
}

/**
 * Combined parsing and validation for request bodies
 * The most common pattern: parse JSON → sanitize → validate → format errors
 */
export function parseAndValidateRequest<T = unknown>(
    body: string | null,
    entityType: 'building' | 'unit' | 'unitType',
    context: string,
    additionalLogContext?: Record<string, unknown>,
    simpleErrorFormat = false
): EntityValidationResult<T> {
    // Parse request body
    const parseResult = parseRequestBody(body, context, additionalLogContext, simpleErrorFormat);
    if(!parseResult.success) {
        return {
            success:  false,
            response: parseResult.response
        };
    }

    // Validate entity
    return validateEntity<T>(entityType, parseResult.data);
}

/**
 * Standardized error response for internal server errors
 * Consolidates the error handling pattern with consistent logging
 */
export function createServerErrorResponse(
    error: unknown,
    context: string,
    additionalLogContext?: Record<string, unknown>
): APIGatewayProxyStructuredResultV2 {
    logger.error(`${context} error`, {
        error,
        context,
        ...additionalLogContext
    });

    return {
        statusCode: 500,
        body:       JSON.stringify({
            error:   `Internal server error during ${toLower(context)}`,
            details: isError(error) ? error.message : 'Unknown error'
        })
    };
}

/**
 * Helper to create standardized success responses
 */
export function createSuccessResponse(data: unknown, statusCode = 200): APIGatewayProxyStructuredResultV2 {
    return {
        statusCode,
        body: JSON.stringify(data)
    };
}

/**
 * Helper to create standardized not found responses
 */
export function createNotFoundResponse(): APIGatewayProxyStructuredResultV2 {
    return {
        statusCode: 404,
        body:       'Not Found'
    };
}

/**
 * Helper to create standardized no content responses (for deletes)
 */
export function createNoContentResponse(): APIGatewayProxyStructuredResultV2 {
    return {
        statusCode: 204,
        body:       ''
    };
}

/**
 * Helper to validate path parameters and extract IDs
 * Common pattern for handlers that need buildingID, unitID, etc. from path
 */
export function extractAndValidatePathIds(
    pathParameters: Record<string, string | undefined> | undefined,
    requiredIds: string[]
): { success: true, ids: Record<string, string> } | { success: false, response: APIGatewayProxyStructuredResultV2 } {
    const ids: Record<string, string> = {};
    const idsToValidate: { value: string, fieldName: string }[] = [];

    // Extract IDs from path parameters
    for(const idName of requiredIds) {
        const value = pathParameters?.[idName] ?? '';
        ids[idName] = value;
        idsToValidate.push({ value, fieldName: idName });
    }

    // Validate all IDs
    const validationResult = validateMultipleIds(idsToValidate);
    if(!validationResult.valid) {
        return {
            success:  false,
            response: validationResult.response!
        };
    }

    return { success: true, ids };
}
