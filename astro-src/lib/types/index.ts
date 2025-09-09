/**
 * Central export point for all Alpine.js and component TypeScript interfaces
 * Import from this file to access comprehensive type safety across the application
 */

import { isObject, isBoolean } from 'lodash';

// ===== ALPINE.JS STATE TYPES =====
export type {
    // Base types
    BaseAlpineState,
    AlpineStateWithMagic,

    // Building state types
    BuildingAlpineState,
    BuildingStateWithMagic,
    ExtendedUnitData,
    NewUnitForm,
    BulkOperationState,

    // Unit card state types
    UnitCardAlpineState,
    UnitCardStateWithMagic,
    ExpandedSectionsState,
    InheritableField,
    AmenityInheritanceSource,

    // Buildings component state types
    BuildingsComponentAlpineState,
    BuildingsComponentStateWithMagic,
    BuildingWithData,

    // Form state types
    BaseFormState,
    ScreeningCriteriaFormState,
    OfficeHoursEditorState,

    // Dialog state types
    BaseDialogState,
    AddUnitDialogState,
    BulkStatusDialogState,
    BulkRentDialogState,

    // Utility types
    TabKey,
    ToastType,
    SpecialtyType,
    VacancyStatus,
    FeedInclusionStatus
} from './alpine-state';

// ===== ALPINE.JS EVENT TYPES =====
export type {
    // Base event types
    BaseAlpineEvent,
    AlpineEventListener,

    // Building events
    BuildingUpdatedEvent,
    BuildingSaveEvent,
    BuildingSavingEvent,
    BuildingResetEvent,
    BuildingValidateEvent,
    BuildingDeletedEvent,

    // Unit events
    UnitSavedEvent,
    UnitDeletedEvent,
    UnitValidationErrorEvent,
    UnitsFilterEvent,
    UnitsUpdatedEvent,
    UnitsSelectionChangedEvent,
    UnitsBulkUpdateEvent,

    // Navigation events
    TabChangeEvent,
    SectionToggleEvent,

    // Toast events
    ToastShowEvent,
    LegacyToastShowEvent,
    ShowToastEvent,

    // Photo events
    PhotosUpdatedEvent,
    PhotoUploadEvent,
    PhotoDeleteEvent,

    // Tour events
    ToursUpdatedEvent,
    MarketingUpdatedEvent,

    // Location events
    LocationGeocodingEvent,
    LocationUpdatedEvent,

    // Amenity events
    AmenitiesUpdatedEvent,
    AmenityInheritanceResetEvent,

    // Form events
    FormValidationEvent,
    FormSubmittedEvent,
    FieldChangedEvent,

    // Dialog events
    DialogOpenEvent,
    DialogCloseEvent,

    // Search events
    SearchQueryEvent,
    FilterChangedEvent,

    // Event registry and utilities
    AlpineEventRegistry,
    AlpineEventName,
    AlpineEventPayload,
    TypedEventDispatcher,
    TypedEventListener,
    AlpineEvent,
    AlpineEventHandlerMap,
    BulkEventDispatcher
} from './alpine-events';

// ===== COMPONENT PROPS TYPES =====
export type {
    // Base props
    BaseComponentProps,
    BaseFormProps,
    AlpineModelProps,

    // Building component props
    BuildingProviderProps,
    BuildingsComponentProps,
    BuildingInfoTabProps,
    MarketingTabProps,
    PricingPoliciesTabProps,

    // Unit component props
    UnitCardProps,
    UnitTypeCardProps,
    UnitTypeFormProps,

    // Dialog props
    BaseDialogProps,
    AddUnitDialogProps,
    BulkStatusDialogProps,
    BulkRentDialogProps,

    // Form component props
    BaseInputProps,
    BaseSelectProps,
    BaseTextareaProps,
    AmenitySelectorProps,
    PhotoUploaderProps,
    FeeListEditorProps,
    PetPolicyEditorProps,
    LocationMapPickerProps,
    ScreeningCriteriaFormProps,
    OfficeHoursEditorProps,

    // Display component props
    SavingIndicatorProps,
    ValidationErrorProps,
    TabNavigatorProps,
    TabPanelsProps,

    // Utility component props
    DynamicListManagerProps,
    InheritableFieldProps,

    // Layout props
    LayoutProps,
    BaseHeadProps,

    // Specialized props
    UnitDetailsGridProps,
    UnitDescriptionsProps,
    UnitWebsiteStatusProps,
    UnitVacancyStatusProps,
    UnitBasicInfoProps,
    UnitDepositSectionProps,

    // Utility types
    ExtractProps,
    OptionalProps,
    RequiredProps,
    PropsWithChildren,
    PropsWithSlots
} from './component-props';

// ===== API TYPES =====
export type {
    // Base API types
    ApiResponse,
    ApiErrorResponse,
    PaginatedApiResponse,
    BulkOperationResponse,

    // Building API types
    CreateBuildingRequest,
    UpdateBuildingRequest,
    BuildingResponse,
    BuildingsListResponse,
    BuildingWithDataResponse,
    BuildingDeletionResponse,

    // Unit API types
    CreateUnitRequest,
    UpdateUnitRequest,
    UnitResponse,
    UnitsListResponse,
    UnitDeletionResponse,

    // Unit type API types
    CreateUnitTypeRequest,
    UpdateUnitTypeRequest,
    UnitTypeResponse,
    UnitTypesListResponse,
    UnitTypeDeletionResponse,

    // Bulk operations API types
    BulkStatusUpdateRequest,
    BulkRentUpdateRequest,
    BulkUnitsUpdateRequest,
    BulkUpdateResponse,

    // Photo API types
    PhotoUploadRequest,
    PhotoUploadResponse,
    PhotoDeletionRequest,
    PhotoDeletionResponse,

    // Validation API types
    ValidationRequest,
    ValidationResponse,

    // Search API types
    SearchRequest,
    SearchResponse,
    FilterOptionsResponse,

    // Geocoding API types
    GeocodingRequest,
    GeocodingResponse,
    ReverseGeocodingRequest,
    ReverseGeocodingResponse,

    // Analytics API types
    AnalyticsRequest,
    AnalyticsResponse,

    // Export/Import API types
    ExportRequest,
    ExportResponse,
    ImportRequest,
    ImportResponse,

    // Webhook API types
    WebhookEventType,
    WebhookPayload,

    // API client types
    ApiClientConfig,
    ApiRequestOptions,
    ApiClient
} from './api-types';

// ===== RE-EXPORT BASE TYPES =====
// Re-export commonly used types from other modules for convenience
export type { AlpineMagics, AlpineComponent } from '../alpine-types';
export type {
    BuildingData,
    UnitData,
    UnitTypeData,
    Amenity,
    VacancyClass,
    PropertyType,
    UtilityType,
    FeeType,
    DayOfWeek
} from '../../types';

// ===== UTILITY HELPER TYPES =====

/**
 * Helper type to make TypeScript's IntelliSense show the actual type structure
 * instead of just the type alias name
 */
export type Expand<T> = T extends (...args: infer A) => infer R
    ? (...args: Expand<A>) => Expand<R>
    : T extends infer O
        ? { [K in keyof O]: O[K] }
        : never;

/**
 * Helper type to make all properties in T optional recursively
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
        ? DeepPartial<U>[]
        : T[P] extends readonly (infer U)[]
            ? readonly DeepPartial<U>[]
            : T[P] extends object
                ? DeepPartial<T[P]>
                : T[P];
};

/**
 * Helper type to extract the return type of an Alpine.js x-data function
 */
export type ExtractAlpineData<T> = T extends () => infer R ? R : never;

/**
 * Helper type for Alpine.js x-model bindings
 */
export interface AlpineModelBinding<T, K extends keyof T> {
    'x-model': `${string}.${string & K}`
}

/**
 * Helper type for Alpine.js event handlers
 */
export type AlpineEventHandler<T extends string> = Record<`@${T}` | `x-on:${T}`, string>;

/**
 * Type guard to check if an object implements a specific Alpine state interface
 */
export function isAlpineState<T extends Record<string, unknown>>(
    obj: unknown,
    _stateType: new () => T
): obj is T {
    return (
        obj !== null &&
        obj !== undefined &&
        isObject(obj) &&
        'errors' in obj &&
        'saving' in obj &&
        isObject((obj as T).errors) &&
        isBoolean((obj as T).saving)
    );
}
/**
 * Type guard to check if an event is a valid Alpine event
 */
export function isAlpineEvent<T extends string>(
    _eventName: string,
    event: unknown
): event is CustomEvent<T> {
    return (
        isObject(event) &&
        event !== null &&
        'detail' in event
    );
}

// ===== CONSTANTS FOR TYPE SAFETY =====

/**
 * Available tab keys (for type narrowing)
 */
export const TAB_KEYS = [
    'building-info',
    'floorplans-units',
    'pricing-policies',
    'marketing',
    'units'
] as const;

/**
 * Available toast types (for type narrowing)
 */
export const TOAST_TYPES = ['success', 'error', 'warning', 'info'] as const;

/**
 * Available specialty types (for type narrowing)
 */
export const SPECIALTY_TYPES = ['market-rate', 'affordable', 'student', 'senior'] as const;

/**
 * Available vacancy statuses (for type narrowing)
 */
export const VACANCY_STATUSES = ['', 'Occupied', 'Unoccupied', 'Notice', 'Down'] as const;

/**
 * Available feed inclusion statuses (for type narrowing)
 */
export const FEED_INCLUSION_STATUSES = ['', 'active', 'inactive', 'pending', 'error'] as const;

/**
 * Available inheritable fields (for type narrowing)
 */
export const INHERITABLE_FIELDS = [
    'beds',
    'baths',
    'sqft',
    'rent',
    'maxOccupants',
    'perPersonRent',
    'deposit',
    'minLeaseTerm',
    'maxLeaseTerm'
] as const;

/**
 * Available amenity inheritance sources (for type narrowing)
 */
export const AMENITY_INHERITANCE_SOURCES = ['unit', 'floorplan', 'building', 'none'] as const;
