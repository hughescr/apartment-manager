/**
 * Alpine.js TypeScript type definitions for apartment manager components
 *
 * This file provides proper typing using official @types/alpinejs
 * to ensure type safety across the application.
 */

import type { Alpine } from 'alpinejs';

// Import Alpine magic properties from the official types
export interface AlpineMagics {
    $el: HTMLElement
    $root: HTMLElement
    $dispatch: (event: string, detail?: unknown) => void
    $nextTick: (callback?: () => void) => Promise<void>
    $watch: <T>(property: string, callback: (newValue: T, oldValue: T) => void) => void
    $refs: Record<string, HTMLElement>
    $data: Record<string, unknown>
    $store: Record<string, unknown>
    $id: (name: string, key?: number | string | null) => string
}

// Business domain types (simplified for component use)
export interface Building {
    id: string
    name: string
    address: string
    [key: string]: unknown
}

export interface Unit {
    id: string
    buildingId: string
    unitNumber: string
    [key: string]: unknown
}

export interface UnitType {
    id: string
    name: string
    buildingId: string
    [key: string]: unknown
}

export interface Amenity {
    id: string
    name: string
    description?: string
    [key: string]: unknown
}

// Alpine component type that includes magic properties with enhanced $id support
// Custom type maintains compatibility while adding proper $id typing
export type AlpineComponent<T = Record<string, unknown>> = T & AlpineMagics;

// Component-specific data interfaces using official Alpine types
export interface AddBuildingFormData {
    building: Building
    showAddBuildingModal: boolean
    isLoading: boolean
    validationErrors: Record<string, string>
    submitForm: () => Promise<void>
    closeModal: () => void
}

export interface BuildingManagerData {
    buildings: Building[]
    isLoading: boolean
    error: string | null
    loadBuildings: () => Promise<void>
    deleteBuilding: (buildingId: string) => Promise<void>
}

export interface BuildingsComponentData {
    buildings: Building[]
    isLoading: boolean
    showAddForm: boolean
    toggleAddForm: () => void
    refreshBuildings: () => Promise<void>
}

export interface BuildingsListData {
    buildings: Building[]
    isLoading: boolean
    searchQuery: string
    filteredBuildings: Building[]
    searchBuildings: () => void
}

export interface ModelAmenitiesManagerData {
    amenities: Amenity[]
    isLoading: boolean
    showAddModal: boolean
    selectedAmenity: Amenity | null
    addAmenity: (amenity: Amenity) => Promise<void>
    updateAmenity: (amenity: Amenity) => Promise<void>
    deleteAmenity: (amenityId: string) => Promise<void>
}

export interface UnitCardData {
    unit: Unit
    isEditing: boolean
    isLoading: boolean
    validationErrors: Record<string, string>
    saveUnit: () => Promise<void>
    cancelEdit: () => void
    deleteUnit: () => Promise<void>
}

export interface BuildingStateData {
    building: Building
    isLoading: boolean
    error: string | null
    loadBuilding: (buildingId: string) => Promise<void>
    updateBuilding: (updates: Partial<Building>) => Promise<void>
}

export interface UnitTypeFormData {
    unitType: UnitType
    isLoading: boolean
    validationErrors: Record<string, string>
    saveUnitType: () => Promise<void>
    resetForm: () => void
}

export interface LocationMapData {
    map: unknown | null  // Leaflet Map instance
    marker: unknown | null  // Leaflet Marker instance
    latitude: number
    longitude: number
    initializeMap: () => void
    updateLocation: (lat: number, lng: number) => void
}

export interface UnitTypeCardData {
    unitType: UnitType
    isExpanded: boolean
    toggleExpanded: () => void
    editUnitType: () => void
    deleteUnitType: () => Promise<void>
}

// Pet Policy related interfaces
export type PetPolicyState = Record<string, unknown>;

// Hours Editor interface
export type HoursEditorData = Record<string, unknown>;

// Toast Controller interface
export interface ToastController {
    show: (message: string, type: string) => void
    hide: () => void
}

// Alpine component types with magic properties
export type AddBuildingFormComponent = AlpineComponent<AddBuildingFormData>;
export type BuildingManagerComponent = AlpineComponent<BuildingManagerData>;
export type BuildingsComponentComponent = AlpineComponent<BuildingsComponentData>;
export type BuildingsListComponent = AlpineComponent<BuildingsListData>;
export type ModelAmenitiesManagerComponent = AlpineComponent<ModelAmenitiesManagerData>;
export type UnitCardComponent = AlpineComponent<UnitCardData>;
export type BuildingStateComponent = AlpineComponent<BuildingStateData>;
export type UnitTypeFormComponent = AlpineComponent<UnitTypeFormData>;
export type LocationMapComponent = AlpineComponent<LocationMapData>;
export type UnitTypeCardComponent = AlpineComponent<UnitTypeCardData>;

// Registry function type
export type AlpineComponentRegistryFunction = (Alpine: Alpine) => void;
