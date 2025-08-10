import type { BuildingData, UnitTypeData } from '../../../types';
import type { ExtendedUnitData } from '../types';
import { hasUnsavedChanges } from '../validation';
import { buildingEventBus } from '../eventBus';
import { trim, isObject, isFunction } from 'lodash';

// Alpine.js reactive function type
type AlpineReactive = <T>(obj: T) => T;

/**
 * StateManager interface for pure state management with reactive properties
 */
export interface StateManager {
    // State properties
    building: BuildingData | null
    original: BuildingData | null
    units: ExtendedUnitData[]
    unitTypes: UnitTypeData[]

    // UI state
    activeSectionTab: string
    showSave: boolean
    saving: boolean
    geocoding: boolean
    // Methods
    initializeState(element: HTMLElement): void
    updateBuilding(building: BuildingData): void
    resetToOriginal(): void
    hasUnsavedChanges(): boolean
    setupWatchers(watchFn: (expression: string, callback: () => void, options?: { deep?: boolean }) => void): void
}

/**
 * Creates a reactive StateManager instance using Alpine.js reactive system
 */
export function createStateManager(reactive: AlpineReactive): StateManager {
    // Create reactive state object
    const state = reactive({
        // Core state properties
        building: null as BuildingData | null,
        original: null as BuildingData | null,
        units: [] as ExtendedUnitData[],
        unitTypes: [] as UnitTypeData[],

        // UI state
        activeSectionTab: 'building-info',
        showSave: false,
        saving: false,
        geocoding: false,
        // Internal properties
        _watchFunction: null as ((expression: string, callback: () => void, options?: { deep?: boolean }) => void) | null
    });

    /**
     * Initialize state from HTML element dataset
     */
    function initializeState(element: HTMLElement): void {
        // Parse building data with error handling
        try {
            const buildingDataStr = element.dataset.building;
            if(!buildingDataStr || trim(buildingDataStr) === '') {
                state.building = null;
            } else {
                state.building = JSON.parse(buildingDataStr);
            }
        } catch{
            // Failed to parse building data, use null
            state.building = null;
        }

        // Parse units data
        try {
            state.units = JSON.parse(element.dataset.units || '[]') || [];
        } catch{
            // Failed to parse units data, use empty array
            state.units = [];
        }

        // Parse unit types data
        try {
            state.unitTypes = JSON.parse(element.dataset.unitTypes || '[]') || [];
        } catch{
            // Failed to parse unitTypes data, use empty array
            state.unitTypes = [];
        }

        // Store original state for change detection
        state.original = state.building ? JSON.parse(JSON.stringify(state.building)) : null;
    }

    /**
     * Update building data and emit events
     */
    function updateBuilding(building: BuildingData): void {
        state.building = building;
        state.showSave = hasUnsavedChanges(state.building, state.original);

        buildingEventBus.emit('building:updated', { building });
    }

    /**
     * Reset building to original state
     */
    function resetToOriginal(): void {
        if(state.original) {
            state.building = JSON.parse(JSON.stringify(state.original));
            state.showSave = false;
            buildingEventBus.emit('building:reset', { building: state.building! });
        }
    }

    /**
     * Check if there are unsaved changes
     */
    function hasUnsavedChangesCheck(): boolean {
        return hasUnsavedChanges(state.building, state.original);
    }

    /**
     * Setup reactivity watchers
     */
    function setupWatchers(watchFn: (expression: string, callback: () => void, options?: { deep?: boolean }) => void): void {
        state._watchFunction = watchFn;

        // Watch for building changes
        watchFn('building', () => {
            if(state.building) {
                state.showSave = hasUnsavedChanges(state.building, state.original);
                buildingEventBus.emit('building:updated', { building: state.building });
            }
        }, { deep: true });

        // Watch for saving state changes
        watchFn('saving', () => {
            if(state.saving) {
                buildingEventBus.emit('building:saving', { saving: true });
            }
        });

        // Watch for geocoding state changes
        watchFn('geocoding', () => {
            buildingEventBus.emit('location:geocoding', { geocoding: state.geocoding });
        });
    }

    // Return StateManager interface
    return {
        // State properties (getters/setters through reactive proxy)
        get building() { return state.building; },
        set building(value: BuildingData | null) {
            state.building = value;
            state.showSave = hasUnsavedChanges(value, state.original);
        },

        get original() { return state.original; },
        set original(value: BuildingData | null) { state.original = value; },

        get units() { return state.units; },
        set units(value: ExtendedUnitData[]) { state.units = value; },

        get unitTypes() { return state.unitTypes; },
        set unitTypes(value: UnitTypeData[]) { state.unitTypes = value; },

        get activeSectionTab() { return state.activeSectionTab; },
        set activeSectionTab(value: string) {
            state.activeSectionTab = value;
            buildingEventBus.emit('tab:change', { activeTab: value });
        },

        get showSave() { return state.showSave; },
        set showSave(value: boolean) { state.showSave = value; },

        get saving() { return state.saving; },
        set saving(value: boolean) { state.saving = value; },

        get geocoding() { return state.geocoding; },
        set geocoding(value: boolean) { state.geocoding = value; },

        // Methods
        initializeState,
        updateBuilding,
        resetToOriginal,
        hasUnsavedChanges: hasUnsavedChangesCheck,
        setupWatchers
    };
}

/**
 * Type guard to check if object has StateManager interface
 */
export function isStateManager(obj: unknown): obj is StateManager {
    return isObject(obj)
      && obj !== null
      && 'building' in obj
      && 'initializeState' in obj
      && isFunction((obj as StateManager).initializeState);
}
