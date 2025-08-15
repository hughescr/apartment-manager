/**
 * Validation Helper Functions
 *
 * Bridge between draft and published schemas, providing utility functions
 * for validating data in different contexts and providing user-friendly
 * error messages and guidance.
 */

import { z } from 'zod';
import _ from 'lodash';
import { sanitizeHtml, validateArraySize, validateNumericValue } from '../security-validation';

// Import draft schemas (permissive)
import {
    BuildingDraftSchema,
    UnitTypeDraftSchema,
    UnitDraftSchema,
    type BuildingDraftInput,
    type UnitTypeDraftInput,
    type UnitDraftInput
} from './draft';

// Import published schemas (strict MITS)
import {
    BuildingPublishedSchema,
    UnitTypePublishedSchema,
    UnitPublishedSchema,
    validateForMITSPublication,
    type BuildingPublishedInput,
    type UnitTypePublishedInput,
    type UnitPublishedInput,
    ALL_MITS_ERROR_MESSAGES
} from './published';

/**
 * Validation result interface for consistent error handling
 */
export interface ValidationResult {
    success: boolean
    data?: unknown
    errors: ValidationError[]
}

/**
 * Detailed validation error with context
 */
export interface ValidationError {
    field: string
    message: string
    code?: string
    context?: string
}

/**
 * MITS missing field information
 */
export interface MissingMITSField {
    field: string
    displayName: string
    description: string
    entityType: 'building' | 'unitType' | 'unit'
    required: boolean
    mitsElement?: string
}

/**
 * Site publishing requirements
 */
export interface SiteRequirements {
    site: string
    canPublish: boolean
    missingFields: MissingMITSField[]
    errors: ValidationError[]
}

/**
 * Validates data for saving (draft mode) - uses permissive validation
 * Accepts building, unitType, or unit data and returns validation result
 * with clear error messages. Allows partial/incomplete data.
 *
 * @param entityType - Type of entity being validated
 * @param data - The data to validate
 * @returns ValidationResult with success status and any errors
 */
export function validateForSave(
    entityType: 'building' | 'unitType' | 'unit',
    data: unknown
): ValidationResult {
    // Validate entity type first before any other processing
    let schema: z.ZodSchema;

    switch(entityType) {
        case 'building':
            schema = BuildingDraftSchema;
            break;
        case 'unitType':
            schema = UnitTypeDraftSchema;
            break;
        case 'unit':
            schema = UnitDraftSchema;
            break;
        default:
            return {
                success: false,
                errors: [{
                    field: 'entityType',
                    message: `Unknown entity type: ${entityType}`,
                    code: 'INVALID_ENTITY_TYPE'
                }]
            };
    }

    // Handle empty update bodies - allow them to pass through after entity type validation
    if(_.isEmpty(data) || (_.isPlainObject(data) && _.isEmpty(data as Record<string, unknown>))) {
        return {
            success: true,
            data: {},
            errors: []
        };
    }

    // Apply security validations before schema validation
    const securityErrors = performSecurityValidations(data, entityType);
    if(securityErrors.length > 0) {
        return {
            success: false,
            errors: securityErrors
        };
    }

    // Sanitize text fields to prevent XSS
    const sanitizedData = sanitizeDataForSecurity(data);

    const result = schema.safeParse(sanitizedData);

    if(result.success) {
        return {
            success: true,
            data: result.data,
            errors: []
        };
    }

    // Transform Zod errors to user-friendly format
    const errors = _.map(result.error.issues, (issue): ValidationError => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
        context: `Draft validation allows incomplete data. This field has an issue but you can still save.`
    }));

    return {
        success: false,
        errors
    };
}

/**
 * Validates data for publishing - uses strict MITS schemas
 * Validates against MITS 4.1 requirements and returns detailed errors
 * explaining what's missing. Includes field-level MITS requirement explanations.
 *
 * @param entityType - Type of entity being validated
 * @param data - The data to validate
 * @returns ValidationResult with detailed MITS compliance errors
 */
export function validateForPublish(
    entityType: 'building' | 'unitType' | 'unit',
    data: unknown
): ValidationResult {
    let schema: z.ZodSchema;
    let errorMessages: Record<string, string>;

    switch(entityType) {
        case 'building':
            schema = BuildingPublishedSchema;
            errorMessages = ALL_MITS_ERROR_MESSAGES.BUILDING;
            break;
        case 'unitType':
            schema = UnitTypePublishedSchema;
            errorMessages = ALL_MITS_ERROR_MESSAGES.UNIT_TYPE;
            break;
        case 'unit':
            schema = UnitPublishedSchema;
            errorMessages = ALL_MITS_ERROR_MESSAGES.UNIT;
            break;
        default:
            return {
                success: false,
                errors: [{
                    field: 'entityType',
                    message: `Unknown entity type: ${entityType}`,
                    code: 'INVALID_ENTITY_TYPE'
                }]
            };
    }

    const result = schema.safeParse(data);

    if(result.success) {
        return {
            success: true,
            data: result.data,
            errors: []
        };
    }

    // Transform Zod errors with MITS context
    const errors = _.map(result.error.issues, (issue): ValidationError => {
        const fieldPath = issue.path.join('.');
        const mitsContext = errorMessages[fieldPath] || 'Required for MITS 4.1 compliance';

        return {
            field: fieldPath,
            message: issue.message,
            code: issue.code,
            context: `MITS Requirement: ${mitsContext}`
        };
    });

    return {
        success: false,
        errors
    };
}

/**
 * Analyzes data and returns list of missing required MITS fields
 * Helps users understand what needs to be completed for publication.
 * Groups by entity type and provides user-friendly field descriptions.
 *
 * @param data - Complete data set with building, unitTypes, and units
 * @returns Array of missing field information grouped by entity type
 */
export function getMissingMITSFields(data: {
    building: unknown
    unitTypes: unknown[]
    units: unknown[]
}): MissingMITSField[] {
    const missingFields: MissingMITSField[] = [];
    const validation = validateForMITSPublication(data);

    if(!validation.isValid) {
        const fields = _.flatMap(validation.errors, error =>
            _.map(error.issues, issue => ({
                field: issue.path,
                displayName: formatFieldDisplayName(issue.path),
                description: issue.message,
                entityType: error.type,
                required: true,
                mitsElement: getMITSElementForField(error.type, issue.path),
                index: error.index
            }))
        );

        _.forEach(fields, (field) => {
            // Add index information for unit types and units
            if(field.index !== undefined) {
                field.displayName += ` (${field.entityType === 'unitType' ? 'Unit Type' : 'Unit'} #${field.index + 1})`;
            }
            missingFields.push(field);
        });
    }

    return missingFields;
}

/**
 * Clean data for MITS validation by removing non-MITS fields
 */
function cleanDataForMITSValidation(data: {
    building: unknown
    unitTypes: unknown[]
    units: unknown[]
}): {
        building: unknown
        unitTypes: unknown[]
        units: unknown[]
    } {
    // Remove non-MITS fields that might be present in the data
    // Building: Remove database-specific and non-MITS fields
    const cleanBuilding = _.omit(data.building as Record<string, unknown>, [
        'photos', 'unitID', 'notes', 'roomsForRent', 'shortTermLeaseAllowed',
        'screeningCriteria', 'tourAvailability', 'incomeRestrictions',
        '_et', '_ct', '_md' // DynamoDB Toolbox metadata
    ]);

    // Unit Types: Remove database-specific fields
    const cleanUnitTypes = _.map(data.unitTypes, ut => _.omit(ut as Record<string, unknown>, [
        'unitID', '_et', '_ct', '_md'
    ]));

    // Units: Remove non-MITS fields and clean unitID
    const cleanUnits = _.map(data.units, (u) => {
        const unit = u as Record<string, unknown>;
        // Remove non-MITS fields
        const cleanedUnit = _.omit(unit, [
            'occupied', 'unitRentSpecial', 'notes', '_et', '_ct', '_md'
        ]);
        // Ensure unitID doesn't have special characters for MITS validation
        if(cleanedUnit.unitID && _.isString(cleanedUnit.unitID)) {
            cleanedUnit.unitID = _.replace(cleanedUnit.unitID, /[^\w-]/g, '-');
        }
        return cleanedUnit;
    });

    return {
        building: cleanBuilding,
        unitTypes: cleanUnitTypes,
        units: cleanUnits
    };
}

/**
 * Checks if data meets site-specific requirements for publication
 * Takes site name and validates against MITS requirements.
 * Returns boolean and detailed reasons if validation fails.
 *
 * @param site - Site identifier ('apartments_com', 'zillow')
 * @param data - Complete data set to validate
 * @returns Site-specific requirements and validation status
 */
export function canPublishToSite(
    site: 'apartments_com' | 'zillow',
    data: {
        building: unknown
        unitTypes: unknown[]
        units: unknown[]
    }
): SiteRequirements {
    // Clean data for MITS validation (remove non-MITS fields)
    const cleanedData = cleanDataForMITSValidation(data);

    // First check basic MITS compliance with cleaned data
    const mitsValidation = validateForMITSPublication(cleanedData);
    const missingFields = getMissingMITSFields(cleanedData);

    // Site-specific additional requirements
    const siteSpecificErrors: ValidationError[] = [];
    const siteSpecificMissing: MissingMITSField[] = [];

    if(site === 'apartments_com') {
        // Apartments.com specific requirements
        siteSpecificErrors.push(...validateApartmentsComRequirements(data));
        siteSpecificMissing.push(...getApartmentsComMissingFields(data));
    } else if(site === 'zillow') {
        // Zillow specific requirements
        siteSpecificErrors.push(...validateZillowRequirements(data));
        siteSpecificMissing.push(...getZillowMissingFields(data));
    }

    // Determine if can publish based on MITS validation and site-specific requirements
    const canPublishToSiteResult = mitsValidation.isValid && siteSpecificErrors.length === 0;

    return {
        site,
        canPublish: canPublishToSiteResult,
        missingFields: [...missingFields, ...siteSpecificMissing],
        errors: [
            ..._.flatMap(mitsValidation.errors, error =>
                _.map(error.issues, issue => ({
                    field: issue.path,
                    message: issue.message,
                    context: 'MITS 4.1 compliance requirement'
                }))
            ),
            ...siteSpecificErrors
        ]
    };
}

/**
 * Helper function to format field names for display
 */
function formatFieldDisplayName(fieldPath: string): string {
    const fieldMappings: Record<string, string> = {
        buildingID: 'Building ID',
        buildingName: 'Building Name',
        street: 'Street Address',
        city: 'City',
        state: 'State',
        zip: 'ZIP Code',
        latitude: 'Latitude',
        longitude: 'Longitude',
        'contactInfo.email': 'Contact Email',
        'contactInfo.phone': 'Contact Phone',
        propertyType: 'Property Type',
        modelID: 'Model ID',
        modelName: 'Model Name',
        beds: 'Bedrooms',
        baths: 'Bathrooms',
        unitID: 'Unit ID',
        unitNumber: 'Unit Number'
    };

    return fieldMappings[fieldPath] || _.startCase(_.last(_.split(fieldPath, '.')) || fieldPath);
}

/**
 * Helper function to get MITS element reference for a field
 */
function getMITSElementForField(entityType: string, fieldPath: string): string | undefined {
    const mitsElementMappings: Record<string, Record<string, string>> = {
        building: {
            buildingID: 'Property_ID.Identification.PropertyID',
            buildingName: 'Property_ID.Identification.PropertyName',
            street: 'Property_ID.Address.Address1',
            city: 'Property_ID.Address.City',
            state: 'Property_ID.Address.State',
            zip: 'Property_ID.Address.PostalCode',
            latitude: 'Property_ID.Location.Latitude',
            longitude: 'Property_ID.Location.Longitude',
            'contactInfo.email': 'Property_ID.Phone.PhoneNumber',
            'contactInfo.phone': 'Property_ID.Email.EmailAddress'
        },
        unitType: {
            modelID: 'FloorPlan.FloorplanID',
            modelName: 'FloorPlan.FloorplanName',
            beds: 'FloorPlan.Room.Room',
            baths: 'FloorPlan.Room.Room'
        },
        unit: {
            unitID: 'ILS_Unit.Unit',
            unitNumber: 'ILS_Unit.UnitID',
            beds: 'ILS_Unit.Room.Room',
            baths: 'ILS_Unit.Room.Room'
        }
    };

    return mitsElementMappings[entityType]?.[fieldPath];
}

/**
 * Validate Apartments.com specific requirements
 */
function validateApartmentsComRequirements(data: {
    building: unknown
    unitTypes: unknown[]
    units: unknown[]
}): ValidationError[] {
    const errors: ValidationError[] = [];

    // Apartments.com requires at least one photo for buildings
    const building = data.building as { photos?: unknown[] };
    if(!building?.photos || !_.isArray(building.photos) || building.photos.length === 0) {
        errors.push({
            field: 'building.photos',
            message: 'At least one building photo is required for Apartments.com',
            context: 'Apartments.com site requirement'
        });
    }

    return errors;
}

/**
 * Get Apartments.com specific missing fields
 */
function getApartmentsComMissingFields(data: {
    building: unknown
    unitTypes: unknown[]
    units: unknown[]
}): MissingMITSField[] {
    const missing: MissingMITSField[] = [];

    const building = data.building as { photos?: unknown[] };
    if(!building?.photos || !_.isArray(building.photos) || building.photos.length === 0) {
        missing.push({
            field: 'building.photos',
            displayName: 'Building Photos',
            description: 'At least one photo of the building exterior or common areas',
            entityType: 'building',
            required: true
        });
    }

    return missing;
}

/**
 * Validate Zillow specific requirements
 */
function validateZillowRequirements(data: {
    building: unknown
    unitTypes: unknown[]
    units: unknown[]
}): ValidationError[] {
    const errors: ValidationError[] = [];

    // Zillow requires rent information for all units
    _.forEach(data.units, (unit, index) => {
        const typedUnit = unit as { rent?: number };
        if(!typedUnit?.rent || typedUnit.rent <= 0) {
            errors.push({
                field: `units.${index}.rent`,
                message: `Rent amount is required for all units on Zillow`,
                context: 'Zillow site requirement'
            });
        }
    });

    return errors;
}

/**
 * Get Zillow specific missing fields
 */
function getZillowMissingFields(data: {
    building: unknown
    unitTypes: unknown[]
    units: unknown[]
}): MissingMITSField[] {
    const missing: MissingMITSField[] = [];

    _.forEach(data.units, (unit, index) => {
        const typedUnit = unit as { rent?: number };
        if(!typedUnit?.rent || typedUnit.rent <= 0) {
            missing.push({
                field: `units.${index}.rent`,
                displayName: `Unit #${index + 1} Rent`,
                description: 'Monthly rent amount in dollars',
                entityType: 'unit',
                required: true
            });
        }
    });

    return missing;
}

/**
 * Performs security validations on data before schema validation
 */
function performSecurityValidations(data: unknown, entityType: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if(!_.isPlainObject(data)) {
        return errors;
    }

    const obj = data as Record<string, unknown>;

    // Validate array sizes to prevent DoS attacks
    if(obj.photos && _.isArray(obj.photos)) {
        const arrayError = validateArraySize(obj.photos, 'photos', 50);
        if(arrayError) {
            errors.push({
                field: 'photos',
                message: arrayError,
                code: 'ARRAY_TOO_LARGE'
            });
        }
    }

    if(obj.amenities && _.isArray(obj.amenities)) {
        const arrayError = validateArraySize(obj.amenities, 'amenities', 100);
        if(arrayError) {
            errors.push({
                field: 'amenities',
                message: arrayError,
                code: 'ARRAY_TOO_LARGE'
            });
        }
    }

    if(obj.features && _.isArray(obj.features)) {
        const arrayError = validateArraySize(obj.features, 'features', 100);
        if(arrayError) {
            errors.push({
                field: 'features',
                message: arrayError,
                code: 'ARRAY_TOO_LARGE'
            });
        }
    }

    // Validate numeric ranges and boundary values
    if(entityType === 'building') {
        if(obj.yearBuilt !== undefined) {
            const numError = validateNumericValue(obj.yearBuilt as number, 'yearBuilt', 1800, new Date().getFullYear() + 1);
            if(numError) {
                errors.push({
                    field: 'yearBuilt',
                    message: numError,
                    code: 'INVALID_RANGE'
                });
            }
        }
    }

    // Validate negative numbers for fields that shouldn't be negative
    const nonNegativeFields = ['beds', 'baths', 'sqft', 'rent', 'deposit', 'minRent', 'maxRent'];
    _.forEach(nonNegativeFields, (field) => {
        if(obj[field] !== undefined && _.isNumber(obj[field]) && (obj[field] as number) < 0) {
            errors.push({
                field,
                message: `${_.startCase(field)} cannot be negative`,
                code: 'NEGATIVE_VALUE'
            });
        }
    });

    return errors;
}

/**
 * Sanitizes data to prevent XSS and other injection attacks
 */
function sanitizeDataForSecurity(data: unknown): unknown {
    if(!_.isPlainObject(data)) {
        return data;
    }

    const obj = data as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    // Text fields that should be sanitized for XSS
    const textFields = [
        'buildingName', 'description', 'street', 'city', 'state',
        'modelName', 'unitNumber', 'notes'
    ];

    _.forEach(obj, (value, key) => {
        if(_.includes(textFields, key) && _.isString(value)) {
            sanitized[key] = sanitizeHtml(value);
        } else if(_.isArray(value)) {
            // Sanitize array elements if they're strings
            sanitized[key] = _.map(value, item =>
                (_.isString(item) ? sanitizeHtml(item) : item)
            );
        } else {
            sanitized[key] = value;
        }
    });

    return sanitized;
}

// Export all types for external use
export type {
    BuildingDraftInput,
    UnitTypeDraftInput,
    UnitDraftInput,
    BuildingPublishedInput,
    UnitTypePublishedInput,
    UnitPublishedInput
};
