import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getUnitTypes, getUnitType, createUnitType, updateUnitType, deleteUnitType } from '../data/unitTypes';
import { UnitTypeData } from '../src/types/index';
import { forEach, trim } from 'lodash';
import { sanitizeObject } from './security-validation';
import { UnitTypeInput } from './validation/unitTypeSchema';
import { validateForSave } from './validation/helpers';
import { logger } from '@hughescr/logger';
import {
    validateSingleId,
    createSuccessResponse,
    createNotFoundResponse,
    createNoContentResponse
} from './shared/request-handlers';

// Legacy validation functions removed - now using Zod schemas in ./validation/

export const list = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    // Validate required path parameters - don't default to empty string
    const buildingID = evt.pathParameters?.buildingID;
    if(!buildingID) {
        return {
            statusCode: 400,
            body:       JSON.stringify({ error: 'Missing required path parameter: buildingID' })
        };
    }

    const validation = validateSingleId(buildingID, 'buildingID');
    if(!validation.valid) {
        return {
            statusCode: 400,
            body:       JSON.stringify({ error: 'Invalid buildingID format' })
        };
    }

    return createSuccessResponse(await getUnitTypes(buildingID));
};

export const get = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    // Validate required path parameters - don't default to empty string
    const buildingID = evt.pathParameters?.buildingID;
    const modelID = evt.pathParameters?.modelID;

    if(!buildingID || !modelID) {
        const missingParams = trim(`${!buildingID ? 'buildingID' : ''} ${!modelID ? 'modelID' : ''}`);
        return {
            statusCode: 400,
            body:       JSON.stringify({
                error: `Missing required path parameter(s): ${missingParams}`
            })
        };
    }

    const buildingValidation = validateSingleId(buildingID, 'buildingID');
    const modelValidation = validateSingleId(modelID, 'modelID');

    if(!buildingValidation.valid || !modelValidation.valid) {
        return {
            statusCode: 400,
            body:       JSON.stringify({ error: 'Invalid ID format' })
        };
    }

    const unitType = await getUnitType(buildingID, modelID);
    return unitType ? createSuccessResponse(unitType) : createNotFoundResponse();
};

export const create = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    // Validate building ID from path parameters - don't default to empty string
    const buildingID = evt.pathParameters?.buildingID;
    if(!buildingID) {
        return {
            statusCode: 400,
            body:       JSON.stringify({ error: 'Missing required path parameter: buildingID' })
        };
    }

    const buildingIdValidation = validateSingleId(buildingID, 'buildingID');
    if(!buildingIdValidation.valid) {
        return buildingIdValidation.response!;
    }

    // Validate request body is present before parsing
    if(!evt.body || trim(evt.body) === '') {
        return {
            statusCode: 400,
            body:       JSON.stringify({ error: 'Request body is required' })
        };
    }

    // Parse request body
    let rawData: Record<string, unknown>;
    try {
        rawData = JSON.parse(evt.body) as Record<string, unknown>;
    } catch (parseError) {
        logger.warn('Failed to parse unit type creation request body', {
            error:      parseError,
            context:    'unit type creation request parsing',
            httpMethod: evt.requestContext.http.method,
            buildingID
        });
        return {
            statusCode: 400,
            body:       JSON.stringify({ error: 'Invalid request body' }),
        };
    }

    const data: Record<string, unknown> = sanitizeObject(rawData);

    // Add building ID from path parameters to data for validation
    const dataWithBuildingId: Record<string, unknown> = {
        ...data,
        buildingID
    };

    // Now validate the complete data including building ID
    const validation = validateForSave('unitType', dataWithBuildingId);
    if(!validation.success) {
        const errors: Record<string, string> = {};
        forEach(validation.errors, (err) => {
            errors[err.field] = err.message;
        });
        return {
            statusCode: 400,
            body:       JSON.stringify({ error: 'Validation failed', errors }),
        };
    }

    const unitTypeData = validation.data as UnitTypeInput;

    // Check if unit type already exists
    const existing = await getUnitType(unitTypeData.buildingID, unitTypeData.modelID);
    if(existing) {
        return { statusCode: 409, body: JSON.stringify({ error: 'Unit type already exists' }) };
    }

    const newUnitType = await createUnitType(unitTypeData as UnitTypeData);
    return createSuccessResponse(newUnitType, 201);
};

export const update = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    // Validate required path parameters - don't default to empty string
    const buildingID = evt.pathParameters?.buildingID;
    const modelID = evt.pathParameters?.modelID;

    if(!buildingID || !modelID) {
        const missingParams = trim(`${!buildingID ? 'buildingID' : ''} ${!modelID ? 'modelID' : ''}`);
        return {
            statusCode: 400,
            body:       JSON.stringify({
                error: `Missing required path parameter(s): ${missingParams}`
            })
        };
    }

    const buildingValidation = validateSingleId(buildingID, 'buildingID');
    const modelValidation = validateSingleId(modelID, 'modelID');

    if(!buildingValidation.valid || !modelValidation.valid) {
        return {
            statusCode: 400,
            body:       JSON.stringify({ error: 'Invalid ID format' })
        };
    }

    // Validate request body is present before parsing
    if(!evt.body || trim(evt.body) === '') {
        return {
            statusCode: 400,
            body:       JSON.stringify({ error: 'Request body is required' })
        };
    }

    // Parse request body
    let rawData: Record<string, unknown>;
    try {
        rawData = JSON.parse(evt.body) as Record<string, unknown>;
    } catch (parseError) {
        logger.warn('Failed to parse unit type update request body', {
            error:      parseError,
            context:    'unit type update request parsing',
            httpMethod: evt.requestContext.http.method,
            buildingID,
            modelID
        });
        return {
            statusCode: 400,
            body:       JSON.stringify({ error: 'Invalid request body' }),
        };
    }

    const data: Record<string, unknown> = sanitizeObject(rawData);

    // Add URL parameters to data for validation (required for draft schema)
    const dataWithIds: Record<string, unknown> = {
        ...data,
        buildingID,
        modelID
    };

    const validation = validateForSave('unitType', dataWithIds);
    if(!validation.success) {
        const errors: Record<string, string> = {};
        forEach(validation.errors, (err) => {
            errors[err.field] = err.message;
        });
        return {
            statusCode: 400,
            body:       JSON.stringify({ error: 'Validation failed', errors }),
        };
    }

    // Ensure IDs match URL parameters (security check)
    const unitTypeData = {
        ...validation.data as UnitTypeInput,
        buildingID,
        modelID
    } as Partial<UnitTypeData>;

    const updatedUnitType = await updateUnitType(buildingID, modelID, unitTypeData);
    return updatedUnitType ? createSuccessResponse(updatedUnitType) : createNotFoundResponse();
};

export const del = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    // Validate required path parameters - don't default to empty string
    const buildingID = evt.pathParameters?.buildingID;
    const modelID = evt.pathParameters?.modelID;

    if(!buildingID || !modelID) {
        const missingParams = trim(`${!buildingID ? 'buildingID' : ''} ${!modelID ? 'modelID' : ''}`);
        return {
            statusCode: 400,
            body:       JSON.stringify({
                error: `Missing required path parameter(s): ${missingParams}`
            })
        };
    }

    const buildingValidation = validateSingleId(buildingID, 'buildingID');
    const modelValidation = validateSingleId(modelID, 'modelID');

    if(!buildingValidation.valid || !modelValidation.valid) {
        return {
            statusCode: 400,
            body:       JSON.stringify({ error: 'Invalid ID format' })
        };
    }

    const success = await deleteUnitType(buildingID, modelID);
    return success ? createNoContentResponse() : createNotFoundResponse();
};
