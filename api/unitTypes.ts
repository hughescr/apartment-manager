import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getUnitTypes, getUnitType, createUnitType, updateUnitType, deleteUnitType } from '../data/unitTypes';
import { UnitTypeData } from '../src/types/index';
import { forEach, keys, trim } from 'lodash';
import { sanitizeObject } from './security-validation';
import { UnitTypeInput } from './validation/unitTypeSchema';
import { validateForSave } from './validation/helpers';
import { logger } from '@hughescr/logger';
import {
    validateMultipleIds,
    parseAndValidateRequest,
    createSuccessResponse,
    createNotFoundResponse,
    createNoContentResponse
} from './shared/request-handlers';

// Legacy validation functions removed - now using Zod schemas in ./validation/

export const list = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    return createSuccessResponse(await getUnitTypes(evt.pathParameters?.buildingID ?? ''));
};

export const get = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const unitType = await getUnitType(evt.pathParameters?.buildingID ?? '', evt.pathParameters?.modelID ?? '');
    return unitType ? createSuccessResponse(unitType) : createNotFoundResponse();
};

export const create = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    // Parse and validate input using shared utility
    const parseResult = parseAndValidateRequest<UnitTypeInput>(
        evt.body || null,
        'unitType',
        'unit type creation request parsing',
        { httpMethod: evt.requestContext.http.method },
        true // Use simple error format for backward compatibility
    );
    if(!parseResult.success) {
        return parseResult.response!;
    }

    const unitTypeData = parseResult.data as UnitTypeInput;

    // Additional validation: ensure required fields for creation are provided
    const errors: Record<string, string> = {};
    if(!unitTypeData?.buildingID || trim(unitTypeData.buildingID) === '') {
        errors.buildingID = 'Building ID is required for creation';
    }
    if(!unitTypeData?.modelID || trim(unitTypeData.modelID) === '') {
        errors.modelID = 'Model ID is required for creation';
    }

    if(keys(errors).length > 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Validation failed', errors }),
        };
    }

    // Check if unit type already exists
    const existing = await getUnitType(unitTypeData!.buildingID, unitTypeData!.modelID);
    if(existing) {
        return { statusCode: 409, body: JSON.stringify({ error: 'Unit type already exists' }) };
    }

    const newUnitType = await createUnitType(unitTypeData! as UnitTypeData);
    return createSuccessResponse(newUnitType, 201);
};

export const update = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';
    const modelID = evt.pathParameters?.modelID ?? '';

    // Validate IDs from URL parameters using shared utility
    const validationResult = validateMultipleIds([
        { value: buildingID, fieldName: 'buildingID' },
        { value: modelID, fieldName: 'modelID' }
    ]);
    if(!validationResult.valid) {
        return validationResult.response!;
    }

    // Parse request body (use simple parsing for backward compatibility)
    let rawData;
    try {
        rawData = JSON.parse(evt.body || '{}');
    } catch(parseError) {
        logger.warn('Failed to parse unit type update request body', {
            error: parseError,
            context: 'unit type update request parsing',
            httpMethod: evt.requestContext.http.method,
            buildingID,
            modelID
        });
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request body' }),
        };
    }

    const data = sanitizeObject(rawData);

    // Add URL parameters to data for validation (required for draft schema)
    const dataWithIds = {
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
            body: JSON.stringify({ error: 'Validation failed', errors }),
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
    const success = await deleteUnitType(evt.pathParameters?.buildingID ?? '', evt.pathParameters?.modelID ?? '');
    return success ? createNoContentResponse() : createNotFoundResponse();
};
