/**
 * Comprehensive TypeScript interfaces for Alpine.js state objects
 * Provides type safety for all Alpine.js x-data and state management
 */

import type { BuildingData, UnitData, UnitTypeData, Amenity } from '../../types';
import type { AlpineMagicProperties } from '../alpine';

// ===== BASE ALPINE STATE INTERFACES =====

/**
 * Core Alpine.js state interface that all x-data objects should extend
 */
export interface BaseAlpineState {
    /** Initialization method called by Alpine.js */
    init?(): void
    /** Error state for form validation */
    errors: Record<string, string>
    /** Loading/saving state */
    saving: boolean
}

// ===== BUILDING MANAGEMENT STATE =====

/**
 * Main building state interface for BuildingProvider.astro
 * Used by createBuildingState() function
 */
export interface BuildingAlpineState extends BaseAlpineState {
    // Core data
    building: BuildingData | null
    original: BuildingData | null
    units: ExtendedUnitData[]
    unitTypes: UnitTypeData[]
    apiURL: string

    // UI state
    activeSectionTab: TabKey
    showSave: boolean
    geocoding: boolean

    // Units management state
    filteredUnits: ExtendedUnitData[]
    selectedUnits: Set<string>
    statusFilter: VacancyStatus
    searchQuery: string

    // Dialog states
    showAddUnitDialog: boolean
    showAddUnitTypeDialog: boolean
    showBulkStatusDialog: boolean
    showBulkRentDialog: boolean

    // Form states
    newUnit: NewUnitForm
    bulkOperation: BulkOperationState

    // Methods
    parseBuildingData(): void
    parseLocationData(): void
    parseUnitsData(): void
    parseUnitTypesData(): void
    initializeUnitsTimestamps(): void
    setupWatchers(): void
    updateFilteredUnits(): void
    validateForm(): boolean
    saveBuilding(): Promise<void>
    deleteBuilding(): Promise<void>
    undoChanges(): void
    openAddUnitDialog(): void
    openAddUnitTypeDialog(): void
    closeAddUnitTypeDialog(): void
    addUnitType(): void
    addUnit(): Promise<void>
    toggleSelectAll(): void
    isUnitSelected(unitID: string): boolean
    toggleUnitSelection(unitID: string): void
    getSelectedCount(): number
    performBulkStatusUpdate(): Promise<void>
    performBulkRentUpdate(): Promise<void>
    toggleUnitAvailability(unit: ExtendedUnitData): Promise<void>
    updateUnitRent(unit: ExtendedUnitData, newRentValue: string): Promise<void>
    formatCurrency(amount: number | null | undefined): string
    formatRelativeTime(dateString: string | undefined): string
    getStatusBadgeClass(status: string | undefined): string
    getTabDisplayName(tabKey: string): string
}

/**
 * Extended Unit data with UI state properties
 */
export interface ExtendedUnitData extends UnitData {
    lastUpdated?: string
    status?: string
    currentRent?: number
    editingRent?: boolean
    savingField?: string | null
    // Note: updatedAt is already defined in UnitData as Date, inherited here
}

/**
 * New unit form state
 */
export interface NewUnitForm {
    unitID: string
    modelID: string
}

/**
 * Bulk operation state
 */
export interface BulkOperationState {
    loading: boolean
    statusValue: string
    rentUpdateType: 'absolute' | 'percentage'
    rentValue: number
}

// ===== UNIT CARD STATE =====

/**
 * Unit card state interface for UnitCard.astro
 * Used by unitCardData() function
 */
export interface UnitCardAlpineState extends BaseAlpineState {
    // Core data
    unit: UnitData | null
    originalUnit: UnitData | null
    unitTypes: UnitTypeData[] | null
    selectedUnitType: UnitTypeData | null
    apiURL: string | null
    buildingAmenities: Amenity[] | null

    // UI state
    expandedSections: ExpandedSectionsState

    // Methods - Data management
    isDirty(): boolean
    onModelChange(): void

    // Methods - Inheritance logic
    isInherited(fieldName: InheritableField): boolean
    getInheritedValue(fieldName: InheritableField): string | number | null
    getEffectiveValue(fieldName: InheritableField): string | number | null
    resetFieldToInherited(fieldName: InheritableField): void

    // Methods - Amenity management
    getEffectiveAmenities(): Amenity[]
    getAmenityInheritanceSource(): AmenityInheritanceSource
    resetToInheritedAmenities(): void
    loadBuildingAmenities(): Promise<void>

    // Methods - Validation and saving
    validateForm(): boolean
    clearFieldError(fieldName: string): void
    saveUnit(context?: UnitCardAlpineState): Promise<void>
    deleteUnit(): Promise<void>

    // Methods - Deposit handling
    initializeDeposit(): void
    getDepositAmount(): number | null
    setDepositAmount(value: string): void
    getDepositRefundable(): boolean
    setDepositRefundable(value: boolean): void
    getDepositPartialRefundPercentage(): number | null
    setDepositPartialRefundPercentage(value: string): void

    // Methods - Utility
    formatCurrency(value: number | null | undefined): string
    toggleSection(section: keyof ExpandedSectionsState): void
}

/**
 * Expanded sections state for unit cards
 */
export interface ExpandedSectionsState {
    details: boolean
    amenities: boolean
    photos: boolean
    websites: boolean
}

/**
 * Inheritable fields between unit, model, and building levels
 */
export type InheritableField =
  | 'beds'
  | 'baths'
  | 'sqft'
  | 'rent'
  | 'maxOccupants'
  | 'perPersonRent'
  | 'deposit'
  | 'minLeaseTerm'
  | 'maxLeaseTerm';

/**
 * Amenity inheritance source levels
 */
export type AmenityInheritanceSource = 'unit' | 'floorplan' | 'building' | 'none';

// ===== BUILDINGS COMPONENT STATE =====

/**
 * Buildings list component state for BuildingsComponent.astro
 */
export interface BuildingsComponentAlpineState extends BaseAlpineState {
    // Navigation state
    activeBuildingTab: number

    // Toast state
    showToast: boolean
    toastMessage: string
    toastType: ToastType

    // Building data
    buildingsData: BuildingWithData[]

    // Add building form state
    buildingID: string
    street: string
    city: string
    state: string
    zip: string
    description: string
    specialtyType: SpecialtyType
    propertyWebsite: string
    managementWebsite: string
    apiURL: string

    // Methods
    init(): void
    showAndHideToast(message: string, type: ToastType): void
    setActiveTab(tabIndex: number, buildingID?: string | null): void
    addBuilding(): Promise<void>
    clearForm(): void
}

/**
 * Building data with associated units and unit types
 */
export interface BuildingWithData {
    building: BuildingData
    units: UnitData[]
    unitTypes: UnitTypeData[]
}

// ===== FORM STATE INTERFACES =====

/**
 * Base form state for all form components
 */
export interface BaseFormState extends BaseAlpineState {
    /** Form validation errors */
    errors: Record<string, string>
    /** Whether form is being submitted */
    submitting: boolean
    /** Whether form has been touched */
    touched: boolean
}

/**
 * Screening criteria form state
 */
export interface ScreeningCriteriaFormState extends BaseFormState {
    showAdvanced: boolean
    xModelRef: string
    getModelValue(): unknown
    setModelValue(value: unknown): void
    validateField(field: string, value: unknown): boolean
}

/**
 * Office hours editor state
 */
export interface OfficeHoursEditorState extends BaseFormState {
    selectedDay: string | null
    tempHours: Record<string, { open: string, close: string, closed: boolean }>
    editingDay: string | null
}

// ===== DIALOG STATE INTERFACES =====

/**
 * Base dialog state
 */
export interface BaseDialogState extends BaseAlpineState {
    isOpen: boolean
    open(): void
    close(): void
    onEscape(): void
}

/**
 * Add unit dialog state
 */
export interface AddUnitDialogState extends BaseDialogState {
    building: {
        buildingID: string
        street: string
        city: string
        state: string
    }
    unitTypes: UnitTypeData[]
    newUnit: NewUnitForm
    apiUrl: string

    validateForm(): boolean
    submitForm(): Promise<void>
    reset(): void
}

/**
 * Bulk status dialog state
 */
export interface BulkStatusDialogState extends BaseDialogState {
    selectedUnits: Set<string>
    statusValue: string
    apiUrl: string

    performUpdate(): Promise<void>
}

/**
 * Bulk rent dialog state
 */
export interface BulkRentDialogState extends BaseDialogState {
    selectedUnits: Set<string>
    rentUpdateType: 'absolute' | 'percentage'
    rentValue: number
    apiUrl: string

    performUpdate(): Promise<void>
    calculatePreview(): { unitID: string, currentRent: number, newRent: number }[]
}

// ===== UTILITY TYPES =====

/**
 * Available tab keys for building management
 */
export type TabKey =
  | 'building-info'
  | 'floorplans-units'
  | 'pricing-policies'
  | 'marketing'
  | 'units';

/**
 * Toast message types
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Building specialty types
 */
export type SpecialtyType = 'market-rate' | 'affordable' | 'student' | 'senior';

/**
 * Vacancy status types
 */
export type VacancyStatus = '' | 'Occupied' | 'Unoccupied' | 'Notice' | 'Down';

/**
 * Feed inclusion status types
 */
export type FeedInclusionStatus = '' | 'active' | 'inactive' | 'pending' | 'error';

// ===== COMPOSITE STATE TYPES =====

/**
 * Complete Alpine.js state with magic properties
 */
export type AlpineStateWithMagic<T extends BaseAlpineState> = T & AlpineMagicProperties;

/**
 * Building state with magic properties (for use in components)
 */
export type BuildingStateWithMagic = AlpineStateWithMagic<BuildingAlpineState>;

/**
 * Unit card state with magic properties (for use in components)
 */
export type UnitCardStateWithMagic = AlpineStateWithMagic<UnitCardAlpineState>;

/**
 * Buildings component state with magic properties
 */
export type BuildingsComponentStateWithMagic = AlpineStateWithMagic<BuildingsComponentAlpineState>;
