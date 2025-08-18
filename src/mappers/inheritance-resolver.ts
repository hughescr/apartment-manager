import { defaults, isArray, isString, trim } from 'lodash';
import type { InheritanceResolver as IInheritanceResolver } from './types.js';
import type {
    UnitData,
    UnitTypeData,
    BuildingData,
    Amenity,
    Fee
} from '../types/index.js';

/**
 * Default implementation of the inheritance resolver.
 * Handles the hierarchy: Building → Model (UnitType) → Unit
 */
export class InheritanceResolver implements IInheritanceResolver {
    /**
     * Resolve unit values by applying inheritance from model and building.
     * Unit values take precedence, then model, then building.
     * @param unit The unit data
     * @param unitType Optional unit type (model) data
     * @param building Optional building data
     * @returns Resolved unit data with inherited values
     */
    resolveUnitValues(
        unit: UnitData,
        unitType?: UnitTypeData,
        building?: BuildingData
    ): UnitData {
        const resolved: UnitData = { ...unit };

        // Inherit from unit type (model) first
        if(unitType) {
            this.inheritFromUnitType(resolved, unit, unitType);
        }

        // Then inherit from building
        if(building) {
            this.inheritFromBuilding(resolved, building);
        }

        return resolved;
    }

    /**
     * Apply inheritance from unit type to unit.
     * @private
     */
    private inheritFromUnitType(
        resolved: UnitData,
        unit: UnitData,
        unitType: UnitTypeData
    ): void {
        // Basic fields - preserve null values as intentional overrides
        resolved.beds = unit.beds !== undefined ? unit.beds : unitType.beds;
        resolved.baths = unit.baths !== undefined ? unit.baths : unitType.baths;

        // Square footage - use unit's specific value or model's min
        resolved.sqft = unit.sqft !== undefined ? unit.sqft : unitType.minSqft;

        // Rent - use unit's specific value or model's min
        resolved.rent = unit.rent !== undefined ? unit.rent : unitType.minRent;

        // Occupancy
        resolved.maxOccupants = unit.maxOccupants !== undefined ? unit.maxOccupants : unitType.maxOccupants;
        resolved.perPersonRent = unit.perPersonRent !== undefined ? unit.perPersonRent : unitType.perPersonRent;

        // Deposit
        resolved.deposit = unit.deposit !== undefined ? unit.deposit : unitType.deposit;

        // Lease terms
        resolved.minLeaseTerm = unit.minLeaseTerm !== undefined ? unit.minLeaseTerm : unitType.minLeaseTerm;
        resolved.maxLeaseTerm = unit.maxLeaseTerm !== undefined ? unit.maxLeaseTerm : unitType.maxLeaseTerm;

        // Amenities - handle null as intentional override to "no amenities"
        if(unit.unitAmenities !== undefined) {
            resolved.unitAmenities = unit.unitAmenities;
        } else if(unitType.modelAmenities) {
            resolved.unitAmenities = unitType.modelAmenities;
        }
    }

    /**
     * Apply inheritance from building to unit.
     * @private
     */
    private inheritFromBuilding(
        resolved: UnitData,
        building: BuildingData
    ): void {
        // Lease terms from building if not set by unit or model
        resolved.minLeaseTerm = resolved.minLeaseTerm !== undefined ? resolved.minLeaseTerm : building.leaseLength;
        resolved.maxLeaseTerm = resolved.maxLeaseTerm !== undefined ? resolved.maxLeaseTerm : building.leaseLength;

        // Photos - only inherit if photos is undefined (null means intentional override to no photos)
        if(resolved.photos === undefined) {
            resolved.photos = building.photos;
        }
    }

    /**
     * Merge amenities from multiple sources.
     * Later sources override earlier ones for the same amenity name.
     * @param unitAmenities Unit-specific amenities (highest priority)
     * @param modelAmenities Model default amenities
     * @param buildingAmenities Building amenities (lowest priority)
     * @returns Merged amenities
     */
    mergeAmenities(
        unitAmenities?: Amenity[],
        modelAmenities?: Amenity[],
        buildingAmenities?: Amenity[]
    ): Amenity[] {
        const amenityMap = new Map<string, Amenity>();

        // Add in order of precedence (lowest to highest)
        const sources = [buildingAmenities, modelAmenities, unitAmenities];

        for(const source of sources) {
            if(source) {
                for(const amenity of source) {
                    if(amenity && amenity.name) {
                        amenityMap.set(amenity.name, amenity);
                    }
                }
            }
        }

        return Array.from(amenityMap.values());
    }

    /**
     * Resolve fees from building and unit sources.
     * @param unitFees Unit-specific fees
     * @param buildingOneTimeFees Building one-time fees
     * @param buildingMonthlyFees Building monthly fees
     * @returns Combined fees
     */
    resolveFees(
        unitFees?: Fee[],
        buildingOneTimeFees?: Fee[],
        buildingMonthlyFees?: Fee[]
    ): Fee[] {
        // Start with building fees
        const allFees: Fee[] = [
            ...(buildingOneTimeFees || []),
            ...(buildingMonthlyFees || [])
        ];

        // Add unit-specific fees
        if(unitFees) {
            allFees.push(...unitFees);
        }

        // Remove duplicates by fee type, with later entries taking precedence
        const feeMap = new Map<string, Fee>();
        for(const fee of allFees) {
            feeMap.set(fee.type, fee);
        }

        return Array.from(feeMap.values());
    }

    /**
     * Create a flattened unit data for sites that don't support models.
     * @param unit The unit data
     * @param unitType Optional unit type data
     * @param building The building data
     * @returns Flattened unit data
     */
    flattenForSingleTier(
        unit: UnitData,
        unitType?: UnitTypeData,
        building?: BuildingData
    ): UnitData {
        // First resolve all inherited values
        const resolved = this.resolveUnitValues(unit, unitType, building);

        // Add building-level information directly to the unit
        if(building) {
            // Merge description
            if(building.propertyDescription && !resolved.unitDescription) {
                resolved.unitDescription = building.propertyDescription;
            }

            // Ensure all necessary fields are populated
            if(!resolved.availableDate && building.propertyType) {
                // If no specific date, unit is available now
                resolved.availableDate = new Date().toISOString();
            }
        }

        return resolved;
    }

    /**
     * Check if a unit has all required fields for a site.
     * @param unit The unit data
     * @param requiredFields Array of required field names
     * @returns Object indicating if valid and which fields are missing
     */
    validateRequiredFields(
        unit: UnitData,
        requiredFields: (keyof UnitData)[]
    ): { isValid: boolean, missingFields: string[] } {
        const missingFields: string[] = [];

        for(const field of requiredFields) {
            const value = unit[field];
            if(value === undefined || value === null ||
              (isString(value) && trim(value) === '') ||
              (isArray(value) && value.length === 0)) {
                missingFields.push(field);
            }
        }

        return {
            isValid: missingFields.length === 0,
            missingFields
        };
    }

    /**
     * Apply defaults to a unit based on site requirements.
     * @param unit The unit data
     * @param defaults Object with default values
     * @returns Unit with defaults applied
     */
    applyDefaults<T extends Partial<UnitData>>(
        unit: T,
        defaultValues: Partial<T>
    ): T {
        return defaults({}, unit, defaultValues) as T;
    }
}

// Export a singleton instance
export const inheritanceResolver = new InheritanceResolver();
