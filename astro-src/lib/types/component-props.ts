/**
 * Comprehensive TypeScript interfaces for Astro component props
 * Provides type safety for all component props across the application
 */

import type { BuildingData, UnitData, UnitTypeData } from '../../types';

// ===== BASE COMPONENT PROPS =====

/**
 * Base props that most components can accept
 */
export interface BaseComponentProps {
    /** Additional CSS classes */
    'class'?: string
    /** Unique identifier for the component */
    id?: string
    /** Data attributes for testing and JavaScript access */
    [key: `data-${string}`]: string
}

/**
 * Base form component props
 */
export interface BaseFormProps extends BaseComponentProps {
    /** Form field name */
    name: string
    /** Field label text */
    label?: string
    /** Whether the field is required */
    required?: boolean
    /** Whether the field is disabled */
    disabled?: boolean
    /** Validation error message */
    error?: string
    /** Help text for the field */
    helpText?: string
    /** Placeholder text */
    placeholder?: string
}

/**
 * Alpine.js model binding props
 */
export interface AlpineModelProps {
    /** Alpine.js x-model directive value */
    xModel: string
    /** Alpine.js x-data context reference */
    xData?: string
}

// ===== BUILDING COMPONENT PROPS =====

/**
 * BuildingProvider component props
 */
export interface BuildingProviderProps extends BaseComponentProps {
    building: BuildingData
    units: UnitData[]
    unitTypes: UnitTypeData[]
    apiURL: string
}

/**
 * BuildingsComponent props
 */
export interface BuildingsComponentProps extends BaseComponentProps {
    buildings: {
        building: BuildingData
        units: UnitData[]
        unitTypes: UnitTypeData[]
    }[]
    apiURL: string
}

/**
 * Building info tab props
 */
export interface BuildingInfoTabProps extends BaseComponentProps {
    building: BuildingData
    apiUrl: string
    errors?: Record<string, string>
}

/**
 * Marketing tab props
 */
export interface MarketingTabProps extends BaseComponentProps {
    building: BuildingData
    apiUrl: string
}

/**
 * Pricing policies tab props
 */
export interface PricingPoliciesTabProps extends BaseComponentProps {
    building: BuildingData
    errors: Record<string, string>
}

// ===== UNIT COMPONENT PROPS =====

/**
 * UnitCard component props
 */
export interface UnitCardProps extends BaseComponentProps {
    unit: UnitData
    unitTypes?: UnitTypeData[]
    apiUrl?: string
}

/**
 * Unit type card props
 */
export interface UnitTypeCardProps extends BaseComponentProps {
    unitType: UnitTypeData
    buildingId: string
    apiUrl: string
}

/**
 * Unit type form props
 */
export interface UnitTypeFormProps extends BaseComponentProps {
    unitType?: UnitTypeData
    buildingId: string
    apiUrl: string
    isEditing?: boolean
}

// ===== DIALOG COMPONENT PROPS =====

/**
 * Base dialog props
 */
export interface BaseDialogProps extends BaseComponentProps {
    /** Dialog identifier */
    dialogId?: string
    /** Whether dialog is initially open */
    isOpen?: boolean
    /** Dialog title */
    title?: string
    /** Maximum width class */
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

/**
 * Add unit dialog props
 */
export interface AddUnitDialogProps extends BaseDialogProps {
    building: {
        buildingID: string
        street: string
        city: string
        state: string
    }
    unitTypes: {
        modelID: string
        modelName: string
        beds: number
        baths: number
        sqft?: number
    }[]
    apiUrl: string
}

/**
 * Bulk status dialog props
 */
export interface BulkStatusDialogProps extends BaseDialogProps {
    building: {
        buildingID: string
    }
    apiUrl: string
}

/**
 * Bulk rent dialog props
 */
export interface BulkRentDialogProps extends BaseDialogProps {
    building: {
        buildingID: string
    }
    apiUrl: string
}

// ===== FORM COMPONENT PROPS =====

/**
 * Base input component props
 */
export interface BaseInputProps extends BaseFormProps, AlpineModelProps {
    /** Input type */
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'datetime-local' | 'time'
    /** Minimum value (for number inputs) */
    min?: number | string
    /** Maximum value (for number inputs) */
    max?: number | string
    /** Step value (for number inputs) */
    step?: number | string
    /** Input pattern for validation */
    pattern?: string
    /** Auto-complete attribute */
    autocomplete?: string
    /** Input size */
    size?: 'xs' | 'sm' | 'md' | 'lg'
}

/**
 * Base select component props
 */
export interface BaseSelectProps extends BaseFormProps, AlpineModelProps {
    /** Select options */
    options: {
        value: string | number
        label: string
        disabled?: boolean
    }[]
    /** Whether to include a default empty option */
    includeEmpty?: boolean
    /** Empty option label */
    emptyLabel?: string
    /** Select size */
    size?: 'xs' | 'sm' | 'md' | 'lg'
}

/**
 * Base textarea component props
 */
export interface BaseTextareaProps extends BaseFormProps, AlpineModelProps {
    /** Number of visible rows */
    rows?: number
    /** Maximum character length */
    maxLength?: number
    /** Whether to resize automatically */
    autoResize?: boolean
}

/**
 * Amenity selector props
 */
export interface AmenitySelectorProps extends BaseFormProps, AlpineModelProps {
    /** Whether to show the label */
    showLabel?: boolean
    /** Available amenity categories */
    categories?: string[]
    /** Whether to allow custom amenities */
    allowCustom?: boolean
}

/**
 * Photo uploader props
 */
export interface PhotoUploaderProps extends BaseFormProps, AlpineModelProps {
    /** Building ID for file organization */
    buildingId?: string
    /** Unit ID for unit-specific photos */
    unitId?: string
    /** Unit type ID for unit type photos */
    unitTypeId?: string
    /** Maximum number of photos */
    maxPhotos?: number
    /** Accepted file types */
    accept?: string
    /** Maximum file size in MB */
    maxFileSize?: number
}

/**
 * Fee list editor props
 */
export interface FeeListEditorProps extends BaseFormProps, AlpineModelProps {
    /** Fee type (oneTime or monthly) */
    feeType: 'oneTime' | 'monthly'
    /** Available fee categories */
    categories?: string[]
    /** Whether fees are required */
    required?: boolean
}

/**
 * Pet policy editor props
 */
export interface PetPolicyEditorProps extends BaseFormProps, AlpineModelProps {
    /** Available pet types */
    petTypes?: string[]
    /** Default pet policy */
    defaultPolicy?: {
        allowed: boolean
        petTypes: string[]
        deposit?: number
        rent?: number
        restrictions?: string[]
    }
}

/**
 * Location map picker props
 */
export interface LocationMapPickerProps extends BaseFormProps, AlpineModelProps {
    /** Initial latitude */
    latitude?: number
    /** Initial longitude */
    longitude?: number
    /** Map zoom level */
    zoom?: number
    /** Whether to show address search */
    showAddressSearch?: boolean
    /** API key for map service */
    apiKey?: string
}

/**
 * Screening criteria form props
 */
export interface ScreeningCriteriaFormProps extends BaseFormProps, AlpineModelProps {
    /** Whether to show the label */
    showLabel?: boolean
}

/**
 * Office hours editor props
 */
export interface OfficeHoursEditorProps extends BaseFormProps, AlpineModelProps {
    /** Default hours format */
    format?: '12' | '24'
    /** Days to include */
    includeDays?: string[]
    /** Whether to allow different hours per day */
    allowDifferentHours?: boolean
}

// ===== DISPLAY COMPONENT PROPS =====

/**
 * Saving indicator props
 */
export interface SavingIndicatorProps extends BaseComponentProps {
    /** Saving state */
    saving?: boolean
    /** Custom saving message */
    savingMessage?: string
    /** Show as inline or block */
    inline?: boolean
}

/**
 * Validation error props
 */
export interface ValidationErrorProps extends BaseComponentProps {
    /** Error message */
    error?: string
    /** Field name for error */
    field?: string
    /** Whether to show icon */
    showIcon?: boolean
}

/**
 * Tab navigator props
 */
export interface TabNavigatorProps extends BaseComponentProps {
    /** Available tabs */
    tabs: {
        key: string
        label: string
        mobileLabel?: string
        disabled?: boolean
        badge?: string | number
    }[]
    /** Active tab key */
    activeTab?: string
    /** Tab style */
    variant?: 'pills' | 'bordered' | 'lifted'
}

/**
 * Tab panels props
 */
export interface TabPanelsProps extends BaseComponentProps {
    /** Active panel key */
    activePanel?: string
    /** Whether to lazy-load panels */
    lazy?: boolean
}

// ===== UTILITY COMPONENT PROPS =====

/**
 * Dynamic list manager props
 */
export interface DynamicListManagerProps extends BaseFormProps, AlpineModelProps {
    /** Item template */
    itemTemplate?: string
    /** Minimum items */
    minItems?: number
    /** Maximum items */
    maxItems?: number
    /** Default item value */
    defaultItem?: unknown
    /** Item validation function */
    validateItem?: (item: unknown) => boolean
}

/**
 * Inheritable field props
 */
export interface InheritableFieldProps extends BaseInputProps {
    /** Inherited value */
    inheritedValue?: string | number
    /** Inheritance source */
    inheritanceSource?: 'floorplan' | 'building' | 'none'
    /** Whether field is currently inherited */
    isInherited?: boolean
    /** Reset to inherited callback */
    onResetToInherited?: () => void
}

// ===== LAYOUT COMPONENT PROPS =====

/**
 * Layout props
 */
export interface LayoutProps extends BaseComponentProps {
    title?: string
    description?: string
    /** Additional head content */
    head?: string
    /** Body classes */
    bodyClass?: string
}

/**
 * Base head props
 */
export interface BaseHeadProps extends BaseComponentProps {
    title: string
    description: string
    /** Open Graph image */
    image?: string
    /** Canonical URL */
    canonical?: string
    /** Additional meta tags */
    meta?: {
        name?: string
        property?: string
        content: string
    }[]
}

// ===== SPECIALIZED PROPS =====

/**
 * Unit details grid props (new component)
 */
export interface UnitDetailsGridProps extends BaseComponentProps {
    unit: UnitData
    unitTypes?: UnitTypeData[]
    showInheritance?: boolean
}

/**
 * Unit descriptions props (new component)
 */
export interface UnitDescriptionsProps extends BaseComponentProps {
    unit: UnitData
    readonly?: boolean
}

/**
 * Unit website status props (new component)
 */
export interface UnitWebsiteStatusProps extends BaseComponentProps {
    unit: UnitData
    readonly?: boolean
}

/**
 * Unit vacancy status props (new component)
 */
export interface UnitVacancyStatusProps extends BaseComponentProps {
    unit: UnitData
    readonly?: boolean
}

/**
 * Unit basic info props (new component)
 */
export interface UnitBasicInfoProps extends BaseComponentProps {
    unit: UnitData
    unitTypes?: UnitTypeData[]
    readonly?: boolean
}

/**
 * Unit deposit section props (new component)
 */
export interface UnitDepositSectionProps extends BaseComponentProps {
    unit: UnitData
    readonly?: boolean
    showInheritance?: boolean
    inheritedValue?: number | null
}

// ===== PROPS UTILITY TYPES =====

/**
 * Extract props from a component type
 */
export type ExtractProps<T> = T extends (props: infer P) => unknown ? P : never;

/**
 * Make all props optional (for default prop handling)
 */
export type OptionalProps<T> = Partial<T>;

/**
 * Make specific props required
 */
export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Props with children (for container components)
 */
export type PropsWithChildren<T = Record<string, unknown>> = T & {
    children?: unknown
};

/**
 * Props with named slot support.
 * Allows defining slot content through props.
 */
export type PropsWithSlots<T = Record<string, unknown>, S extends string = string> = T & {
    [K in S as `slot:${K}`]?: unknown
};
