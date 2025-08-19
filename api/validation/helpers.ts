/**
 * Validation Helper Functions
 *
 * Bridge between draft and published schemas, providing utility functions
 * for validating data in different contexts and providing user-friendly
 * error messages and guidance.
 */

import { z } from 'zod';
import validator from 'validator';
import { flatMap, forEach, includes, isArray, isEmpty, isNumber, isPlainObject, isString, last, map, omit, replace, split, startCase, toLower, trim } from 'lodash';
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
    if(isEmpty(data) || (isPlainObject(data) && isEmpty(data as Record<string, unknown>))) {
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
            data: sanitizedData,  // Return sanitized data, not Zod's parsed result
            errors: []
        };
    }

    // Transform Zod errors to user-friendly format
    const errors = map(result.error.issues, (issue): ValidationError => ({
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
    const errors = map(result.error.issues, (issue): ValidationError => {
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
        const fields = flatMap(validation.errors, error =>
            map(error.issues, issue => ({
                field: issue.path,
                displayName: formatFieldDisplayName(issue.path),
                description: issue.message,
                entityType: error.type,
                required: true,
                mitsElement: getMITSElementForField(error.type, issue.path),
                index: error.index
            }))
        );

        forEach(fields, (field) => {
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
    const cleanBuilding = omit(data.building as Record<string, unknown>, [
        'photos', 'unitID', 'notes', 'roomsForRent', 'shortTermLeaseAllowed',
        'screeningCriteria', 'tourAvailability', 'incomeRestrictions',
        '_et', '_ct', '_md' // DynamoDB Toolbox metadata
    ]);

    // Unit Types: Remove database-specific fields
    const cleanUnitTypes = map(data.unitTypes, ut => omit(ut as Record<string, unknown>, [
        'unitID', '_et', '_ct', '_md'
    ]));

    // Units: Remove non-MITS fields and clean unitID
    const cleanUnits = map(data.units, (u) => {
        const unit = u as Record<string, unknown>;
        // Remove non-MITS fields
        const cleanedUnit = omit(unit, [
            'occupied', 'unitRentSpecial', 'notes', '_et', '_ct', '_md'
        ]);
        // Ensure unitID doesn't have special characters for MITS validation
        if(cleanedUnit.unitID && isString(cleanedUnit.unitID)) {
            cleanedUnit.unitID = replace(cleanedUnit.unitID, /[^\w-]/g, '-');
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
            ...flatMap(mitsValidation.errors, error =>
                map(error.issues, issue => ({
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

    return fieldMappings[fieldPath] || startCase(last(split(fieldPath, '.')) || fieldPath);
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
    if(!building?.photos || !isArray(building.photos) || building.photos.length === 0) {
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
    if(!building?.photos || !isArray(building.photos) || building.photos.length === 0) {
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
    forEach(data.units, (unit, index) => {
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

    forEach(data.units, (unit, index) => {
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

    if(!isPlainObject(data)) {
        return errors;
    }

    const obj = data as Record<string, unknown>;

    // Validate array sizes to prevent DoS attacks
    if(obj.photos && isArray(obj.photos)) {
        const arrayError = validateArraySize(obj.photos, 'photos', 50);
        if(arrayError) {
            errors.push({
                field: 'photos',
                message: arrayError,
                code: 'ARRAY_TOO_LARGE'
            });
        }
    }

    if(obj.amenities && isArray(obj.amenities)) {
        const arrayError = validateArraySize(obj.amenities, 'amenities', 100);
        if(arrayError) {
            errors.push({
                field: 'amenities',
                message: arrayError,
                code: 'ARRAY_TOO_LARGE'
            });
        }
    }

    if(obj.features && isArray(obj.features)) {
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
    forEach(nonNegativeFields, (field) => {
        if(obj[field] !== undefined && isNumber(obj[field]) && (obj[field] as number) < 0) {
            errors.push({
                field,
                message: `${startCase(field)} cannot be negative`,
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
    if(!isPlainObject(data)) {
        return data;
    }

    const obj = data as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    forEach(obj, (value, key) => {
        const sanitizedValue = sanitizeField(key, value);
        // Preserve all fields, even if empty
        if(sanitizedValue !== undefined) {
            sanitized[key] = sanitizedValue;
        }
    });

    return sanitized;
}

/**
 * Sanitize a single field based on its type and name
 */
function sanitizeField(key: string, value: unknown): unknown {
    // Handle nested objects first
    if(isPlainObject(value)) {
        const sanitized = sanitizeDataForSecurity(value);
        // Preserve nested objects even if empty
        return sanitized;
    }

    // Handle arrays
    if(isArray(value)) {
        return sanitizeArray(value);
    }

    // Handle string values based on field type
    if(isString(value)) {
        return sanitizeStringField(key, value);
    }

    // Keep other values as-is (including null, undefined, numbers, booleans)
    return value;
}

/**
 * Sanitize array values
 */
function sanitizeArray(value: unknown[]): unknown[] {
    return map(value, (item) => {
        if(isString(item)) {
            return sanitizeHtml(item);
        } else if(isPlainObject(item)) {
            return sanitizeDataForSecurity(item);
        } else {
            return item;
        }
    });
}

/**
 * Sanitize string fields based on field name
 */
function sanitizeStringField(key: string, value: string): unknown {
    // Text fields that should be sanitized for XSS
    const textFields = [
        'buildingName', 'description', 'street', 'city', 'state',
        'modelName', 'unitNumber', 'notes'
    ];

    // Handle text fields
    if(includes(textFields, key)) {
        const result = sanitizeHtml(value);
        return result;
    }

    // Handle URL fields
    if(isUrlField(key)) {
        const trimmedValue = trim(value);
        if(trimmedValue && validator.isURL(trimmedValue, {
            protocols: ['http', 'https'],
            require_protocol: false,
            require_valid_protocol: true,
            allow_query_components: true,
            allow_fragments: true
        })) {
            const result = sanitizeHtml(trimmedValue);
            return result;
        }
        // For invalid URLs, keep the sanitized value to maintain field presence
        // Empty string ensures the field exists for proper error reporting
        const result = trimmedValue ? sanitizeHtml(trimmedValue) : '';
        return result;
    }

    // Handle email fields
    if(isEmailField(key)) {
        const trimmedValue = trim(value);
        if(trimmedValue && validator.isEmail(trimmedValue)) {
            return sanitizeHtml(trimmedValue);
        }
        // Return sanitized value for validation to handle
        // This allows the schema to properly validate and return appropriate errors
        return sanitizeHtml(trimmedValue);
    }

    // Handle ZIP codes
    if(key === 'zip') {
        // Check if the ZIP code contains any suspicious characters
        // These could indicate SQL injection, XSS, or other attacks
        const suspiciousPatterns = /[;<>{}$|\\`"'\0\r\n]/;
        if(suspiciousPatterns.test(value)) {
            // Return the malicious value as-is so validation will reject it
            return value;
        }

        // For non-malicious input, clean and validate
        const cleanedZip = replace(value, /[^0-9-]/g, '');
        const zipRegex = /^\d{5}(?:-\d{4})?$/;
        if(cleanedZip && zipRegex.test(cleanedZip)) {
            return cleanedZip;
        }
        // Return original value for validation to handle
        return value;
    }

    // Default: return as-is
    return value;
}

/**
 * Check if a field name represents a URL field
 */
function isUrlField(fieldName: string): boolean {
    const lowerName = toLower(fieldName);
    return includes(lowerName, 'website') || includes(lowerName, 'url');
}

/**
 * Check if a field name represents an email field
 */
function isEmailField(fieldName: string): boolean {
    const lowerName = toLower(fieldName);
    return includes(lowerName, 'email');
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
