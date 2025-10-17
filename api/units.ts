import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getUnits, getUnit, createUnit, updateUnit, deleteUnit } from '../data/units';
import { UnitData, VacancyClass } from '../src/types/index';
import { keys, pick, trim, isError } from 'lodash';
import { sanitizeObject } from './security-validation';
import {
    validateSingleId,
    validateMultipleIds,
    parseAndValidateRequest,
    createSuccessResponse,
    createNotFoundResponse,
    createNoContentResponse
} from './shared/request-handlers';
import {
    performBulkStatusUpdate,
    performBulkRentUpdate,
    validateBulkOperationParams,
    validateBulkStatusParams,
    validateBulkRentParams
} from '../data/services/bulk-operations';
import { UnitInput } from './validation/unitSchema';
import { logger } from '@hughescr/logger';

// mapZodErrors removed - now using new validation system

// parseAndValidateUnitInput removed - now using inline validation

// Removed legacy validation functions - now using Zod schemas

// Note: All validation is now handled by the draft validation system

// Note: ID validation is now handled by the draft validation system

// Note: Text sanitization is now handled by the draft validation system

// Note: Field copying is now handled by the draft validation system

// Note: Field copying is now handled by the draft validation system

// Note: Main validation is now handled by the draft validation system

export const list = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';

    // Validate buildingID using shared utility
    const validationResult = validateSingleId(buildingID, 'buildingID');
    if(!validationResult.valid) {
        return validationResult.response!;
    }

    return createSuccessResponse(await getUnits(buildingID));
};

export const get = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';
    const unitID = evt.pathParameters?.unitID ?? '';

    // Validate IDs using shared utility
    const validationResult = validateMultipleIds([
        { value: buildingID, fieldName: 'buildingID' },
        { value: unitID, fieldName: 'unitID' }
    ]);
    if(!validationResult.valid) {
        return validationResult.response!;
    }

    const unit = await getUnit(buildingID, unitID);
    return unit ? createSuccessResponse(unit) : createNotFoundResponse();
};

export const create = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    // Get buildingID from URL path for validation
    const urlBuildingID = evt.pathParameters?.buildingID;

    // Validate buildingID from URL using shared utility
    const idValidationResult = validateSingleId(urlBuildingID ?? '', 'buildingID');
    if(!idValidationResult.valid) {
        return idValidationResult.response!;
    }

    // Parse and validate input using shared utility
    const parseResult = parseAndValidateRequest(
        evt.body ?? null,
        'unit',
        'unit creation request parsing',
        { buildingID: urlBuildingID, httpMethod: evt.requestContext.http.method }
    );
    if(!parseResult.success) {
        return parseResult.response!;
    }

    // Ensure buildingID matches URL parameter (security check)
    const unitData = { ...(parseResult.data as UnitInput), buildingID: urlBuildingID } as UnitInput;

    // Additional validation: ensure unitID is provided for creation
    if(!unitData.unitID || trim(unitData.unitID) === '') {
        return {
            statusCode: 400,
            body:       JSON.stringify({
                error:  'Validation failed',
                errors: { unitID: 'Unit ID is required for creation' }
            }),
        };
    }

    const newUnit = await createUnit(unitData as UnitData);
    return createSuccessResponse({
        ...unitData,
        ...pick(newUnit, ['created', 'modified'])
    }, 201);
};

export const update = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';
    const unitID = evt.pathParameters?.unitID ?? '';

    // Validate IDs from URL parameters using shared utility
    const validationResult = validateMultipleIds([
        { value: buildingID, fieldName: 'buildingID' },
        { value: unitID, fieldName: 'unitID' }
    ]);
    if(!validationResult.valid) {
        return validationResult.response!;
    }

    // Parse and validate input using shared utility
    const parseResult = parseAndValidateRequest(
        evt.body ?? null,
        'unit',
        'unit update request parsing',
        { buildingID, unitID, httpMethod: evt.requestContext.http.method }
    );
    if(!parseResult.success) {
        return parseResult.response!;
    }

    // Ensure IDs match URL parameters (security check)
    const unitData = {
        ...(parseResult.data as UnitInput),
        buildingID,
        unitID
    } as Partial<UnitData>;

    const updatedUnit = await updateUnit(buildingID, unitID, unitData);
    return updatedUnit ? createSuccessResponse(updatedUnit) : createNotFoundResponse();
};

export const del = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';
    const unitID = evt.pathParameters?.unitID ?? '';

    // Validate IDs using shared utility
    const validationResult = validateMultipleIds([
        { value: buildingID, fieldName: 'buildingID' },
        { value: unitID, fieldName: 'unitID' }
    ]);
    if(!validationResult.valid) {
        return validationResult.response!;
    }

    const success = await deleteUnit(buildingID, unitID);
    return success ? createNoContentResponse() : createNotFoundResponse();
};

// Interface for bulk request data
interface BulkRequestData {
    unitIDs?:      string[]
    [key: string]: unknown
}

// Interface for status update request data
interface StatusUpdateData extends BulkRequestData {
    vacancyClass?: string
}

export const bulkStatusUpdate = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';

    // Validate buildingID using shared utility
    const bulkStatusValidationResult = validateSingleId(buildingID, 'buildingID');
    if(!bulkStatusValidationResult.valid) {
        return bulkStatusValidationResult.response!;
    }

    // Parse and validate request body
    const parseResult = parseBulkRequestBody(evt.body ?? null);
    if('statusCode' in parseResult) {
        return parseResult as APIGatewayProxyStructuredResultV2;
    }

    const data = parseResult as StatusUpdateData;

    // Validate bulk operation parameters
    const validationResult = validateBulkStatusOperation(buildingID, data);
    if(validationResult) {
        return validationResult;
    }

    // Perform the bulk operation
    return executeBulkStatusUpdate(buildingID, data);
};

// Helper function to parse request body
function parseBulkRequestBody(body: string | null): StatusUpdateData | APIGatewayProxyStructuredResultV2 {
    try {
        const rawData: unknown = JSON.parse(body ?? '{}');
        return sanitizeObject(rawData as Record<string, unknown>) as StatusUpdateData;
    } catch (parseError) {
        logger.warn('Failed to parse bulk status update request body', {
            error:   parseError,
            context: 'parseBulkRequestBody'
        });
        return {
            statusCode: 400,
            body:       JSON.stringify({
                error:   'Invalid request body',
                details: isError(parseError) ? parseError.message : 'Invalid JSON format'
            }),
        };
    }
}

// Helper function to validate bulk status operation
function validateBulkStatusOperation(buildingID: string, data: StatusUpdateData): APIGatewayProxyStructuredResultV2 | undefined {
    const bulkValidation = validateBulkOperationParams(buildingID, data.unitIDs ?? []);
    const statusValidation = validateBulkStatusParams(data.vacancyClass as VacancyClass);

    const errors: Record<string, string> = {};

    // Map bulk validation errors to field names
    for(const error of bulkValidation.errors) {
        if(error.includes('unit ID') || error.includes('100 units')) {
            errors.unitIDs = error;
        } else if(error.includes('Building ID')) {
            errors.buildingID = error;
        }
    }

    // Map status validation errors to field names
    for(const error of statusValidation.errors) {
        if(error.includes('Vacancy class') || error.includes('vacancy class')) {
            errors.vacancyClass = error;
        }
    }

    if(keys(errors).length > 0) {
        return {
            statusCode: 400,
            body:       JSON.stringify({
                error: 'Validation failed',
                errors
            }),
        };
    }
}

// Helper function to execute bulk status update
async function executeBulkStatusUpdate(buildingID: string, data: StatusUpdateData): Promise<APIGatewayProxyStructuredResultV2> {
    try {
        const result = await performBulkStatusUpdate({
            buildingID,
            unitIDs:      data.unitIDs!,
            vacancyClass: data.vacancyClass as VacancyClass
        });

        if(result.success) {
            return {
                statusCode: 200,
                body:       JSON.stringify({
                    message:      `Successfully updated ${result.processedUnits} units`,
                    updatedUnits: result.processedUnits
                }),
            };
        } else {
            return {
                statusCode: 207, // Multi-status - some succeeded, some failed
                body:       JSON.stringify({
                    message:      `Updated ${result.processedUnits} out of ${data.unitIDs!.length} units`,
                    updatedUnits: result.processedUnits,
                    errors:       result.errors
                }),
            };
        }
    } catch (error) {
        logger.error('Bulk status update error', {
            error,
            context:       'executeBulkStatusUpdate',
            buildingID,
            unitCount:     data.unitIDs?.length ?? 0,
            vacancyClass:  data.vacancyClass,
            operationType: 'status_update'
        });
        return {
            statusCode: 500,
            body:       JSON.stringify({
                error:   'Failed to update units',
                details: isError(error) ? error.message : 'Unknown error during bulk status update'
            }),
        };
    }
}

// Interface for rent update request data
interface RentUpdateData extends BulkRequestData {
    updateType?: string
    value?:      unknown
}

export const bulkRentUpdate = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';

    // Validate buildingID using shared utility
    const bulkRentValidationResult = validateSingleId(buildingID, 'buildingID');
    if(!bulkRentValidationResult.valid) {
        return bulkRentValidationResult.response!;
    }

    // Parse and validate request body
    const parseResult = parseRentRequestBody(evt.body ?? null);
    if('statusCode' in parseResult) {
        return parseResult as APIGatewayProxyStructuredResultV2;
    }

    const data = parseResult as RentUpdateData;

    // Validate bulk operation parameters
    const validationResult = validateBulkRentOperation(buildingID, data);
    if(validationResult) {
        return validationResult;
    }

    // Perform the bulk operation
    return executeBulkRentUpdate(buildingID, data);
};

// Helper function to parse rent request body
function parseRentRequestBody(body: string | null): RentUpdateData | APIGatewayProxyStructuredResultV2 {
    try {
        const rawData: unknown = JSON.parse(body ?? '{}');
        return sanitizeObject(rawData as Record<string, unknown>) as RentUpdateData;
    } catch (parseError) {
        logger.warn('Failed to parse bulk rent update request body', {
            error:   parseError,
            context: 'parseRentRequestBody'
        });
        return {
            statusCode: 400,
            body:       JSON.stringify({
                error:   'Invalid request body',
                details: isError(parseError) ? parseError.message : 'Invalid JSON format'
            }),
        };
    }
}

// Helper function to validate bulk rent operation
function validateBulkRentOperation(buildingID: string, data: RentUpdateData): APIGatewayProxyStructuredResultV2 | undefined {
    const bulkValidation = validateBulkOperationParams(buildingID, data.unitIDs ?? []);
    const rentValidation = validateBulkRentParams(
        data.updateType as 'absolute' | 'percentage',
        Number(data.value)
    );

    const errors: Record<string, string> = {};

    // Map bulk validation errors to field names
    for(const error of bulkValidation.errors) {
        if(error.includes('unit ID') || error.includes('100 units')) {
            errors.unitIDs = error;
        } else if(error.includes('Building ID')) {
            errors.buildingID = error;
        }
    }

    // Map rent validation errors to field names
    for(const error of rentValidation.errors) {
        if(error.includes('Update type') || error.includes('update type')) {
            errors.updateType = error;
        } else if(error.includes('Value') || error.includes('value')) {
            errors.value = error;
        }
    }

    if(keys(errors).length > 0) {
        return {
            statusCode: 400,
            body:       JSON.stringify({
                error: 'Validation failed',
                errors
            }),
        };
    }
}

// Helper function to execute bulk rent update
async function executeBulkRentUpdate(buildingID: string, data: RentUpdateData): Promise<APIGatewayProxyStructuredResultV2> {
    try {
        const result = await performBulkRentUpdate({
            buildingID,
            unitIDs:    data.unitIDs!,
            updateType: data.updateType as 'absolute' | 'percentage',
            value:      Number(data.value)
        });

        if(result.success) {
            return {
                statusCode: 200,
                body:       JSON.stringify({
                    message:      `Successfully updated rent for ${result.processedUnits} units`,
                    updatedUnits: result.processedUnits
                }),
            };
        } else {
            return {
                statusCode: 207, // Multi-status - some succeeded, some failed
                body:       JSON.stringify({
                    message:      `Updated rent for ${result.processedUnits} out of ${data.unitIDs!.length} units`,
                    updatedUnits: result.processedUnits,
                    errors:       result.errors
                }),
            };
        }
    } catch (error) {
        logger.error('Bulk rent update error', {
            error,
            context:       'executeBulkRentUpdate',
            buildingID,
            unitCount:     data.unitIDs?.length ?? 0,
            updateType:    data.updateType,
            value:         data.value,
            operationType: 'rent_update'
        });
        return {
            statusCode: 500,
            body:       JSON.stringify({
                error:   'Failed to update unit rents',
                details: isError(error) ? error.message : 'Unknown error during bulk rent update'
            }),
        };
    }
};
