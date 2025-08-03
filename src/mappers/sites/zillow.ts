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
    PetType
} from '../../types/index.js';
import { ParkingType } from '../../types/index.js';
import { inheritanceResolver } from '../inheritance-resolver.js';
import {
    createEnumTransformer,
    createDateFormatter,
    transformAmenities,
    transformFees,
    transformPhotoUrls,
    categorizeFees,
    mergeAmenities
} from '../transformers/index.js';
// import fieldMappingsV2 from '../field-mappings-v2.json'; // Reserved for future field mapping features

/**
 * Zillow Rental Manager mapper implementation.
 * Flattens the three-tier hierarchy into individual unit listings.
 */
export class ZillowMapper implements SiteMapper {
    readonly siteId = 'zillow';
    readonly siteName = 'Zillow Rental Manager';

    constructor(_customFieldMappings?: Partial<FieldMappingConfig>) {
        // Field mappings parameter kept for future extensibility
    }

    /**
     * Map building data to Zillow format.
     * Zillow doesn't have a separate building concept, so this is used
     * as a template for units.
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

        // Transform utilities to included list
        const includedUtilities: string[] = [];
        if(building.utilitiesIncluded) {
            const utilityTransformer = createEnumTransformer<UtilityType>(
                'utilityType',
                this.siteId
            );

            for(const [utilityType, included] of Object.entries(building.utilitiesIncluded)) {
                if(included) {
                    includedUtilities.push(utilityTransformer(utilityType as UtilityType));
                }
            }
        }

        return {
            externalId: building.buildingID,
            name: building.buildingID,
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
            utilities: _.zipObject(includedUtilities, _.fill(Array(includedUtilities.length), true)),
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
     * Map unit type (model) data to Zillow format.
     * Zillow doesn't support models, so this is used as a template.
     */
    mapUnitType(
        unitType: UnitTypeData,
        _building: BuildingData,
        _context?: MappingContext
    ): MappedUnitType {
        // Zillow doesn't have a concept of unit types/models
        // This data will be merged into individual units
        const dateFormatter = createDateFormatter('YYYY-MM-DD');

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
            deposit: unitType.deposit,
            maxOccupants: unitType.maxOccupants,
            countAvailable: unitType.countAvailable,
            dateAvailable: dateFormatter(unitType.dateAvailable),
            amenities: transformAmenities(unitType.modelAmenities, this.siteId),
            photos: []
        };
    }

    /**
     * Map unit data to Zillow format.
     * This is the primary mapping for Zillow as each unit is a separate listing.
     */
    mapUnit(unitContext: UnitMappingContext): MappedUnit {
        const { unit, unitType, building } = unitContext;

        // Flatten the hierarchy for Zillow
        const flattened = inheritanceResolver.flattenForSingleTier(unit, unitType, building);

        const dateFormatter = createDateFormatter('YYYY-MM-DD');

        // Get merged amenities, photos, and description
        const allAmenities = this.getAllAmenities(building, unitType, flattened);
        const allPhotos = this.getAllPhotos(flattened, building);
        const fullDescription = this.getCombinedDescription(building, flattened);

        return {
            externalId: unit.unitID,
            unitNumber: unit.unitNumber || unit.unitID,
            modelName: unitType?.modelName, // For internal tracking only
            beds: flattened.beds || 0,
            baths: flattened.baths || 0,
            sqft: flattened.sqft,
            rent: flattened.rent || 0,
            deposit: flattened.deposit,
            dateAvailable: dateFormatter(flattened.availableDate),
            description: fullDescription || `${flattened.beds} bed, ${flattened.baths} bath unit`,
            maxOccupants: flattened.maxOccupants,
            leaseTerms: {
                minMonths: flattened.minLeaseTerm || building.leaseLength,
                maxMonths: flattened.maxLeaseTerm || building.leaseLength
            },
            amenities: transformAmenities(allAmenities, this.siteId),
            photos: transformPhotoUrls(allPhotos, this.siteId),
            rentSpecial: flattened.unitRentSpecial || _.head(building.rentSpecials)
        };
    }

    /**
     * Get all amenities merged from building, unit type, and unit.
     * @private
     */
    private getAllAmenities(
        building: BuildingData,
        unitType: UnitTypeData | undefined,
        flattened: UnitData
    ) {
        return mergeAmenities(
            building.propertyAmenities,
            unitType?.modelAmenities,
            flattened.unitAmenities
        );
    }

    /**
     * Get all photos combined from unit and building.
     * @private
     */
    private getAllPhotos(flattened: UnitData, building: BuildingData) {
        return _.uniq([
            ...(flattened.photos || []),
            ...(building.photos || [])
        ]);
    }

    /**
     * Combine building and unit descriptions.
     * @private
     */
    private getCombinedDescription(building: BuildingData, flattened: UnitData): string {
        let fullDescription = '';
        if(building.propertyDescription) {
            fullDescription = building.propertyDescription;
        }
        if(flattened.unitDescription) {
            fullDescription += fullDescription ? '\n\n' + flattened.unitDescription : flattened.unitDescription;
        }
        return fullDescription;
    }

    /**
     * Validate building data for Zillow requirements.
     * Note: For Zillow, building validation is less strict as units are primary.
     */
    validateBuilding(building: BuildingData): ValidationResult {
        const errors: { field: string, message: string }[] = [];

        // Basic address validation
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
     * Validate unit type data for Zillow requirements.
     * Note: Zillow doesn't use unit types, so minimal validation.
     */
    validateUnitType(unitType: UnitTypeData): ValidationResult {
        // Zillow doesn't have unit types, so just basic validation
        const errors: { field: string, message: string }[] = [];

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
     * Validate unit data for Zillow requirements.
     * This is the primary validation for Zillow.
     */
    validateUnit(unit: UnitData): ValidationResult {
        const errors: { field: string, message: string }[] = [];

        // Zillow requires more fields on the unit since there's no model inheritance
        if(unit.beds === undefined) {
            errors.push({ field: 'beds', message: 'Number of beds is required' });
        }
        if(unit.baths === undefined) {
            errors.push({ field: 'baths', message: 'Number of baths is required' });
        }
        if(!unit.rent) {
            errors.push({ field: 'rent', message: 'Rent amount is required' });
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Transform parking options for Zillow.
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

        // Zillow typically wants a single parking type, so we'll take the best one
        const priorityOrder = [
            ParkingType.GARAGE,
            ParkingType.COVERED,
            ParkingType.UNCOVERED,
            ParkingType.STREET,
            ParkingType.NONE
        ];

        const sortedOptions = _.sortBy(building.parkingOptions, option =>
            priorityOrder.indexOf(option.type)
        );

        return _.map(sortedOptions, option => ({
            type: parkingTransformer(option.type),
            included: option.included,
            fee: option.fee,
            description: option.description
        }));
    }

    /**
     * Transform pet policy for Zillow.
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

        // Combine all pet fees for Zillow
        const totalPetFees = (policy.deposit || 0) + (policy.oneTimeFee || 0);

        return {
            allowed: true,
            types: policy.types ? _.map(policy.types, (type: PetType) => petTransformer(type)) : undefined,
            maxCount: policy.maxCount,
            weightLimit: policy.weightLimit,
            deposit: totalPetFees > 0 ? totalPetFees : undefined,
            monthlyFee: policy.monthlyFee,
            restrictions: this.formatPetRestrictions(policy)
        };
    }

    /**
     * Format pet restrictions for Zillow.
     * @private
     */
    private formatPetRestrictions(policy: BuildingData['petPolicies']): string | undefined {
        if(!policy) {
            return undefined;
        }

        const restrictions: string[] = [];

        if(policy.breedRestrictions && policy.breedRestrictions.length > 0) {
            restrictions.push(`Breed restrictions: ${policy.breedRestrictions.join(', ')}`);
        }

        if(policy.notes) {
            restrictions.push(policy.notes);
        }

        return restrictions.length > 0 ? restrictions.join('. ') : undefined;
    }
}
