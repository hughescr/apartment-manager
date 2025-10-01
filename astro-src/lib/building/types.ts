import type { BuildingData, UnitData, UnitTypeData } from '../../types';

// Re-export types needed by components
export type { UnitTypeData };

// Extended UnitData with runtime properties
export interface ExtendedUnitData extends UnitData {
    lastUpdated?: string
    status?:      string  // For runtime status display
    currentRent?: number  // For runtime rent value
    editingRent?: boolean  // UI state for inline rent editing
    savingField?: string | null  // UI state for showing saving indicators
}

// Building-specific UI state interfaces
export interface BuildingUIState {
    original:              BuildingData | null
    building:              BuildingData | null
    units:                 ExtendedUnitData[]
    unitTypes:             UnitTypeData[]
    apiURL:                string
    showSave:              boolean
    saving:                boolean
    activeSectionTab:      string
    errors:                Record<string, string>
    showAddUnitDialog:     boolean
    newUnit:               { unitID: string, modelID: string }
    showAddUnitTypeDialog: boolean
}

// Simplified units filtering state (no bulk operations)
export interface UnitsFilterState {
    filteredUnits: ExtendedUnitData[]
    statusFilter:  string
    searchQuery:   string
}

// LocationMapPicker state
export interface LocationState {
    geocoding: boolean
}

// Combined state interface
export interface BuildingState extends BuildingUIState, UnitsFilterState, LocationState {}

// Event types for the event bus
// Event types for the event bus
export interface BuildingEvents {
    'building:updated':   { building: BuildingData }
    'building:save':      { building: BuildingData }
    'building:saving':    { saving: boolean }
    'building:reset':     { building: BuildingData }
    'building:validate':  { isValid: boolean, errors: Record<string, string> }
    'tab:change':         { activeTab: string }
    'units:filter':       { filter: string, query: string }
    'toast:show':         { message: string, toastType: 'success' | 'error' | 'warning' }
    'photos:updated':     { photos: string[] }
    'tours:updated':      { selfGuidedTours?: boolean, virtualTours?: boolean, inPersonTours?: boolean }
    'location:geocoding': { geocoding: boolean }
}

// Tab configuration
export interface TabConfig {
    key:          string
    label:        string
    mobileLabel?: string
}

export const TAB_CONFIGS: TabConfig[] = [
    { key: 'building-info', label: 'Building Info' },
    { key: 'floorplans-units', label: 'Floorplans & Units', mobileLabel: 'Floorplans' },
    { key: 'pricing-policies', label: 'Pricing & Policies', mobileLabel: 'Pricing' },
    { key: 'marketing', label: 'Marketing' }
];

// Validation types
export interface ValidationRule {
    field:     string
    required?: boolean
    pattern?:  RegExp
    min?:      number
    max?:      number
    message:   string
}

export interface ValidationResult {
    isValid: boolean
    errors:  Record<string, string>
}
