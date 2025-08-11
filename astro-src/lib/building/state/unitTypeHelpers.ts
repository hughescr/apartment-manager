import type { UnitTypeData } from '../../../types';
import { forEach, isString, isNumber, filter, reduce } from 'lodash';

/**
 * Utility functions for unit type operations
 * Provides statistics, sorting, and other helper functionality
 */
export class UnitTypeHelpers {
    /**
     * Get unit type statistics grouped by model ID
     */
    static getUnitTypeStats(unitTypes: UnitTypeData[]): Record<string, { count: number, avgRent: number }> {
        const stats: Record<string, { count: number, avgRent: number, totalRent: number }> = {};

        forEach(unitTypes, (unitType) => {
            if(!stats[unitType.modelID]) {
                stats[unitType.modelID] = {
                    count: 0,
                    avgRent: 0,
                    totalRent: 0
                };
            }

            stats[unitType.modelID].count++;
            const avgRent = UnitTypeHelpers.calculateAverageRent(unitType);
            if(avgRent > 0) {
                stats[unitType.modelID].totalRent += avgRent;
            }
        });

        // Calculate final averages
        const result: Record<string, { count: number, avgRent: number }> = {};
        forEach(stats, (stat, modelID) => {
            result[modelID] = {
                count: stat.count,
                avgRent: stat.count > 0 ? stat.totalRent / stat.count : 0
            };
        });

        return result;
    }

    /**
     * Sort unit types by a specific field
     */
    static sortUnitTypes(unitTypes: UnitTypeData[], field: keyof UnitTypeData, ascending = true): UnitTypeData[] {
        const sorted = [...unitTypes];

        sorted.sort((a, b) => {
            const aValue = a[field];
            const bValue = b[field];

            if(aValue == null && bValue == null) {
                return 0;
            }
            if(aValue == null) {
                return ascending ? 1 : -1;
            }
            if(bValue == null) {
                return ascending ? -1 : 1;
            }

            if(isString(aValue) && isString(bValue)) {
                return ascending
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            if(isNumber(aValue) && isNumber(bValue)) {
                return ascending ? aValue - bValue : bValue - aValue;
            }

            return 0;
        });

        return sorted;
    }

    /**
     * Calculate average rent for a unit type
     */
    static calculateAverageRent(unitType: UnitTypeData): number {
        if(unitType.minRent && unitType.maxRent) {
            return (unitType.minRent + unitType.maxRent) / 2;
        }
        return unitType.minRent || unitType.maxRent || 0;
    }

    /**
     * Get unit types grouped by bedroom count
     */
    static groupUnitTypesByBedrooms(unitTypes: UnitTypeData[]): Record<number, UnitTypeData[]> {
        const grouped: Record<number, UnitTypeData[]> = {};

        forEach(unitTypes, (unitType) => {
            const beds = unitType.beds || 0;
            if(!grouped[beds]) {
                grouped[beds] = [];
            }
            grouped[beds].push(unitType);
        });

        return grouped;
    }

    /**
     * Get unit types within a rent range
     */
    static getUnitTypesInRentRange(
        unitTypes: UnitTypeData[],
        minRent: number,
        maxRent: number
    ): UnitTypeData[] {
        return filter(unitTypes, (unitType) => {
            const avgRent = UnitTypeHelpers.calculateAverageRent(unitType);
            return avgRent >= minRent && avgRent <= maxRent;
        });
    }

    /**
     * Get unit types within a size range
     */
    static getUnitTypesInSizeRange(
        unitTypes: UnitTypeData[],
        minSqft: number,
        maxSqft: number
    ): UnitTypeData[] {
        return filter(unitTypes, (unitType) => {
            const avgSqft = UnitTypeHelpers.calculateAverageSqft(unitType);
            return avgSqft >= minSqft && avgSqft <= maxSqft;
        });
    }

    /**
     * Calculate average square footage for a unit type
     */
    static calculateAverageSqft(unitType: UnitTypeData): number {
        if(unitType.minSqft && unitType.maxSqft) {
            return (unitType.minSqft + unitType.maxSqft) / 2;
        }
        return unitType.minSqft || unitType.maxSqft || 0;
    }

    /**
     * Get summary statistics for all unit types
     */
    static getSummaryStats(unitTypes: UnitTypeData[]): {
        totalUnitTypes: number
        totalAvailable: number
        avgRent: number
        avgSqft: number
        bedroomDistribution: Record<number, number>
    } {
        const totalUnitTypes = unitTypes.length;
        const totalAvailable = reduce(unitTypes, (sum, ut) => sum + (ut.countAvailable || 0), 0);

        let totalRent = 0;
        let rentCount = 0;
        let totalSqft = 0;
        let sqftCount = 0;
        const bedroomDistribution: Record<number, number> = {};

        forEach(unitTypes, (unitType) => {
            // Rent calculations
            const rent = UnitTypeHelpers.calculateAverageRent(unitType);
            if(rent > 0) {
                totalRent += rent;
                rentCount++;
            }

            // Square footage calculations
            const sqft = UnitTypeHelpers.calculateAverageSqft(unitType);
            if(sqft > 0) {
                totalSqft += sqft;
                sqftCount++;
            }

            // Bedroom distribution
            const beds = unitType.beds || 0;
            bedroomDistribution[beds] = (bedroomDistribution[beds] || 0) + 1;
        });

        return {
            totalUnitTypes,
            totalAvailable,
            avgRent: rentCount > 0 ? totalRent / rentCount : 0,
            avgSqft: sqftCount > 0 ? totalSqft / sqftCount : 0,
            bedroomDistribution
        };
    }
}
