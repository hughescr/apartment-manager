import type { BuildingData, UnitData, UnitTypeData } from '../../types';

// Extended UnitData with runtime properties
export interface ExtendedUnitData extends UnitData {
    lastUpdated?: string
}

// Building-specific UI state interfaces
export interface BuildingUIState {
    original: BuildingData | null
    building: BuildingData | null
    units: ExtendedUnitData[]
    unitTypes: UnitTypeData[]
    apiURL: string
    showSave: boolean
    saving: boolean
    activeSectionTab: string
    errors: Record<string, string>
    showAddUnitDialog: boolean
    newUnit: { unitID: string, modelID: string }
    showAddUnitTypeDialog: boolean
}

// Units tab specific state
export interface UnitsTabState {
    filteredUnits: ExtendedUnitData[]
    selectedUnits: Set<string>
    statusFilter: string
    searchQuery: string
    showBulkStatusDialog: boolean
    showBulkRentDialog: boolean
    bulkOperation: {
        loading: boolean
        statusValue: string
        rentUpdateType: 'absolute' | 'percentage'
        rentValue: number
    }
}

// LocationMapPicker state
export interface LocationState {
    geocoding: boolean
}

// Combined state interface
export interface BuildingCardState extends BuildingUIState, UnitsTabState, LocationState {}

// Event types for the event bus
// Event types for the event bus
export interface BuildingEvents {
    'building:updated': { building: BuildingData }
    'building:save': { building: BuildingData }
    'building:reset': { building: BuildingData }
    'building:validate': { isValid: boolean, errors: Record<string, string> }
    'tab:change': { activeTab: string }
    'units:filter': { filter: string, query: string }
    'units:bulk-update': { operationType: 'status' | 'rent', unitIDs: string[] }
    'toast:show': { message: string, toastType: 'success' | 'error' | 'warning' }
    'photos:updated': { photos: string[] }
    'tours:updated': { selfGuidedTours?: boolean, virtualTours?: boolean, inPersonTours?: boolean }
}

// Tab configuration
export interface TabConfig {
    key: string
    label: string
    mobileLabel?: string
}

export const TAB_CONFIGS: TabConfig[] = [
    { key: 'building-info', label: 'Building Info' },
    { key: 'floorplans-units', label: 'Floorplans & Units', mobileLabel: 'Floorplans' },
    { key: 'pricing-policies', label: 'Pricing & Policies', mobileLabel: 'Pricing' },
    { key: 'marketing', label: 'Marketing' },
    { key: 'units', label: 'Units' }
];

// Validation types
export interface ValidationRule {
    field: string
    required?: boolean
    pattern?: RegExp
    min?: number
    max?: number
    message: string
}

export interface ValidationResult {
    isValid: boolean
    errors: Record<string, string>
}
