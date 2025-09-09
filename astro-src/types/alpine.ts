/**
 * Alpine.js component types using official @types/alpinejs
 * This file re-exports the centralized Alpine types for backward compatibility
 */

export type {
    AlpineComponent,
    AlpineMagics,
    AlpineInstance,
    AlpineComponentRegistryFunction,
    // Component-specific types
    AddBuildingFormData,
    BuildingManagerData,
    BuildingsComponentData,
    BuildingsListData,
    ModelAmenitiesManagerData,
    UnitCardData,
    BuildingStateData,
    UnitTypeFormData,
    LocationMapData,
    UnitTypeCardData,
    // Business domain types
    Building,
    Unit,
    UnitType,
    Amenity
} from '../lib/alpine-types';
