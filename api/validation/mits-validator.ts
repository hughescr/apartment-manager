/**
 * MITS Validation Functions
 *
 * Provides MITS 4.1 compliance validation, missing field analysis,
 * and site-specific publishing requirements.
 */

import { flatMap, forEach, isArray, isString, last, map, omit, replace, split, startCase } from 'lodash';
import { validateForMITSPublication } from './published';
import { MissingMITSField, ValidationError, SiteRequirements } from './types';

/**
 * Analyzes data and returns list of missing required MITS fields
 * Helps users understand what needs to be completed for publication.
 * Groups by entity type and provides user-friendly field descriptions.
 *
 * @param data - Complete data set with building, unitTypes, and units
 * @returns Array of missing field information grouped by entity type
 */
export function getMissingMITSFields(data: {
    building:  unknown
    unitTypes: unknown[]
    units:     unknown[]
}): MissingMITSField[] {
    const missingFields: MissingMITSField[] = [];
    const validation = validateForMITSPublication(data);

    if(!validation.isValid) {
        const fields = flatMap(validation.errors, error =>
            map(error.issues, issue => ({
                field:       issue.path,
                displayName: formatFieldDisplayName(issue.path),
                description: issue.message,
                entityType:  error.type,
                required:    true,
                mitsElement: getMITSElementForField(error.type, issue.path),
                index:       error.index
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
    building:  unknown
    unitTypes: unknown[]
    units:     unknown[]
}): {
    building:  unknown
    unitTypes: unknown[]
    units:     unknown[]
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
        building:  cleanBuilding,
        unitTypes: cleanUnitTypes,
        units:     cleanUnits
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
        building:  unknown
        unitTypes: unknown[]
        units:     unknown[]
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
        canPublish:    canPublishToSiteResult,
        missingFields: [...missingFields, ...siteSpecificMissing],
        errors:        [
            ...flatMap(mitsValidation.errors, error =>
                map(error.issues, issue => ({
                    field:   issue.path,
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
        buildingID:          'Building ID',
        buildingName:        'Building Name',
        street:              'Street Address',
        city:                'City',
        state:               'State',
        zip:                 'ZIP Code',
        latitude:            'Latitude',
        longitude:           'Longitude',
        'contactInfo.email': 'Contact Email',
        'contactInfo.phone': 'Contact Phone',
        propertyType:        'Property Type',
        modelID:             'Model ID',
        modelName:           'Model Name',
        beds:                'Bedrooms',
        baths:               'Bathrooms',
        unitID:              'Unit ID',
        unitNumber:          'Unit Number'
    };

    return fieldMappings[fieldPath] || startCase(last(split(fieldPath, '.')) || fieldPath);
}

/**
 * Helper function to get MITS element reference for a field
 */
function getMITSElementForField(entityType: string, fieldPath: string): string | undefined {
    const mitsElementMappings: Record<string, Record<string, string>> = {
        building: {
            buildingID:          'Property_ID.Identification.PropertyID',
            buildingName:        'Property_ID.Identification.PropertyName',
            street:              'Property_ID.Address.Address1',
            city:                'Property_ID.Address.City',
            state:               'Property_ID.Address.State',
            zip:                 'Property_ID.Address.PostalCode',
            latitude:            'Property_ID.Location.Latitude',
            longitude:           'Property_ID.Location.Longitude',
            'contactInfo.email': 'Property_ID.Phone.PhoneNumber',
            'contactInfo.phone': 'Property_ID.Email.EmailAddress'
        },
        unitType: {
            modelID:   'FloorPlan.FloorplanID',
            modelName: 'FloorPlan.FloorplanName',
            beds:      'FloorPlan.Room.Room',
            baths:     'FloorPlan.Room.Room'
        },
        unit: {
            unitID:     'ILS_Unit.Unit',
            unitNumber: 'ILS_Unit.UnitID',
            beds:       'ILS_Unit.Room.Room',
            baths:      'ILS_Unit.Room.Room'
        }
    };

    return mitsElementMappings[entityType]?.[fieldPath];
}

/**
 * Validate Apartments.com specific requirements
 */
function validateApartmentsComRequirements(data: {
    building:  unknown
    unitTypes: unknown[]
    units:     unknown[]
}): ValidationError[] {
    const errors: ValidationError[] = [];

    // Apartments.com requires at least one photo for buildings
    const building = data.building as { photos?: unknown[] };
    if(!building?.photos || !isArray(building.photos) || building.photos.length === 0) {
        errors.push({
            field:   'building.photos',
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
    building:  unknown
    unitTypes: unknown[]
    units:     unknown[]
}): MissingMITSField[] {
    const missing: MissingMITSField[] = [];

    const building = data.building as { photos?: unknown[] };
    if(!building?.photos || !isArray(building.photos) || building.photos.length === 0) {
        missing.push({
            field:       'building.photos',
            displayName: 'Building Photos',
            description: 'At least one photo of the building exterior or common areas',
            entityType:  'building',
            required:    true
        });
    }

    return missing;
}

/**
 * Validate Zillow specific requirements
 */
function validateZillowRequirements(data: {
    building:  unknown
    unitTypes: unknown[]
    units:     unknown[]
}): ValidationError[] {
    const errors: ValidationError[] = [];

    // Zillow requires rent information for all units
    forEach(data.units, (unit, index) => {
        const typedUnit = unit as { rent?: number };
        if(!typedUnit?.rent || typedUnit.rent <= 0) {
            errors.push({
                field:   `units.${index}.rent`,
                message: 'Rent amount is required for all units on Zillow',
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
    building:  unknown
    unitTypes: unknown[]
    units:     unknown[]
}): MissingMITSField[] {
    const missing: MissingMITSField[] = [];

    forEach(data.units, (unit, index) => {
        const typedUnit = unit as { rent?: number };
        if(!typedUnit?.rent || typedUnit.rent <= 0) {
            missing.push({
                field:       `units.${index}.rent`,
                displayName: `Unit #${index + 1} Rent`,
                description: 'Monthly rent amount in dollars',
                entityType:  'unit',
                required:    true
            });
        }
    });

    return missing;
}
