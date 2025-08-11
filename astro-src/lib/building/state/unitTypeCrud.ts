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
        return {
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
            ...partial
        };
    }
}
