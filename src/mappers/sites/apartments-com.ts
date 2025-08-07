import _ from 'lodash';
import type {
    SiteMapper,
    MappedBuilding,
    MappedUnitType,
    MappedUnit,
    ValidationResult,
    MappingContext,
    UnitMappingContext,
    FieldMappingConfig
} from '../types.js';
import type {
    BuildingData,
    UnitTypeData,
    UnitData,
    PropertyType,
    UtilityType,
    PetType,
    ParkingType
} from '../../types/index.js';
import { AmenityCategory } from '../../types/index.js';
import { inheritanceResolver } from '../inheritance-resolver.js';
import {
    createEnumTransformer,
    createDateFormatter,
    transformAmenities,
    transformFees,
    transformPhotoUrls,
    categorizeFees
} from '../transformers/index.js';
// import fieldMappingsV2 from '../field-mappings-v2.json'; // Reserved for future field mapping features

/** Enhanced deposit structure with refundability and partial refund options */
interface Deposit {
    amount: number
    refundable?: boolean
    partialRefundPercentage?: number
}

/**
 * Helper function to extract deposit amount from both legacy number and enhanced object formats
 */
function getDepositAmount(deposit: number | Deposit | undefined): number | undefined {
    if(deposit === undefined || deposit === null) {
        return undefined;
    }
    if(_.isNumber(deposit)) {
        return deposit;
    }
    if(_.isObject(deposit) && 'amount' in deposit) {
        return (deposit as Deposit).amount;
    }
    return undefined;
}

/**
 * Apartments.com mapper implementation.
 * Supports the three-tier hierarchy: Building → Models → Units
 */
export class ApartmentsComMapper implements SiteMapper {
    readonly siteId = 'apartments_com';
    readonly siteName = 'Apartments.com';

    constructor(_customFieldMappings?: Partial<FieldMappingConfig>) {
        // Field mappings parameter kept for future extensibility
    }

    /**
     * Map building data to Apartments.com format.
     */
    mapBuilding(building: BuildingData, _context?: MappingContext): MappedBuilding {
        const propertyTypeTransformer = createEnumTransformer<PropertyType>(
            'propertyType',
            this.siteId
        );

        const { oneTime, monthly, deposits } = categorizeFees(
            building.oneTimeFees,
            building.monthlyFees
        );

        // Transform utilities to a simple map
        const utilities: Record<string, boolean> = {};
        if(building.utilitiesIncluded) {
            for(const [utilityType, included] of Object.entries(building.utilitiesIncluded)) {
                const utilityTransformer = createEnumTransformer<UtilityType>(
                    'utilityType',
                    this.siteId
                );
                const mappedName = utilityTransformer(utilityType as UtilityType);
                utilities[mappedName] = included;
            }
        }

        return {
            externalId: building.buildingID,
            name: building.buildingID, // Could be enhanced with a display name
            address: {
                street: building.street || '',
                city: building.city || '',
                state: building.state || '',
                zip: building.zip || ''
            },
            propertyType: building.propertyType
                ? propertyTypeTransformer(building.propertyType)
                : 'Apartment',
            yearBuilt: building.yearBuilt,
            totalUnits: building.totalUnits,
            description: building.propertyDescription || building.description,
            photos: transformPhotoUrls(building.photos, this.siteId),
            leaseTerms: {
                minMonths: building.leaseLength,
                maxMonths: building.leaseLength,
                defaultMonths: building.leaseLength || 12
            },
            fees: [
                ...transformFees(oneTime, this.siteId),
                ...transformFees(monthly, this.siteId),
                ...transformFees(deposits, this.siteId)
            ],
            utilities,
            parking: this.transformParking(building),
            petPolicy: this.transformPetPolicy(building),
            amenities: transformAmenities(building.propertyAmenities, this.siteId),
            contactInfo: building.contactInfo,
            tourOptions: building.tourAvailability,
            applicationFee: building.applicationFee,
            rentSpecials: building.rentSpecials,
            incomeRestrictions: building.incomeRestrictions,
            screeningCriteria: building.screeningCriteria
        };
    }

    /**
     * Map unit type (model) data to Apartments.com format.
     */
    mapUnitType(
        unitType: UnitTypeData,
        _building: BuildingData,
        _context?: MappingContext
    ): MappedUnitType {
        const dateFormatter = createDateFormatter('MM/DD/YYYY');

        return {
            externalId: unitType.modelID,
            modelName: unitType.modelName,
            beds: unitType.beds,
            baths: unitType.baths,
            sqft: {
                min: unitType.minSqft,
                max: unitType.maxSqft
            },
            rent: {
                min: unitType.minRent,
                max: unitType.maxRent
            },
            deposit: getDepositAmount(unitType.deposit),
            maxOccupants: unitType.maxOccupants,
            countAvailable: unitType.countAvailable,
            dateAvailable: dateFormatter(unitType.dateAvailable),
            amenities: transformAmenities(unitType.modelAmenities, this.siteId),
            photos: [] // Models typically don't have their own photos
        };
    }

    /**
     * Map unit data to Apartments.com format.
     */
    mapUnit(unitContext: UnitMappingContext): MappedUnit {
        const { unit, unitType, building } = unitContext;

        // Resolve inheritance
        const resolved = inheritanceResolver.resolveUnitValues(unit, unitType, building);

        const dateFormatter = createDateFormatter('MM/DD/YYYY');

        // Merge amenities with inheritance
        const mergedAmenities = inheritanceResolver.mergeAmenities(
            resolved.unitAmenities,
            unitType?.modelAmenities,
            building.propertyAmenities
        );

        return {
            externalId: unit.unitID,
            unitNumber: unit.unitNumber || unit.unitID,
            modelName: unitType?.modelName,
            beds: resolved.beds || 0,
            baths: resolved.baths || 0,
            sqft: resolved.sqft,
            rent: resolved.rent || 0,
            deposit: getDepositAmount(resolved.deposit),
            dateAvailable: dateFormatter(resolved.availableDate),
            description: resolved.unitDescription || resolved.description,
            maxOccupants: resolved.maxOccupants,
            leaseTerms: {
                minMonths: resolved.minLeaseTerm,
                maxMonths: resolved.maxLeaseTerm
            },
            amenities: transformAmenities(mergedAmenities, this.siteId, AmenityCategory.UNIT),
            photos: transformPhotoUrls(resolved.photos, this.siteId),
            rentSpecial: resolved.unitRentSpecial
        };
    }

    /**
     * Validate building data for Apartments.com requirements.
     */
    validateBuilding(building: BuildingData): ValidationResult {
        const errors: { field: string, message: string }[] = [];

        if(!building.street) {
            errors.push({ field: 'street', message: 'Street address is required' });
        }
        if(!building.city) {
            errors.push({ field: 'city', message: 'City is required' });
        }
        if(!building.state) {
            errors.push({ field: 'state', message: 'State is required' });
        }
        if(!building.zip) {
            errors.push({ field: 'zip', message: 'ZIP code is required' });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate unit type data for Apartments.com requirements.
     */
    validateUnitType(unitType: UnitTypeData): ValidationResult {
        const errors: { field: string, message: string }[] = [];

        if(!unitType.modelName) {
            errors.push({ field: 'modelName', message: 'Model name is required' });
        }
        if(unitType.beds === undefined) {
            errors.push({ field: 'beds', message: 'Number of beds is required' });
        }
        if(unitType.baths === undefined) {
            errors.push({ field: 'baths', message: 'Number of baths is required' });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate unit data for Apartments.com requirements.
     */
    validateUnit(unit: UnitData): ValidationResult {
        const errors: { field: string, message: string }[] = [];

        if(!unit.unitNumber && !unit.unitID) {
            errors.push({ field: 'unitNumber', message: 'Unit number is required' });
        }

        // Most other fields can be inherited, so not strictly required on the unit

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Transform parking options for Apartments.com.
     * @private
     */
    private transformParking(building: BuildingData): {
        type: string
        included: boolean
        fee?: number
        description?: string
    }[] {
        if(!building.parkingOptions || building.parkingOptions.length === 0) {
            return [];
        }

        const parkingTransformer = createEnumTransformer<ParkingType>(
            'parkingType',
            this.siteId
        );

        return _.map(building.parkingOptions, option => ({
            type: parkingTransformer(option.type),
            included: option.included,
            fee: option.fee,
            description: option.description
        }));
    }

    /**
     * Transform pet policy for Apartments.com.
     * @private
     */
    private transformPetPolicy(building: BuildingData): {
        allowed: boolean
        types?: string[]
        maxCount?: number
        weightLimit?: number
        deposit?: number
        monthlyFee?: number
        restrictions?: string
    } | undefined {
        if(!building.petPolicies) {
            return undefined;
        }

        const policy = building.petPolicies;

        if(!policy.allowed) {
            return {
                allowed: false,
                restrictions: 'No pets allowed'
            };
        }

        const petTransformer = createEnumTransformer<PetType>(
            'petType',
            this.siteId
        );

        return {
            allowed: true,
            types: policy.types ? _.map(policy.types, (type: PetType) => petTransformer(type)) : undefined,
            maxCount: policy.maxCount,
            weightLimit: policy.weightLimit,
            deposit: policy.deposit,
            monthlyFee: policy.monthlyFee,
            restrictions: policy.notes
        };
    }
}
