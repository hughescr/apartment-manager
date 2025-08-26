// Astro Component Renderer for MITS Generation
// This module bridges the original generator.ts with the new Astro components

import type { BuildingData, UnitTypeData, UnitData } from '../types/index';
import type { MITSFeedOptions } from './schema';
import type { MultiBuildingFeedOptions } from './generator';
import { chain, filter, map, max } from 'lodash';
import { toLower } from 'lodash';

// Import the geocoding service
import { geocodeAddress } from '../services/geocoding';

// Map specialtyType to MITS RentalType
function mapSpecialtyTypeToRentalType(building: BuildingData): string {
    const enhancedBuilding = building as BuildingData & { specialtyType?: string };
    const specialtyType = enhancedBuilding.specialtyType;

    switch(toLower(specialtyType)) {
        case 'senior':
            return 'Senior';
        case 'student':
            return 'Student';
        case 'affordable':
            return 'Affordable';
        default:
            return 'Market Rate';
    }
}

// Get coordinates for a building with fallback strategy
async function getBuildingCoordinates(building: BuildingData): Promise<{ latitude: number, longitude: number }> {
    const enhancedBuilding = building as BuildingData & { latitude?: number, longitude?: number };

    // Use real coordinates if available
    if(enhancedBuilding.latitude && enhancedBuilding.longitude) {
        return { latitude: enhancedBuilding.latitude, longitude: enhancedBuilding.longitude };
    }

    // Try geocoding if we have address info
    if(building.street && building.city && building.state) {
        const coords = await geocodeAddress(building.street, building.city, building.state);
        if(coords) {
            return { latitude: coords.lat, longitude: coords.lng };
        }
    }

    // Fall back to LA coordinates as last resort
    return { latitude: 34.0522, longitude: -118.2437 };
}

// Find the most recent updatedAt timestamp
function findMostRecentUpdate(buildings: BuildingData[], unitTypesByBuilding: Record<string, UnitTypeData[]>, unitsByBuilding: Record<string, UnitData[]>): Date | undefined {
    const allDatesWithUpdates: Date[] = [];

    // Collect all updatedAt dates from buildings
    const buildingsWithUpdates = filter(buildings, 'updatedAt');
    allDatesWithUpdates.push(...map(buildingsWithUpdates, 'updatedAt') as Date[]);

    // Collect all updatedAt dates from unit types
    const allUnitTypesWithUpdates = chain(unitTypesByBuilding)
        .values()
        .flatten()
        .filter((ut): ut is UnitTypeData & { updatedAt: Date } => 'updatedAt' in ut && ut.updatedAt != null)
        .value();
    allDatesWithUpdates.push(...map(allUnitTypesWithUpdates, 'updatedAt'));

    // Collect all updatedAt dates from units
    const allUnitsWithUpdates = chain(unitsByBuilding)
        .values()
        .flatten()
        .filter((unit): unit is UnitData & { updatedAt: Date } => 'updatedAt' in unit && unit.updatedAt != null)
        .value();
    allDatesWithUpdates.push(...map(allUnitsWithUpdates, 'updatedAt'));

    return allDatesWithUpdates.length > 0 ? max(allDatesWithUpdates) : undefined;
}

// Generate MITS feed using Astro components (placeholder - will use component rendering)
export async function generateMITSFeedWithAstro(options: MITSFeedOptions): Promise<string> {
    const { building, unitTypes, units } = options;

    // Validate required fields
    if(!building.buildingID) {
        throw new Error('Building ID is required');
    }

    // Get coordinates and rental type (for future Astro component use)
    await getBuildingCoordinates(building);
    mapSpecialtyTypeToRentalType(building);

    // Find most recent update timestamp (for future Astro component use)
    findMostRecentUpdate([building], { [building.buildingID]: unitTypes }, { [building.buildingID]: units });

    // For now, fall back to the original implementation
    // Note: Replace with Astro component rendering when SSR setup is available
    const originalGenerator = await import('./generator');
    return originalGenerator.generateMITSFeedForBuilding(options);
}

// Generate multi-building MITS feed using Astro components
export async function generateMultiBuildingMITSFeedWithAstro(options: MultiBuildingFeedOptions): Promise<string> {
    const { buildings, unitTypesByBuilding, unitsByBuilding } = options;

    // Find the most recent updatedAt timestamp from all data across all buildings (for future Astro component use)
    findMostRecentUpdate(buildings, unitTypesByBuilding, unitsByBuilding);

    // For now, fall back to the original implementation
    // Note: Replace with Astro component rendering when SSR setup is available
    const originalGenerator = await import('./generator');
    return originalGenerator.generateMultiBuildingMITSFeed(options);
}

// Export the enhanced versions as drop-in replacements
export { generateMITSFeedWithAstro as generateMITSFeedForBuilding };
export { generateMultiBuildingMITSFeedWithAstro as generateMultiBuildingMITSFeed };

// Legacy compatibility
export { generateMITSFeedWithAstro as generateMITSFeed };
