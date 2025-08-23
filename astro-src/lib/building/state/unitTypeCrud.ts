import type { UnitTypeData } from '../../../types';
import { find, findIndex, filter } from 'lodash';

export interface UnitTypeCrudOperations {
    unitTypes: UnitTypeData[]
}

/**
 * Pure CRUD operations for unit types
 * Provides data manipulation without state management or UI concerns
 */
export class UnitTypeCrud {
    /**
     * Add a new unit type to the collection
     */
    static addUnitType(unitTypes: UnitTypeData[], unitType: UnitTypeData): UnitTypeData[] {
        return [...unitTypes, unitType];
    }

    /**
     * Update an existing unit type by model ID
     */
    static updateUnitType(
        unitTypes: UnitTypeData[],
        modelID: string,
        updates: Partial<UnitTypeData>
    ): UnitTypeData[] {
        const index = findIndex(unitTypes, { modelID });

        if(index === -1) {
            return unitTypes;
        }

        const updated = [...unitTypes];
        updated[index] = {
            ...updated[index],
            ...updates,
            updatedAt: new Date()
        };

        return updated;
    }

    /**
     * Remove a unit type by model ID
     */
    static removeUnitType(unitTypes: UnitTypeData[], modelID: string): UnitTypeData[] {
        return filter(unitTypes, ut => ut.modelID !== modelID);
    }

    /**
     * Find a unit type by model ID
     */
    static findUnitType(unitTypes: UnitTypeData[], modelID: string): UnitTypeData | undefined {
        return find(unitTypes, { modelID });
    }

    /**
     * Get all unit types (returns a copy)
     */
    static getAllUnitTypes(unitTypes: UnitTypeData[]): UnitTypeData[] {
        return [...unitTypes];
    }

    /**
     * Get available unit types (with available count > 0)
     */
    static getAvailableUnitTypes(unitTypes: UnitTypeData[]): UnitTypeData[] {
        return filter(unitTypes, ut => (ut.countAvailable ?? 0) > 0);
    }

    /**
     * Create a new unit type with default values
     */
    static createNewUnitType(buildingID: string, partial: Partial<UnitTypeData> = {}): UnitTypeData {
        // Filter out null values from partial to avoid overriding undefined defaults
        const filteredPartial: Partial<UnitTypeData> = {};
        for(const [key, value] of Object.entries(partial)) {
            if(value !== null) {
                (filteredPartial as Record<string, unknown>)[key] = value;
            }
        }

        const unitType: UnitTypeData = {
            buildingID,
            modelID: '',
            modelName: '',
            beds: 1,
            baths: 1,
            minSqft: undefined,
            maxSqft: undefined,
            minRent: undefined,
            maxRent: undefined,
            countAvailable: 1,
            modelAmenities: [],
            updatedAt: new Date(),
            ...filteredPartial
        };

        // Final cleanup: remove only optional undefined values for API serialization
        // Keep required fields even if they're empty strings
        const cleanedUnitType: UnitTypeData = {
            ...unitType
        };

        // Remove only optional undefined fields that shouldn't be sent to API
        if(cleanedUnitType.minSqft === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).minSqft;
        }
        if(cleanedUnitType.maxSqft === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).maxSqft;
        }
        if(cleanedUnitType.minRent === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).minRent;
        }
        if(cleanedUnitType.maxRent === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).maxRent;
        }
        if(cleanedUnitType.countAvailable === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).countAvailable;
        }
        if(cleanedUnitType.dateAvailable === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).dateAvailable;
        }
        if(cleanedUnitType.maxOccupants === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).maxOccupants;
        }
        if(cleanedUnitType.perPersonRent === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).perPersonRent;
        }
        if(cleanedUnitType.deposit === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).deposit;
        }
        if(cleanedUnitType.minLeaseTerm === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).minLeaseTerm;
        }
        if(cleanedUnitType.maxLeaseTerm === undefined) {
            delete (cleanedUnitType as unknown as Record<string, unknown>).maxLeaseTerm;
        }

        return cleanedUnitType;
    }
}
