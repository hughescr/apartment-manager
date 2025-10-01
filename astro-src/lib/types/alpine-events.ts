/**
 * Comprehensive TypeScript interfaces for Alpine.js custom events
 * Provides type safety for $dispatch and event listeners across components
 */

import type { BuildingData, UnitData, Amenity } from '../../types';
import type { ToastType } from './alpine-state';

// ===== BASE EVENT INTERFACES =====

/**
 * Base interface for all Alpine.js custom events
 */
export interface BaseAlpineEvent<T = unknown> {
    detail: T
}

/**
 * Event listener callback type
 */
export type AlpineEventListener<T = unknown> = (event: BaseAlpineEvent<T>) => void;

// ===== BUILDING-RELATED EVENTS =====

/**
 * Building data update event
 * Dispatched when building data changes
 */
export interface BuildingUpdatedEvent {
    building: BuildingData
}

/**
 * Building save event
 * Dispatched when building save is initiated
 */
export interface BuildingSaveEvent {
    building: BuildingData
}

/**
 * Building saving state event
 * Dispatched when save operation starts/ends
 */
export interface BuildingSavingEvent {
    saving: boolean
}

/**
 * Building reset event
 * Dispatched when building data is reset to original state
 */
export interface BuildingResetEvent {
    building: BuildingData
}

/**
 * Building validation event
 * Dispatched when form validation occurs
 */
export interface BuildingValidateEvent {
    isValid: boolean
    errors:  Record<string, string>
}

/**
 * Building deletion event
 * Dispatched when building is deleted
 */
export interface BuildingDeletedEvent {
    buildingID: string
}

// ===== UNIT-RELATED EVENTS =====

/**
 * Unit saved event
 * Dispatched when a unit is successfully saved
 */
export interface UnitSavedEvent {
    unit:       UnitData
    fieldName?: string
}

/**
 * Unit deleted event
 * Dispatched when a unit is deleted
 */
export interface UnitDeletedEvent {
    unitID:     string
    buildingID: string
}

/**
 * Unit validation error event
 * Dispatched when unit validation fails
 */
export interface UnitValidationErrorEvent {
    unitID: string
    errors: Record<string, string>
}

/**
 * Units filter event
 * Dispatched when unit filtering criteria change
 */
export interface UnitsFilterEvent {
    filter: string
    query:  string
}

/**
 * Units updated event
 * Dispatched when unit list is updated
 */
export interface UnitsUpdatedEvent {
    filter: string
    query:  string
}

/**
 * Units selection change event
 * Dispatched when unit selection changes
 */
export interface UnitsSelectionChangedEvent {
    selected: string[]
}

/**
 * Units bulk update event
 * Dispatched when bulk operations are performed
 */
export interface UnitsBulkUpdateEvent {
    operationType: 'status' | 'rent'
    unitIDs:       string[]
}

// ===== TAB AND NAVIGATION EVENTS =====

/**
 * Tab change event
 * Dispatched when active tab changes
 */
export interface TabChangeEvent {
    activeTab:    string
    previousTab?: string
}

/**
 * Section expand/collapse event
 * Dispatched when expandable sections change state
 */
export interface SectionToggleEvent {
    section:  string
    expanded: boolean
}

// ===== TOAST AND NOTIFICATION EVENTS =====

/**
 * Toast show event
 * Dispatched to show toast notifications
 */
export interface ToastShowEvent {
    message:   string
    type:      ToastType
    duration?: number
}

/**
 * Legacy toast event format (for backwards compatibility)
 * Used by some components with 'toastType' instead of 'type'
 */
export interface LegacyToastShowEvent {
    message:   string
    toastType: ToastType
    duration?: number
}

/**
 * Generic show-toast event
 * Used by some components for general toast display
 */
export interface ShowToastEvent {
    message: string
    type:    ToastType
}

// ===== PHOTO AND MEDIA EVENTS =====

/**
 * Photos updated event
 * Dispatched when photo collections change
 */
export interface PhotosUpdatedEvent {
    photos:      string[]
    entityType?: 'building' | 'unit' | 'unitType'
    entityID?:   string
}

/**
 * Photo upload event
 * Dispatched during photo upload process
 */
export interface PhotoUploadEvent {
    status:    'started' | 'progress' | 'completed' | 'error'
    progress?: number
    photoUrl?: string
    error?:    string
}

/**
 * Photo delete event
 * Dispatched when photos are deleted
 */
export interface PhotoDeleteEvent {
    photoUrl:   string
    entityType: 'building' | 'unit' | 'unitType'
    entityID:   string
}

// ===== TOUR AND MARKETING EVENTS =====

/**
 * Tours updated event
 * Dispatched when tour availability changes
 */
export interface ToursUpdatedEvent {
    selfGuidedTours?: boolean
    virtualTours?:    boolean
    inPersonTours?:   boolean
}

/**
 * Marketing data updated event
 * Dispatched when marketing information changes
 */
export interface MarketingUpdatedEvent {
    buildingID: string
    updates:    Partial<BuildingData>
}

// ===== LOCATION AND GEOCODING EVENTS =====

/**
 * Location geocoding event
 * Dispatched when geocoding state changes
 */
export interface LocationGeocodingEvent {
    geocoding: boolean
}

/**
 * Location updated event
 * Dispatched when location coordinates change
 */
export interface LocationUpdatedEvent {
    latitude:  number
    longitude: number
    address?:  string
}

// ===== AMENITY EVENTS =====

/**
 * Amenities updated event
 * Dispatched when amenity collections change
 */
export interface AmenitiesUpdatedEvent {
    amenities: Amenity[]
    level:     'building' | 'unit' | 'unitType'
    entityID:  string
}

/**
 * Amenity inheritance reset event
 * Dispatched when amenities are reset to inherited values
 */
export interface AmenityInheritanceResetEvent {
    unitID:            string
    inheritanceSource: 'floorplan' | 'building' | 'none'
}

// ===== FORM EVENTS =====

/**
 * Form validation event
 * Dispatched when form validation occurs
 */
export interface FormValidationEvent {
    formName: string
    isValid:  boolean
    errors:   Record<string, string>
}

/**
 * Form submitted event
 * Dispatched when forms are submitted
 */
export interface FormSubmittedEvent {
    formName: string
    data:     Record<string, unknown>
    success:  boolean
}

/**
 * Field changed event
 * Dispatched when individual form fields change
 */
export interface FieldChangedEvent {
    fieldName:     string
    value:         unknown
    previousValue: unknown
}

// ===== DIALOG EVENTS =====

/**
 * Dialog open event
 * Dispatched when dialogs are opened
 */
export interface DialogOpenEvent {
    dialogId: string
    data?:    Record<string, unknown>
}

/**
 * Dialog close event
 * Dispatched when dialogs are closed
 */
export interface DialogCloseEvent {
    dialogId: string
    reason?:  'cancel' | 'submit' | 'escape'
    data?:    Record<string, unknown>
}

// ===== SEARCH AND FILTER EVENTS =====

/**
 * Search query event
 * Dispatched when search queries change
 */
export interface SearchQueryEvent {
    query: string
    scope: 'units' | 'buildings' | 'unitTypes'
}

/**
 * Filter changed event
 * Dispatched when filter criteria change
 */
export interface FilterChangedEvent {
    filterType:  string
    filterValue: unknown
    scope:       string
}

// ===== COMPREHENSIVE EVENT REGISTRY =====

/**
 * Complete registry of all Alpine.js custom events
 * Use this for type-safe event dispatching and listening
 */
export interface AlpineEventRegistry {
    // Building events
    'building:updated':  BuildingUpdatedEvent
    'building:save':     BuildingSaveEvent
    'building:saving':   BuildingSavingEvent
    'building:reset':    BuildingResetEvent
    'building:validate': BuildingValidateEvent
    'building:deleted':  BuildingDeletedEvent

    // Unit events
    'unit:saved':              UnitSavedEvent
    'unit:deleted':            UnitDeletedEvent
    'unit:validation-error':   UnitValidationErrorEvent
    'units:filter':            UnitsFilterEvent
    'units:updated':           UnitsUpdatedEvent
    'units:selection-changed': UnitsSelectionChangedEvent
    'units:bulk-update':       UnitsBulkUpdateEvent

    // Navigation events
    'tab:change':     TabChangeEvent
    'section:toggle': SectionToggleEvent

    // Toast events
    'toast:show': ToastShowEvent
    'show-toast': ShowToastEvent // Legacy compatibility

    // Photo events
    'photos:updated': PhotosUpdatedEvent
    'photo:upload':   PhotoUploadEvent
    'photo:delete':   PhotoDeleteEvent

    // Tour events
    'tours:updated':     ToursUpdatedEvent
    'marketing:updated': MarketingUpdatedEvent

    // Location events
    'location:geocoding': LocationGeocodingEvent
    'location:updated':   LocationUpdatedEvent

    // Amenity events
    'amenities:updated':         AmenitiesUpdatedEvent
    'amenity:inheritance-reset': AmenityInheritanceResetEvent

    // Form events
    'form:validation': FormValidationEvent
    'form:submitted':  FormSubmittedEvent
    'field:changed':   FieldChangedEvent

    // Dialog events
    'dialog:open':  DialogOpenEvent
    'dialog:close': DialogCloseEvent

    // Search and filter events
    'search:query':   SearchQueryEvent
    'filter:changed': FilterChangedEvent
}

// ===== UTILITY TYPES FOR EVENTS =====

/**
 * Extract event names from the registry
 */
export type AlpineEventName = keyof AlpineEventRegistry;

/**
 * Get event payload type by event name
 */
export type AlpineEventPayload<T extends AlpineEventName> = AlpineEventRegistry[T];

/**
 * Type-safe event dispatcher function type
 */
export type TypedEventDispatcher = <T extends AlpineEventName>(
    eventName: T,
    detail: AlpineEventPayload<T>
) => void;

/**
 * Type-safe event listener function type
 */
export type TypedEventListener<T extends AlpineEventName> = (
    event: BaseAlpineEvent<AlpineEventPayload<T>>
) => void;

// ===== EVENT HELPER TYPES =====

/**
 * Discriminated union for event types
 * Useful for event handling switches
 */
export type AlpineEvent = {
    [K in AlpineEventName]: {
        type:   K
        detail: AlpineEventPayload<K>
    };
}[AlpineEventName];

/**
 * Event handler map type
 * For registering multiple event handlers at once
 */
export type AlpineEventHandlerMap = Partial<{
    [K in AlpineEventName]: TypedEventListener<K>;
}>;

/**
 * Bulk event dispatcher type
 * For dispatching multiple events with proper typing
 */
export type BulkEventDispatcher = {
    [K in AlpineEventName]: (detail: AlpineEventPayload<K>) => void;
};
