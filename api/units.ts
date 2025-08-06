import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getUnits, getUnit, createUnit, updateUnit, deleteUnit } from '../data/units';
import { UnitData } from '../src/types/index';
import _ from 'lodash';
import { validateId, validateTextField, sanitizeObject, validateArraySize } from './security-validation';

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

// Helper function to validate and sanitize IDs
function validateAndSanitizeIds(
    data: Partial<UnitData>,
    isCreate: boolean,
    urlBuildingID: string | undefined,
    errors: Record<string, string>
): Partial<UnitData> {
    const sanitized: Partial<UnitData> = {};

    if(isCreate || data.unitID !== undefined) {
        const idError = validateId(data.unitID || '', 'unitID');
        if(idError) {
            errors.unitID = idError;
        } else {
            sanitized.unitID = data.unitID;
        }
    }

    if(isCreate || data.buildingID !== undefined || urlBuildingID) {
        // Always prefer URL parameter to prevent IDOR attacks
        const buildingID = urlBuildingID || data.buildingID || '';
        const idError = validateId(buildingID, 'buildingID');
        if(idError) {
            errors.buildingID = idError;
        } else {
            // Always use the URL buildingID if provided
            sanitized.buildingID = buildingID;
        }
    }

    return sanitized;
}

// Helper function to sanitize text and array fields
function sanitizeTextAndArrayFields(
    data: Partial<UnitData>,
    errors: Record<string, string>
): Partial<UnitData> {
    const sanitized: Partial<UnitData> = {};

    // Sanitize text fields individually for type safety
    if(data.unitNumber !== undefined) {
        const { value, error } = validateTextField(data.unitNumber, 'unitNumber');
        if(error) {
            errors.unitNumber = error;
        } else if(value !== undefined) {
            sanitized.unitNumber = value;
        }
    }

    if(data.description !== undefined) {
        const { value, error } = validateTextField(data.description, 'description');
        if(error) {
            errors.description = error;
        } else if(value !== undefined) {
            sanitized.description = value;
        }
    }

    if(data.notes !== undefined) {
        const { value, error } = validateTextField(data.notes, 'notes');
        if(error) {
            errors.notes = error;
        } else if(value !== undefined) {
            sanitized.notes = value;
        }
    }

    // Sanitize array fields with XSS prevention
    if(data.features) {
        sanitized.features = _.map(data.features, item => validateTextField(item, 'feature').value || item);
    }
    if(data.unitAmenities) {
        sanitized.unitAmenities = data.unitAmenities;
    }

    return sanitized;
}

// Helper function to copy numeric fields
function copyNumericFields(data: Partial<UnitData>, sanitized: Partial<UnitData>): void {
    if(data.beds !== undefined) {
        sanitized.beds = data.beds;
    }
    if(data.baths !== undefined) {
        sanitized.baths = data.baths;
    }
    if(data.sqft !== undefined) {
        sanitized.sqft = data.sqft;
    }
    if(data.rent !== undefined) {
        sanitized.rent = data.rent;
    }
    if(data.perPersonRent !== undefined) {
        sanitized.perPersonRent = data.perPersonRent;
    }
    if(data.deposit !== undefined) {
        sanitized.deposit = data.deposit;
    }
    if(data.minLeaseTerm !== undefined) {
        sanitized.minLeaseTerm = data.minLeaseTerm;
    }
    if(data.maxLeaseTerm !== undefined) {
        sanitized.maxLeaseTerm = data.maxLeaseTerm;
    }
    if(data.maxOccupants !== undefined) {
        sanitized.maxOccupants = data.maxOccupants;
    }
}

// Helper function to copy other fields
function copyOtherFields(data: Partial<UnitData>): Partial<UnitData> {
    const sanitized: Partial<UnitData> = {};

    copyNumericFields(data, sanitized);

    // Copy other fields
    if(data.modelID !== undefined) {
        sanitized.modelID = data.modelID;
    }
    if(data.availableDate !== undefined) {
        sanitized.availableDate = data.availableDate;
    }
    if(data.photos !== undefined) {
        sanitized.photos = data.photos;
    }
    if(data.occupied !== undefined) {
        sanitized.occupied = data.occupied;
    }
    if(data.unitDescription !== undefined) {
        sanitized.unitDescription = data.unitDescription;
    }
    if(data.unitRentSpecial !== undefined) {
        sanitized.unitRentSpecial = data.unitRentSpecial;
    }
    if(data.feedInclusion !== undefined) {
        sanitized.feedInclusion = data.feedInclusion;
    }
    if(data.manualReferences !== undefined) {
        sanitized.manualReferences = data.manualReferences;
    }
    if(data.feedLastPulled !== undefined) {
        sanitized.feedLastPulled = data.feedLastPulled;
    }
    if(data.feedLastModified !== undefined) {
        sanitized.feedLastModified = data.feedLastModified;
    }

    return sanitized;
}

// Main validation function for unit data
function validateUnitData(data: Partial<UnitData>, isCreate = false, urlBuildingID?: string): { isValid: boolean, errors: Record<string, string>, sanitizedData: Partial<UnitData> } {
    const errors: Record<string, string> = {};

    // Validate and sanitize IDs
    const idData = validateAndSanitizeIds(data, isCreate, urlBuildingID, errors);

    // Sanitize text and array fields
    const textData = sanitizeTextAndArrayFields(data, errors);

    // Copy other fields
    const otherData = copyOtherFields(data);

    // Combine all sanitized data
    const sanitized = { ...idData, ...textData, ...otherData };

    // Run all validation checks on sanitized data
    validateRequiredFields(sanitized, isCreate, errors);
    validateRoomCounts(sanitized, errors);
    validateSpaceAndOccupancy(sanitized, errors);
    validateFinancialFields(sanitized, errors);
    validateLeaseTerms(sanitized, errors);
    validateDates(sanitized, errors);
    validateModelReference(sanitized, errors);
    validatePhotos(sanitized, errors);

    // Validate arrays
    if(sanitized.features) {
        const arrayError = validateArraySize(sanitized.features, 'features', 100);
        if(arrayError) {
            errors.features = arrayError;
        }
    }
    if(sanitized.unitAmenities) {
        const arrayError = validateArraySize(sanitized.unitAmenities, 'unitAmenities', 100);
        if(arrayError) {
            errors.unitAmenities = arrayError;
        }
    }
    if(sanitized.photos) {
        const arrayError = validateArraySize(sanitized.photos, 'photos', 50);
        if(arrayError) {
            errors.photos = arrayError;
        }
    }

    return {
        isValid: _.keys(errors).length === 0,
        errors,
        sanitizedData: sanitized
    };
}

export const list = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';

    // Validate buildingID
    const idError = validateId(buildingID, 'buildingID');
    if(idError) {
        return { statusCode: 404, body: 'Not Found' };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(await getUnits(buildingID)),
    };
};

export const get = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';
    const unitID = evt.pathParameters?.unitID ?? '';

    // Validate IDs
    const buildingError = validateId(buildingID, 'buildingID');
    const unitError = validateId(unitID, 'unitID');
    if(buildingError || unitError) {
        return { statusCode: 404, body: 'Not Found' };
    }

    const unit = await getUnit(buildingID, unitID);
    return unit ? { statusCode: 200, body: JSON.stringify(unit) } : { statusCode: 404, body: 'Not Found' };
};

export const create = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    let rawData;
    try {
        rawData = JSON.parse(evt.body || '{}');
    } catch{
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request body' }),
        };
    }

    // Sanitize object to prevent prototype pollution
    const data = sanitizeObject(rawData);

    // Get buildingID from URL path
    const urlBuildingID = evt.pathParameters?.buildingID;

    const validation = validateUnitData(data, true, urlBuildingID);

    if(!validation.isValid) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Validation failed', errors: validation.errors }),
        };
    }

    const newUnit = await createUnit(validation.sanitizedData as UnitData);
    // Ensure we return the sanitized data with URL buildingID
    const responseData = {
        ...validation.sanitizedData,
        ..._.pick(newUnit, ['created', 'modified'])
    };
    return { statusCode: 201, body: JSON.stringify(responseData) };
};

export const update = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';
    const unitID = evt.pathParameters?.unitID ?? '';

    // Validate IDs
    const buildingError = validateId(buildingID, 'buildingID');
    const unitError = validateId(unitID, 'unitID');
    if(buildingError || unitError) {
        return { statusCode: 404, body: 'Not Found' };
    }

    let rawData;
    try {
        rawData = JSON.parse(evt.body || '{}');
    } catch{
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request body' }),
        };
    }

    // Sanitize object to prevent prototype pollution
    const data = sanitizeObject(rawData);

    const validation = validateUnitData(data, false, buildingID);

    if(!validation.isValid) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Validation failed', errors: validation.errors }),
        };
    }

    const updatedUnit = await updateUnit(buildingID, unitID, validation.sanitizedData);
    return updatedUnit ? { statusCode: 200, body: JSON.stringify(updatedUnit) } : { statusCode: 404, body: 'Not Found' };
};

export const del = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';
    const unitID = evt.pathParameters?.unitID ?? '';

    // Validate IDs
    const buildingError = validateId(buildingID, 'buildingID');
    const unitError = validateId(unitID, 'unitID');
    if(buildingError || unitError) {
        return { statusCode: 404, body: 'Not Found' };
    }

    const success = await deleteUnit(buildingID, unitID);
    return success ? { statusCode: 204, body: '' } : { statusCode: 404, body: 'Not Found' };
};
