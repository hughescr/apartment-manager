import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding } from '../data/buildings';
import { BuildingData } from '../src/types';
import _ from 'lodash';

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

function validateContactInfo(data: Partial<BuildingData>, errors: Record<string, string>): void {
    if(data.contactInfo?.email && !/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(data.contactInfo.email)) {
        errors.contactEmail = 'Invalid email address format';
    }

    if(data.contactInfo?.phone && !/^[\d\s\-()+.]+$/.test(data.contactInfo.phone)) {
        errors.contactPhone = 'Invalid phone number format';
    }

    if(data.contactInfo?.website && !data.contactInfo.website.match(/^https?:\/\/.+/)) {
        errors.contactWebsite = 'Website must start with http:// or https://';
    }

    if(data.tourAvailability?.tourSchedulingUrl && !data.tourAvailability.tourSchedulingUrl.match(/^https?:\/\/.+/)) {
        errors.tourSchedulingUrl = 'Tour scheduling URL must start with http:// or https://';
    }
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
      (data.screeningCriteria.maxOccupantsPerBedroom < 1 || data.screeningCriteria.maxOccupantsPerBedroom > 5)) {
        errors.maxOccupantsPerBedroom = 'Max occupants per bedroom must be between 1 and 5';
    }
}

// Main validation function for building data
function validateBuildingData(data: Partial<BuildingData>, isCreate = false): { isValid: boolean, errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Required fields for creation
    if(isCreate && (!data.buildingID || _.trim(data.buildingID) === '')) {
        errors.buildingID = 'Building ID is required';
    }

    // Run all validation checks
    validateAddress(data, errors);
    validateNumericFields(data, errors);
    validateContactInfo(data, errors);
    validateRentSpecials(data, errors);
    validateIncomeRestrictions(data, errors);
    validateScreeningCriteria(data, errors);

    return {
        isValid: _.keys(errors).length === 0,
        errors
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
    const building = await getBuilding(evt.pathParameters?.buildingID ?? '');
    return building ? { statusCode: 200, body: JSON.stringify(building) } : { statusCode: 404, body: 'Not Found' };
};

export const create = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    try {
        const data = JSON.parse(evt.body || '{}');
        const validation = validateBuildingData(data, true);

        if(!validation.isValid) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Validation failed', errors: validation.errors }),
            };
        }

        const newBuilding = await createBuilding(data);
        return { statusCode: 201, body: JSON.stringify(newBuilding) };
    } catch{
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request body' }),
        };
    }
};

export const update = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    try {
        const buildingID = evt.pathParameters?.buildingID ?? '';
        const data = JSON.parse(evt.body || '{}');
        const validation = validateBuildingData(data, false);

        if(!validation.isValid) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Validation failed', errors: validation.errors }),
            };
        }

        const updatedBuilding = await updateBuilding(buildingID, data);
        return updatedBuilding ? { statusCode: 200, body: JSON.stringify(updatedBuilding) } : { statusCode: 404, body: 'Not Found' };
    } catch{
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request body' }),
        };
    }
};

export const del = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const success = await deleteBuilding(evt.pathParameters?.buildingID ?? '');
    return success ? { statusCode: 204, body: '' } : { statusCode: 404, body: 'Not Found' };
};
