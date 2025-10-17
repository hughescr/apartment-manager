import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getBuilding } from '../data/buildings';
import { getUnitTypes } from '../data/unitTypes';
import { getUnits } from '../data/units';
import type { BuildingData, UnitTypeData, UnitData } from '../src/types/index.js';
import { every, filter, isError, isObject, isString, map, omit, pick, replace, sumBy, trim } from 'lodash';
import { sanitizeObject } from './security-validation';
import { validateSingleId } from './shared/request-handlers';
import { logger } from '@hughescr/logger';
import {
    validateForPublish,
    canPublishToSite,
    getMissingMITSFields,
    ValidationResult,
    MissingMITSField,
    SiteRequirements
} from './validation/helpers';

/**
 * Request interface for validation endpoint
 */
interface ValidationRequest {
    entityType:             'building' | 'unitType' | 'unit' | 'complete'
    entityData?:            unknown
    entities?:              unknown[]
    buildingID?:            string
    includeSiteValidation?: boolean
    sites?:                 ('apartments_com' | 'zillow')[]
}

/**
 * Response interface for validation results
 */
interface ValidationResponse {
    success:           boolean
    entityType:        string
    validationResults: {
        basic:             ValidationResult
        mits?:             ValidationResult
        siteRequirements?: SiteRequirements[]
    }
    missingMITSFields?: MissingMITSField[]
    summary: {
        canSave:                boolean
        canPublish:             boolean
        canPublishToSites:      Record<string, boolean>
        totalEntitiesValidated: number
        entitiesWithErrors:     number
        totalErrors:            number
    }
}

/**
 * Response interface for batch validation results
 */
interface BatchValidationResponse {
    success:           boolean
    buildingID:        string
    totalEntities:     number
    validationResults: {
        building:  ValidationResult
        unitTypes: ValidationResult[]
        units:     ValidationResult[]
        complete:  ValidationResult
    }
    missingMITSFields: MissingMITSField[]
    siteRequirements:  SiteRequirements[]
    summary: {
        canSave:            boolean
        canPublish:         boolean
        canPublishToSites:  Record<string, boolean>
        entitiesWithErrors: number
        totalErrors:        number
    }
}

/**
 * Main validation endpoint - POST /validate-for-publish
 *
 * Accepts validation requests for single entities or complete building data.
 * Returns comprehensive validation results including MITS compliance and site requirements.
 */
export const validate = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    // Parse and validate request body
    const parseResult = parseValidationRequest(evt.body ?? null);
    if('statusCode' in parseResult) {
        return parseResult;
    }

    const request = parseResult as ValidationRequest;

    try {
        // Handle different validation modes
        if(request.entityType === 'complete' && request.buildingID) {
            // Complete building validation - fetch all data and validate
            return await validateCompleteBuilding(request);
        } else if(request.entities && request.entities.length > 0) {
            // Batch validation for multiple entities of the same type
            return await validateBatchEntities(request);
        } else if(request.entityData) {
            // Single entity validation
            return await validateSingleEntity(request);
        } else {
            return {
                statusCode: 400,
                body:       JSON.stringify({
                    error:   'Invalid request',
                    message: 'Must provide either entityData for single validation, entities array for batch validation, or buildingID for complete validation'
                })
            };
        }
    } catch (error) {
        logger.error('Validation endpoint error', { error: error as Record<string, unknown> });
        return {
            statusCode: 500,
            body:       JSON.stringify({
                error:   'Internal server error during validation',
                details: isError(error) ? error.message : 'Unknown error'
            })
        };
    }
};

/**
 * Parse and validate the request body
 */
function parseValidationRequest(body: string | null): ValidationRequest | APIGatewayProxyStructuredResultV2 {
    // Body is required - don't hide this with a fallback to empty object
    // Reject null, undefined, or empty string
    if(!body || trim(body) === '') {
        return {
            statusCode: 400,
            body:       JSON.stringify({
                error:  'Validation failed',
                errors: { body: 'Request body is required' }
            })
        };
    }

    try {
        const rawData: unknown = JSON.parse(body);
        const data = sanitizeObject(rawData as Record<string, unknown>) as unknown as ValidationRequest;

        // Validate required fields
        if(!data.entityType || !['building', 'unitType', 'unit', 'complete'].includes(data.entityType)) {
            return {
                statusCode: 400,
                body:       JSON.stringify({
                    error:  'Validation failed',
                    errors: { entityType: 'entityType must be one of: building, unitType, unit, complete' }
                })
            };
        }

        // Validate buildingID if provided using shared utility
        if(data.buildingID) {
            const validationResult = validateSingleId(data.buildingID, 'buildingID');
            if(!validationResult.valid) {
                return {
                    statusCode: 400,
                    body:       JSON.stringify({
                        error:  'Validation failed',
                        errors: { buildingID: 'Invalid buildingID format' }
                    })
                };
            }
        }

        return data;
    } catch (parseError) {
        logger.warn('Failed to parse validation request body', {
            error:   parseError as Record<string, unknown>,
            context: 'parseValidationRequest'
        });
        return {
            statusCode: 400,
            body:       JSON.stringify({
                error:   'Invalid request body',
                details: isError(parseError) ? parseError.message : 'Invalid JSON format'
            })
        };
    }
}

/**
 * Validate a single entity
 */
async function validateSingleEntity(request: ValidationRequest): Promise<APIGatewayProxyStructuredResultV2> {
    const basicValidation = validateForPublish(request.entityType as 'building' | 'unitType' | 'unit', request.entityData);
    const response: ValidationResponse = {
        success:           basicValidation.success,
        entityType:        request.entityType,
        validationResults: {
            basic: basicValidation
        },
        summary: {
            canSave:                true, // Single entities can always be saved in draft mode
            canPublish:             basicValidation.success,
            canPublishToSites:      {},
            totalEntitiesValidated: 1,
            entitiesWithErrors:     basicValidation.success ? 0 : 1,
            totalErrors:            basicValidation.errors.length
        }
    };

    // Add site validation if requested
    if(request.includeSiteValidation && request.sites) {
        response.validationResults.siteRequirements = [];
        for(const site of request.sites) {
            // For single entity validation, we can't do complete site validation
            // as sites require complete building data
            response.validationResults.siteRequirements.push({
                site,
                canPublish:    false,
                missingFields: [],
                errors:        [{
                    field:   'validation',
                    message: 'Site validation requires complete building data with all unit types and units',
                    context: 'Use complete validation mode for site-specific validation'
                }]
            });
            response.summary.canPublishToSites[site] = false;
        }
    }

    return {
        statusCode: 200,
        body:       JSON.stringify(response)
    };
}

/**
 * Validate multiple entities of the same type
 */
async function validateBatchEntities(request: ValidationRequest): Promise<APIGatewayProxyStructuredResultV2> {
    const entities = request.entities!;
    const validationResults: ValidationResult[] = [];
    let totalErrors = 0;
    let entitiesWithErrors = 0;

    // Validate each entity
    for(const entity of entities) {
        const result = validateForPublish(request.entityType as 'building' | 'unitType' | 'unit', entity);
        validationResults.push(result);
        if(!result.success) {
            entitiesWithErrors++;
            totalErrors += result.errors.length;
        }
    }

    const allSuccess = every(validationResults, 'success');

    const response = {
        success:    allSuccess,
        entityType: request.entityType,
        entities:   entities.length,
        validationResults,
        summary:    {
            canSave:                true, // Batch entities can always be saved in draft mode
            canPublish:             allSuccess,
            canPublishToSites:      {} as Record<string, boolean>,
            totalEntitiesValidated: entities.length,
            entitiesWithErrors,
            totalErrors
        }
    };

    // Note: Site validation not supported for batch mode without building context
    if(request.includeSiteValidation && request.sites) {
        for(const site of request.sites) {
            response.summary.canPublishToSites[site] = false;
        }
    }

    return {
        statusCode: 200,
        body:       JSON.stringify(response)
    };
}

/**
 * Clean entity data for validation by removing fields not in validation schemas
 */
function cleanEntityForValidation(entityType: 'building' | 'unitType' | 'unit', entity: unknown): unknown {
    if(!entity || !isObject(entity)) {
        return entity;
    }

    const data = entity as Record<string, unknown>;

    if(entityType === 'building') {
        // Remove fields that aren't in the MITS building schema
        const cleanedBuilding = pick(data, [
            'buildingID', 'buildingName', 'street', 'city', 'state', 'zip',
            'latitude', 'longitude', 'propertyType', 'structureType', 'rentalType',
            'contactInfo', 'yearBuilt', 'totalUnits', 'numberStories', 'description',
            'propertyDescription', 'applicationFee', 'leaseLength', 'acceptsOnlineApplications',
            'petPolicies', 'parkingOptions', 'storageOptions', 'propertyAmenities',
            'oneTimeFees', 'monthlyFees', 'utilitiesIncluded', 'rentSpecials', 'updatedAt'
        ]);
        return cleanedBuilding;
    } else if(entityType === 'unitType') {
        // Remove unitID which is for DynamoDB only
        return omit(data, ['unitID']);
    } else if(entityType === 'unit') {
        // Clean unitID and remove extra fields
        const cleanedUnit = pick(data, [
            'buildingID', 'unitID', 'unitNumber', 'beds', 'baths', 'sqft', 'rent',
            'vacancyClass', 'availableDate', 'vacateDate', 'madeReadyDate', 'modelID',
            'maxOccupants', 'perPersonRent', 'deposit', 'minLeaseTerm', 'maxLeaseTerm',
            'leaseOptions', 'floor', 'photos', 'amenities', 'virtualTour', 'description',
            'features', 'availableAfter', 'madeReadyOn', 'updatedAt'
        ]);
        // Clean unitID of special characters
        if(cleanedUnit.unitID && isString(cleanedUnit.unitID)) {
            cleanedUnit.unitID = replace(cleanedUnit.unitID, /[^\w-]/g, '-');
        }
        return cleanedUnit;
    }

    return entity;
}

/**
 * Validate complete building with all unit types and units
 */
async function validateCompleteBuilding(request: ValidationRequest): Promise<APIGatewayProxyStructuredResultV2> {
    const buildingID = request.buildingID!;

    // Fetch all building data
    const [building, unitTypes, units] = await Promise.all([
        getBuilding(buildingID),
        getUnitTypes(buildingID),
        getUnits(buildingID)
    ]);

    if(!building) {
        return {
            statusCode: 404,
            body:       JSON.stringify({ error: 'Building not found' })
        };
    }

    // Clean data for validation (remove non-MITS fields)
    const cleanBuilding = cleanEntityForValidation('building', building);
    const cleanUnitTypes = map(unitTypes, ut => cleanEntityForValidation('unitType', ut));
    const cleanUnits = map(units, u => cleanEntityForValidation('unit', u));

    // Validate each entity type with cleaned data
    const buildingValidation = validateForPublish('building', cleanBuilding as BuildingData);
    const unitTypeValidations = map(cleanUnitTypes, ut => validateForPublish('unitType', ut as UnitTypeData));
    const unitValidations = map(cleanUnits, u => validateForPublish('unit', u as UnitData));

    // Get missing MITS fields for complete validation using cleaned data
    const missingMITSFields = getMissingMITSFields({
        building:  cleanBuilding,
        unitTypes: cleanUnitTypes,
        units:     cleanUnits
    });

    // Perform site validations if requested
    const siteRequirements: SiteRequirements[] = [];
    const canPublishToSites: Record<string, boolean> = {};

    if(request.includeSiteValidation && request.sites) {
        for(const site of request.sites) {
            const siteReq = canPublishToSite(site, {
                building:  building,
                unitTypes: unitTypes,
                units:     units
            });
            siteRequirements.push(siteReq);
            canPublishToSites[site] = siteReq.canPublish;
        }
    }

    // Calculate summary statistics
    const allValidations = [buildingValidation, ...unitTypeValidations, ...unitValidations];
    const entitiesWithErrors = filter(allValidations, { success: false }).length;
    const totalErrors = sumBy(allValidations, 'errors.length');
    const canPublish = every(allValidations, 'success');

    const response: BatchValidationResponse = {
        success:           canPublish,
        buildingID,
        totalEntities:     1 + unitTypes.length + units.length,
        validationResults: {
            building:  buildingValidation,
            unitTypes: unitTypeValidations,
            units:     unitValidations,
            complete:  {
                success: canPublish,
                errors:  missingMITSFields.length > 0
                    ? map(missingMITSFields, field => ({
                        field:   field.field,
                        message: field.description,
                        context: `MITS requirement for ${field.entityType}`
                    }))
                    : []
            }
        },
        missingMITSFields,
        siteRequirements,
        summary: {
            canSave: true, // Can always save in draft mode
            canPublish,
            canPublishToSites,
            entitiesWithErrors,
            totalErrors
        }
    };

    return {
        statusCode: 200,
        body:       JSON.stringify(response)
    };
}
