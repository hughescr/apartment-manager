import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getUnitTypes, getUnitType, createUnitType, updateUnitType, deleteUnitType } from '../data/unitTypes';
import { UnitTypeData } from '../src/types/index';
import _ from 'lodash';

// Helper validation functions to reduce complexity
function validateRequiredFields(data: Partial<UnitTypeData>, isCreate: boolean, errors: Record<string, string>): void {
    if(isCreate) {
        if(!data.modelID || _.trim(data.modelID) === '') {
            errors.modelID = 'Model ID is required';
        }
        if(!data.modelName || _.trim(data.modelName) === '') {
            errors.modelName = 'Model name is required';
        }
        if(!data.buildingID || _.trim(data.buildingID) === '') {
            errors.buildingID = 'Building ID is required';
        }
        if(data.beds === undefined) {
            errors.beds = 'Number of beds is required';
        }
        if(data.baths === undefined) {
            errors.baths = 'Number of baths is required';
        }
    }
}

function validateModelIdentifiers(data: Partial<UnitTypeData>, errors: Record<string, string>): void {
    if(data.modelID !== undefined && !data.modelID.match(/^[\w-]+$/)) {
        errors.modelID = 'Model ID can only contain letters, numbers, underscores, and hyphens';
    }

    if(data.modelName !== undefined && _.trim(data.modelName) === '') {
        errors.modelName = 'Model name cannot be empty';
    }
}

function validateRoomCounts(data: Partial<UnitTypeData>, errors: Record<string, string>): void {
    if(data.beds !== undefined && (data.beds < 0 || data.beds > 10)) {
        errors.beds = 'Number of beds must be between 0 and 10';
    }

    if(data.baths !== undefined && (data.baths < 0 || data.baths > 10)) {
        errors.baths = 'Number of baths must be between 0 and 10';
    }
}

function validateAvailability(data: Partial<UnitTypeData>, errors: Record<string, string>): void {
    if(data.countAvailable !== undefined && data.countAvailable < 0) {
        errors.countAvailable = 'Count available cannot be negative';
    }

    if(data.dateAvailable !== undefined && data.dateAvailable !== '') {
        const date = new Date(data.dateAvailable);
        if(isNaN(date.getTime())) {
            errors.dateAvailable = 'Available date must be a valid date';
        }
    }

    if(data.maxOccupants !== undefined && (data.maxOccupants < 1 || data.maxOccupants > 20)) {
        errors.maxOccupants = 'Max occupants must be between 1 and 20';
    }
}

function validateRentRanges(data: Partial<UnitTypeData>, errors: Record<string, string>): void {
    if(data.minRent !== undefined && data.minRent < 0) {
        errors.minRent = 'Min rent cannot be negative';
    }

    if(data.maxRent !== undefined && data.maxRent < 0) {
        errors.maxRent = 'Max rent cannot be negative';
    }

    if(data.minRent !== undefined && data.maxRent !== undefined &&
      data.minRent > data.maxRent) {
        errors.rentRange = 'Min rent cannot be greater than max rent';
    }

    if(data.perPersonRent !== undefined && data.perPersonRent < 0) {
        errors.perPersonRent = 'Per person rent cannot be negative';
    }
}

function validateSizeRanges(data: Partial<UnitTypeData>, errors: Record<string, string>): void {
    if(data.minSqft !== undefined && (data.minSqft < 0 || data.minSqft > 10000)) {
        errors.minSqft = 'Min square footage must be between 0 and 10000';
    }

    if(data.maxSqft !== undefined && (data.maxSqft < 0 || data.maxSqft > 10000)) {
        errors.maxSqft = 'Max square footage must be between 0 and 10000';
    }

    if(data.minSqft !== undefined && data.maxSqft !== undefined &&
      data.minSqft > data.maxSqft) {
        errors.sqftRange = 'Min square footage cannot be greater than max square footage';
    }
}

function validateLeaseTermsAndDeposit(data: Partial<UnitTypeData>, errors: Record<string, string>): void {
    if(data.deposit !== undefined && data.deposit < 0) {
        errors.deposit = 'Deposit cannot be negative';
    }

    if(data.minLeaseTerm !== undefined && (data.minLeaseTerm < 1 || data.minLeaseTerm > 36)) {
        errors.minLeaseTerm = 'Min lease term must be between 1 and 36 months';
    }

    if(data.maxLeaseTerm !== undefined && (data.maxLeaseTerm < 1 || data.maxLeaseTerm > 36)) {
        errors.maxLeaseTerm = 'Max lease term must be between 1 and 36 months';
    }

    if(data.minLeaseTerm !== undefined && data.maxLeaseTerm !== undefined &&
      data.minLeaseTerm > data.maxLeaseTerm) {
        errors.leaseTermRange = 'Min lease term cannot be greater than max lease term';
    }
}

// Main validation function for unit type data
function validateUnitTypeData(data: Partial<UnitTypeData>, isCreate = false): { isValid: boolean, errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Run all validation checks
    validateRequiredFields(data, isCreate, errors);
    validateModelIdentifiers(data, errors);
    validateRoomCounts(data, errors);
    validateAvailability(data, errors);
    validateRentRanges(data, errors);
    validateSizeRanges(data, errors);
    validateLeaseTermsAndDeposit(data, errors);

    return {
        isValid: _.keys(errors).length === 0,
        errors
    };
}

export const list = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => ({
    statusCode: 200,
    body: JSON.stringify(await getUnitTypes(evt.pathParameters?.buildingID ?? '')),
});

export const get = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const unitType = await getUnitType(evt.pathParameters?.buildingID ?? '', evt.pathParameters?.modelID ?? '');
    return unitType ? { statusCode: 200, body: JSON.stringify(unitType) } : { statusCode: 404, body: 'Not Found' };
};

export const create = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    let data;
    try {
        data = JSON.parse(evt.body || '{}');
    } catch{
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request body' }),
        };
    }

    const validation = validateUnitTypeData(data, true);

    if(!validation.isValid) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Validation failed', errors: validation.errors }),
        };
    }

    const existing = await getUnitType(data.buildingID, data.modelID);
    if(existing) {
        return { statusCode: 409, body: JSON.stringify({ error: 'Unit type already exists' }) };
    }

    const newUnitType = await createUnitType(data);
    return { statusCode: 201, body: JSON.stringify(newUnitType) };
};

export const update = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';
    const modelID = evt.pathParameters?.modelID ?? '';

    let data;
    try {
        data = JSON.parse(evt.body || '{}');
    } catch{
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request body' }),
        };
    }

    const validation = validateUnitTypeData(data, false);

    if(!validation.isValid) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Validation failed', errors: validation.errors }),
        };
    }

    const updatedUnitType = await updateUnitType(buildingID, modelID, data);
    return updatedUnitType ? { statusCode: 200, body: JSON.stringify(updatedUnitType) } : { statusCode: 404, body: 'Not Found' };
};

export const del = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const success = await deleteUnitType(evt.pathParameters?.buildingID ?? '', evt.pathParameters?.modelID ?? '');
    return success ? { statusCode: 204, body: '' } : { statusCode: 404, body: 'Not Found' };
};
