import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding } from '../data/buildings';
import { BuildingData } from '../src/types';
import _ from 'lodash';
import { validateId, validateTextField, sanitizeObject, validateNumericValue, validateArraySize } from './security-validation';

// Helper validation functions to reduce complexity
function validateAddress(data: Partial<BuildingData>, errors: Record<string, string>): void {
    if('street' in data && data.street !== undefined && _.trim(data.street) === '') {
        errors.street = 'Street address cannot be empty';
    }
    if('city' in data && data.city !== undefined && _.trim(data.city) === '') {
        errors.city = 'City cannot be empty';
    }
    if('state' in data && data.state !== undefined && _.trim(data.state) === '') {
        errors.state = 'State cannot be empty';
    }
    if('zip' in data && data.zip !== undefined) {
        if(_.trim(data.zip) === '') {
            errors.zip = 'ZIP code cannot be empty';
        } else if(!/^\d{5}(?:-\d{4})?$/.test(data.zip)) {
            errors.zip = 'ZIP code must be in format 12345 or 12345-6789';
        }
    }
}

function validateNumericFields(data: Partial<BuildingData>, errors: Record<string, string>): void {
    if(data.yearBuilt !== undefined) {
        const currentYear = new Date().getFullYear();
        if(data.yearBuilt < 1800 || data.yearBuilt > currentYear + 1) {
            errors.yearBuilt = `Year built must be between 1800 and ${currentYear + 1}`;
        }
    }

    if(data.numberStories !== undefined && (data.numberStories < 1 || data.numberStories > 100)) {
        errors.numberStories = 'Number of stories must be between 1 and 100';
    }

    if(data.totalUnits !== undefined && (data.totalUnits < 1 || data.totalUnits > 1000)) {
        errors.totalUnits = 'Total units must be between 1 and 1000';
    }

    if(data.leaseLength !== undefined && (data.leaseLength < 1 || data.leaseLength > 36)) {
        errors.leaseLength = 'Lease length must be between 1 and 36 months';
    }

    if(data.applicationFee !== undefined && data.applicationFee < 0) {
        errors.applicationFee = 'Application fee cannot be negative';
    }
}

function validateWebsiteUrl(url: string | undefined, fieldName: string, errors: Record<string, string>, errorKey: string): void {
    if(url && !url.match(/^https?:\/\/.+/)) {
        errors[errorKey] = `${fieldName} must start with http:// or https://`;
    }
}

function validateContactInfo(data: Partial<BuildingData>, errors: Record<string, string>): void {
    if(data.contactInfo?.email && !/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(data.contactInfo.email)) {
        errors.contactEmail = 'Invalid email address format';
    }

    if(data.contactInfo?.phone && !/^[\d\s\-().+]+$/.test(data.contactInfo.phone)) {
        errors.contactPhone = 'Invalid phone number format';
    }

    validateWebsiteUrl(data.contactInfo?.propertyWebsite, 'Website', errors, 'contactWebsite');
    validateWebsiteUrl(data.contactInfo?.managementWebsite, 'Management website', errors, 'managementWebsite');
    validateWebsiteUrl(data.tourAvailability?.tourSchedulingUrl, 'Tour scheduling URL', errors, 'tourSchedulingUrl');
}

function validateRentSpecials(data: Partial<BuildingData>, errors: Record<string, string>): void {
    if(data.rentSpecials && _.isArray(data.rentSpecials)) {
        _.forEach(data.rentSpecials, (special, index) => {
            if(!special.title || _.trim(special.title) === '') {
                errors[`rentSpecial${index}Title`] = 'Rent special title is required';
            }
            if(special.startDate && special.endDate && new Date(special.startDate) > new Date(special.endDate)) {
                errors[`rentSpecial${index}Dates`] = 'Start date must be before end date';
            }
        });
    }
}

function validateIncomeRestrictions(data: Partial<BuildingData>, errors: Record<string, string>): void {
    if(data.incomeRestrictions?.amiLimit !== undefined &&
      (data.incomeRestrictions.amiLimit < 0 || data.incomeRestrictions.amiLimit > 200)) {
        errors.amiLimit = 'AMI limit must be between 0 and 200%';
    }
}

function validateScreeningCriteria(data: Partial<BuildingData>, errors: Record<string, string>): void {
    if(data.screeningCriteria?.minCreditScore !== undefined &&
      (data.screeningCriteria.minCreditScore < 300 || data.screeningCriteria.minCreditScore > 850)) {
        errors.minCreditScore = 'Credit score must be between 300 and 850';
    }

    if(data.screeningCriteria?.incomeRatio !== undefined &&
      (data.screeningCriteria.incomeRatio < 0 || data.screeningCriteria.incomeRatio > 10)) {
        errors.incomeRatio = 'Income ratio must be between 0 and 10';
    }

    if(data.screeningCriteria?.maxOccupantsPerBedroom !== undefined &&
      (data.screeningCriteria.maxOccupantsPerBedroom < 0 || data.screeningCriteria.maxOccupantsPerBedroom > 5)) {
        errors.maxOccupantsPerBedroom = 'Max occupants per bedroom must be between 0 and 5';
    }
}

// Helper function to sanitize a single text field
function sanitizeTextField<K extends keyof BuildingData>(
    data: Partial<BuildingData>,
    field: K,
    errors: Record<string, string>,
    sanitized: Partial<BuildingData>
): void {
    const value = data[field];
    if(value !== undefined && _.isString(value)) {
        const { value: sanitizedValue, error } = validateTextField(value, field);
        if(error) {
            errors[field] = error;
        } else if(sanitizedValue !== undefined) {
            (sanitized as Record<string, unknown>)[field] = sanitizedValue;
        }
    }
}

// Helper function to sanitize text fields
function sanitizeTextFields(data: Partial<BuildingData>, errors: Record<string, string>): Partial<BuildingData> {
    const sanitized: Partial<BuildingData> = {};

    sanitizeTextField(data, 'buildingName', errors, sanitized);
    sanitizeTextField(data, 'description', errors, sanitized);
    sanitizeTextField(data, 'notes', errors, sanitized);
    sanitizeTextField(data, 'street', errors, sanitized);
    sanitizeTextField(data, 'city', errors, sanitized);
    sanitizeTextField(data, 'state', errors, sanitized);

    return sanitized;
}

// Helper function to convert string to number safely
function safeParseNumber(value: unknown): number | unknown {
    if(_.isString(value)) {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? value : parsed;
    }
    return value;
}

// Helper function to copy and validate numeric fields
function copyNumericFields(data: Partial<BuildingData>, sanitized: Partial<BuildingData>): void {
    if(data.zip !== undefined) {
        sanitized.zip = data.zip;
    }
    if(data.yearBuilt !== undefined) {
        sanitized.yearBuilt = safeParseNumber(data.yearBuilt) as number;
    }
    if(data.numberStories !== undefined) {
        sanitized.numberStories = safeParseNumber(data.numberStories) as number;
    }
    if(data.totalUnits !== undefined) {
        sanitized.totalUnits = safeParseNumber(data.totalUnits) as number;
    }
    if(data.leaseLength !== undefined) {
        sanitized.leaseLength = safeParseNumber(data.leaseLength) as number;
    }
    if(data.applicationFee !== undefined) {
        sanitized.applicationFee = safeParseNumber(data.applicationFee) as number;
    }
}

// Helper function to copy complex fields
function copyComplexFields(data: Partial<BuildingData>, sanitized: Partial<BuildingData>): void {
    if(data.contactInfo) {
        sanitized.contactInfo = data.contactInfo;
    }
    if(data.rentSpecials) {
        sanitized.rentSpecials = data.rentSpecials;
    }
    if(data.incomeRestrictions) {
        sanitized.incomeRestrictions = data.incomeRestrictions;
    }
    if(data.screeningCriteria) {
        sanitized.screeningCriteria = data.screeningCriteria;
    }
}

// Validation response types
interface ValidationResponse {
    canSave: boolean        // Can user save data?
    canPublish: boolean     // Is data ready for listing sites?
    errors: Record<string, string>    // Blocking errors (prevent save)
    warnings: Record<string, string>  // Non-blocking warnings (allow save)
    sanitizedData: Partial<BuildingData>
}

// Main validation function for building data with tier support
function validateBuildingData(
    data: Partial<BuildingData>,
    tier: 'save' | 'publish' = 'save',
    isCreate = false
): ValidationResponse {
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};
    let sanitized: Partial<BuildingData> = {};

    // ALWAYS validate and sanitize buildingID for security
    if(isCreate || data.buildingID !== undefined) {
        const idError = validateId(data.buildingID || '', 'buildingID');
        if(idError) {
            errors.buildingID = idError; // Always an error - required for save
        } else {
            sanitized.buildingID = data.buildingID;
        }
    }

    // Sanitize text fields (for security, but don't validate content)
    const textFieldData = sanitizeTextFields(data, tier === 'publish' ? errors : warnings);
    sanitized = { ...sanitized, ...textFieldData };

    // Copy other fields after validation
    copyNumericFields(data, sanitized);
    copyComplexFields(data, sanitized);

    // For SAVE tier: Only security validation, rest are warnings
    // For PUBLISH tier: All validations are errors
    const validationTarget = tier === 'publish' ? errors : warnings;

    // Run all validation checks (as warnings for save, errors for publish)
    validateAddress(sanitized, validationTarget);
    validateNumericFields(sanitized, validationTarget);
    validateContactInfo(sanitized, validationTarget);
    validateRentSpecials(sanitized, validationTarget);
    validateIncomeRestrictions(sanitized, validationTarget);
    validateScreeningCriteria(sanitized, validationTarget);

    // Additional numeric validations
    const yearError = validateNumericValue(sanitized.yearBuilt, 'yearBuilt', 1800, new Date().getFullYear() + 1);
    if(yearError) {
        validationTarget.yearBuilt = yearError;
    }

    const applicationFeeError = validateNumericValue(sanitized.applicationFee, 'applicationFee', 0, Number.MAX_SAFE_INTEGER);
    if(applicationFeeError) {
        validationTarget.applicationFee = applicationFeeError;
    }

    // Validate arrays
    if(sanitized.rentSpecials) {
        const arrayError = validateArraySize(sanitized.rentSpecials, 'rentSpecials', 50);
        if(arrayError) {
            validationTarget.rentSpecials = arrayError;
        }
    }

    // For save tier: Required fields check only for buildingID
    // For publish tier: Check all required fields
    if(tier === 'publish') {
        // Additional required field checks for publishing
        if(!sanitized.buildingName || _.trim(sanitized.buildingName) === '') {
            errors.buildingName = 'Building name is required for publishing';
        }
        if(!sanitized.street || _.trim(sanitized.street) === '') {
            errors.street = 'Street address is required for publishing';
        }
        if(!sanitized.city || _.trim(sanitized.city) === '') {
            errors.city = 'City is required for publishing';
        }
        if(!sanitized.state || _.trim(sanitized.state) === '') {
            errors.state = 'State is required for publishing';
        }
        if(!sanitized.zip || _.trim(sanitized.zip) === '') {
            errors.zip = 'ZIP code is required for publishing';
        }
    }

    return {
        canSave: _.keys(errors).length === 0, // Can save if no blocking errors
        canPublish: _.keys(errors).length === 0 && _.keys(warnings).length === 0, // Can publish if no errors or warnings
        errors,
        warnings,
        sanitizedData: sanitized
    };
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
    } catch{
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request body' }),
        };
    }

    // Sanitize object to prevent prototype pollution
    const data = sanitizeObject(rawData);

    // Use 'save' tier for permissive validation
    const validation = validateBuildingData(data, 'save', true);

    // Only block on critical errors (canSave = false)
    if(!validation.canSave) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Validation failed', errors: validation.errors }),
        };
    }

    const newBuilding = await createBuilding(validation.sanitizedData as BuildingData);
    // Ensure we return the sanitized data, not the raw response
    const responseData = {
        ...validation.sanitizedData,
        ..._.pick(newBuilding, ['created', 'modified']),
        _validationWarnings: validation.warnings // Include warnings in response
    };
    return { statusCode: 201, body: JSON.stringify(responseData) };
};

export const update = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const buildingID = evt.pathParameters?.buildingID ?? '';

    // Validate buildingID
    const idError = validateId(buildingID, 'buildingID');
    if(idError) {
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

    // Use 'save' tier for permissive validation
    const validation = validateBuildingData(data, 'save', false);

    // Only block on critical errors (canSave = false)
    if(!validation.canSave) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Validation failed', errors: validation.errors }),
        };
    }

    try {
        const updatedBuilding = await updateBuilding(buildingID, validation.sanitizedData);
        if(!updatedBuilding) {
            return { statusCode: 404, body: 'Not Found' };
        }

        // Include validation warnings in response
        const responseData = {
            ...updatedBuilding,
            _validationWarnings: validation.warnings
        };
        return { statusCode: 200, body: JSON.stringify(responseData) };
    } catch(error) {
        console.error('Error updating building:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal server error during update',
                details: error instanceof Error ? error.message : 'Unknown error'
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
