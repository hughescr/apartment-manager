import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getUnits, getUnit, createUnit, updateUnit, deleteUnit } from '../data/units';
import { UnitData } from '../src/types/index';
import _ from 'lodash';

// Helper validation functions to reduce complexity
function validateRequiredFields(data: Partial<UnitData>, isCreate: boolean, errors: Record<string, string>): void {
    if(isCreate) {
        if(!data.unitID || _.trim(data.unitID) === '') {
            errors.unitID = 'Unit ID is required';
        }
        if(!data.buildingID || _.trim(data.buildingID) === '') {
            errors.buildingID = 'Building ID is required';
        }
    }
}

function validateRoomCounts(data: Partial<UnitData>, errors: Record<string, string>): void {
    if(data.beds !== undefined && (data.beds < 0 || data.beds > 10)) {
        errors.beds = 'Number of beds must be between 0 and 10';
    }

    if(data.baths !== undefined && (data.baths < 0 || data.baths > 10)) {
        errors.baths = 'Number of baths must be between 0 and 10';
    }
}

function validateSpaceAndOccupancy(data: Partial<UnitData>, errors: Record<string, string>): void {
    if(data.sqft !== undefined && (data.sqft < 0 || data.sqft > 10000)) {
        errors.sqft = 'Square footage must be between 0 and 10000';
    }

    if(data.maxOccupants !== undefined && (data.maxOccupants < 1 || data.maxOccupants > 20)) {
        errors.maxOccupants = 'Max occupants must be between 1 and 20';
    }
}

function validateFinancialFields(data: Partial<UnitData>, errors: Record<string, string>): void {
    if(data.rent !== undefined && data.rent < 0) {
        errors.rent = 'Rent cannot be negative';
    }

    if(data.perPersonRent !== undefined && data.perPersonRent < 0) {
        errors.perPersonRent = 'Per person rent cannot be negative';
    }

    if(data.deposit !== undefined && data.deposit < 0) {
        errors.deposit = 'Deposit cannot be negative';
    }
}

function validateLeaseTerms(data: Partial<UnitData>, errors: Record<string, string>): void {
    if(data.minLeaseTerm !== undefined && (data.minLeaseTerm < 1 || data.minLeaseTerm > 36)) {
        errors.minLeaseTerm = 'Min lease term must be between 1 and 36 months';
    }

    if(data.maxLeaseTerm !== undefined && (data.maxLeaseTerm < 1 || data.maxLeaseTerm > 36)) {
        errors.maxLeaseTerm = 'Max lease term must be between 1 and 36 months';
    }

    if(data.minLeaseTerm !== undefined && data.maxLeaseTerm !== undefined &&
      data.minLeaseTerm > data.maxLeaseTerm) {
        errors.leaseTerms = 'Min lease term cannot be greater than max lease term';
    }
}

function validateDates(data: Partial<UnitData>, errors: Record<string, string>): void {
    if(data.availableDate !== undefined && data.availableDate !== '') {
        const date = new Date(data.availableDate);
        if(isNaN(date.getTime())) {
            errors.availableDate = 'Available date must be a valid date';
        }
    }
}

function validateModelReference(data: Partial<UnitData>, errors: Record<string, string>): void {
    if(data.modelID !== undefined && data.modelID !== '' && !data.modelID.match(/^[\w-]+$/)) {
        errors.modelID = 'Model ID can only contain letters, numbers, underscores, and hyphens';
    }
}

function validatePhotos(data: Partial<UnitData>, errors: Record<string, string>): void {
    if(data.photos && _.isArray(data.photos)) {
        _.forEach(data.photos, (photo, index) => {
            if(!_.isString(photo) || _.trim(photo) === '') {
                errors[`photo${index}`] = 'Photo URL cannot be empty';
            } else if(!photo.match(/^https?:\/\/.+/)) {
                errors[`photo${index}`] = 'Photo URL must start with http:// or https://';
            }
        });
    }
}

// Main validation function for unit data
function validateUnitData(data: Partial<UnitData>, isCreate = false): { isValid: boolean, errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Run all validation checks
    validateRequiredFields(data, isCreate, errors);
    validateRoomCounts(data, errors);
    validateSpaceAndOccupancy(data, errors);
    validateFinancialFields(data, errors);
    validateLeaseTerms(data, errors);
    validateDates(data, errors);
    validateModelReference(data, errors);
    validatePhotos(data, errors);

    return {
        isValid: _.keys(errors).length === 0,
        errors
    };
}

export const list = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => ({
    statusCode: 200,
    body: JSON.stringify(await getUnits(evt.pathParameters?.buildingID ?? '')),
});

export const get = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const unit = await getUnit(evt.pathParameters?.buildingID ?? '', evt.pathParameters?.unitID ?? '');
    return unit ? { statusCode: 200, body: JSON.stringify(unit) } : { statusCode: 404, body: 'Not Found' };
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

    const validation = validateUnitData(data, true);

    if(!validation.isValid) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Validation failed', errors: validation.errors }),
        };
    }

    const newUnit = await createUnit(data);
    return { statusCode: 201, body: JSON.stringify(newUnit) };
};

export const update = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';
    const unitID = evt.pathParameters?.unitID ?? '';

    let data;
    try {
        data = JSON.parse(evt.body || '{}');
    } catch{
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request body' }),
        };
    }

    const validation = validateUnitData(data, false);

    if(!validation.isValid) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Validation failed', errors: validation.errors }),
        };
    }

    const updatedUnit = await updateUnit(buildingID, unitID, data);
    return updatedUnit ? { statusCode: 200, body: JSON.stringify(updatedUnit) } : { statusCode: 404, body: 'Not Found' };
};

export const del = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const success = await deleteUnit(evt.pathParameters?.buildingID ?? '', evt.pathParameters?.unitID ?? '');
    return success ? { statusCode: 204, body: '' } : { statusCode: 404, body: 'Not Found' };
};
