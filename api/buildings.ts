import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding } from '../data/buildings';
import { BuildingData } from '../src/types';
import { forEach, isArray, isError, isString } from 'lodash';
import { validateId, sanitizeObject } from './security-validation';
import { logger } from '@hughescr/logger';
import { BuildingInput } from './validation/buildingSchema';
import { validateForSave } from './validation/helpers';
import { generateBuildingId, generateBuildingName } from '../src/utils/index.js';

// Legacy validation functions removed - now using Zod schemas in ./validation/
// All validation is now handled by the Zod schemas in ./validation/

/**
 * Parse JSON strings for array fields that may come from form submissions
 * Form inputs with JSON.stringify() create nested JSON strings that need parsing
 */
function parseJsonStringFields(data: Record<string, unknown>): void {
    const arrayFields = [
        'propertyHighlights', 'propertyAmenities', 'rentSpecials',
        'oneTimeFees', 'monthlyFees', 'parkingOptions', 'storageOptions', 'photos'
    ];

    forEach(arrayFields, (field) => {
        if(field in data && isString(data[field])) {
            try {
                const parsed = JSON.parse(data[field] as string);
                // Only replace if it successfully parses to an array
                if(isArray(parsed)) {
                    data[field] = parsed;
                }
            } catch(parseError) {
                // If parsing fails, leave the field as-is
                // The validation layer will catch invalid data
                logger.debug('Failed to parse JSON string field', {
                    field,
                    value: data[field],
                    error: parseError,
                    context: 'parseJsonStringFields'
                });
            }
        }
    });
}

// Helper function to handle parsing and initial validation
function parseAndValidateInput(rawBody: string): { success: true, data: BuildingInput } | { success: false, response: APIGatewayProxyStructuredResultV2 } {
    let rawData;
    try {
        rawData = JSON.parse(rawBody || '{}');
    } catch(parseError) {
        logger.warn('Failed to parse building request body', {
            error: parseError,
            context: 'parseAndValidateInput',
            rawBody
        });
        return {
            success: false,
            response: {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid request body',
                    details: isError(parseError) ? parseError.message : 'Invalid JSON format'
                }),
            }
        };
    }

    // Sanitize object to prevent prototype pollution
    const data = sanitizeObject(rawData);

    // Parse JSON strings for array fields (handles form submissions with hidden inputs)
    parseJsonStringFields(data);

    // Use draft validation for save operations - allows incomplete data
    const validation = validateForSave('building', data);
    if(!validation.success) {
        const errors: Record<string, string> = {};
        forEach(validation.errors, (err) => {
            errors[err.field] = err.message;
        });
        return {
            success: false,
            response: {
                statusCode: 400,
                body: JSON.stringify({ error: 'Validation failed', errors }),
            }
        };
    }

    const parsed = validation.data as BuildingInput;

    return { success: true, data: parsed };
}

export const list = async (): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildings = await getBuildings();
    return {
        statusCode: 200,
        body: JSON.stringify(buildings),
    };
};

export const get = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';

    // Validate buildingID
    const idError = validateId(buildingID, 'buildingID');
    if(idError) {
        return { statusCode: 404, body: 'Not Found' };
    }

    const building = await getBuilding(buildingID);
    return building ? { statusCode: 200, body: JSON.stringify(building) } : { statusCode: 404, body: 'Not Found' };
};

export const create = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    let rawData;
    try {
        rawData = JSON.parse(evt.body || '{}');
    } catch(parseError) {
        logger.warn('Failed to parse building creation request body', {
            error: parseError,
            context: 'building creation request parsing',
            httpMethod: evt.requestContext.http.method
        });
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'Invalid request body',
                details: isError(parseError) ? parseError.message : 'Invalid JSON format'
            }),
        };
    }

    // Sanitize object to prevent prototype pollution
    const data = sanitizeObject(rawData);

    // Parse JSON strings for array fields (handles form submissions with hidden inputs)
    parseJsonStringFields(data);

    // Only auto-generate building ID if not provided
    if(!data.buildingID) {
        data.buildingID = generateBuildingId();
    }

    // Auto-generate building name from address if not provided
    if(!data.buildingName && data.street) {
        data.buildingName = generateBuildingName(data.street);
    }

    // Use draft validation for save operations - allows incomplete data
    const validation = validateForSave('building', data);
    if(!validation.success) {
        const errors: Record<string, string> = {};
        forEach(validation.errors, (err) => {
            errors[err.field] = err.message;
        });
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Validation failed', errors }),
        };
    }

    // Convert validated data to expected format
    const sanitizedData = validation.data as BuildingData;
    if(!sanitizedData.buildingName) {
        sanitizedData.buildingName = 'unknown';
    }

    const newBuilding = await createBuilding(sanitizedData as BuildingData);
    return { statusCode: 201, body: JSON.stringify({ ...newBuilding, buildingName: sanitizedData.buildingName || 'unknown' }) };
};

export const update = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';

    // Validate buildingID
    const idError = validateId(buildingID, 'buildingID');
    if(idError) {
        return { statusCode: 404, body: 'Not Found' };
    }

    // Parse and validate input
    const parseResult = parseAndValidateInput(evt.body || '{}');
    if(!parseResult.success) {
        return parseResult.response;
    }

    // Convert validated data to expected format
    const sanitizedData = parseResult.data as BuildingData;
    if(!sanitizedData.buildingName) {
        sanitizedData.buildingName = 'unknown';
    }

    try {
        const updatedBuilding = await updateBuilding(buildingID, sanitizedData);
        if(!updatedBuilding) {
            return { statusCode: 404, body: 'Not Found' };
        }
        return {
            statusCode: 200,
            body: JSON.stringify({
                ...updatedBuilding,
                buildingName: sanitizedData.buildingName || updatedBuilding.buildingName || 'unknown'
            })
        };
    } catch(error) {
        logger.error('Error updating building:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal server error during update',
                details: isError(error) ? error.message : 'Unknown error'
            })
        };
    }
};

export const del = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';

    // Validate buildingID
    const idError = validateId(buildingID, 'buildingID');
    if(idError) {
        return { statusCode: 404, body: 'Not Found' };
    }

    const success = await deleteBuilding(buildingID);
    return success ? { statusCode: 204, body: '' } : { statusCode: 404, body: 'Not Found' };
};
