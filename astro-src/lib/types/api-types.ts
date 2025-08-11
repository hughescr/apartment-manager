/**
 * Comprehensive TypeScript interfaces for API requests and responses
 * Provides type safety for all API interactions in Alpine.js components
 */

import type { BuildingData, UnitData, UnitTypeData, Amenity, VacancyClass } from '../../types';
import type { SpecialtyType } from './alpine-state';

// ===== BASE API TYPES =====

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
    message?: string
    timestamp?: string
}

/**
 * API error response
 */
export interface ApiErrorResponse {
    success: false
    error: string
    message?: string
    details?: Record<string, unknown>
    statusCode?: number
}

/**
 * Paginated API response
 */
export interface PaginatedApiResponse<T = unknown> {
    data: T[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
        hasNext: boolean
        hasPrev: boolean
    }
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse {
    success: boolean
    processed: number
    failed: number
    errors?: {
        id: string
        error: string
    }[]
}

// ===== BUILDING API TYPES =====

/**
 * Building creation request
 */
export interface CreateBuildingRequest {
    buildingID: string
    street?: string
    city?: string
    state?: string
    zip?: string
    description?: string
    specialtyType?: SpecialtyType
    contactInfo?: {
        propertyWebsite?: string
        managementWebsite?: string
    }
}

/**
 * Building update request
 */
export interface UpdateBuildingRequest extends Partial<BuildingData> {
    buildingID: string
}

/**
 * Building response
 */
export type BuildingResponse = ApiResponse<BuildingData>;

/**
 * Buildings list response
 */
export type BuildingsListResponse = ApiResponse<BuildingData[]>;

/**
 * Building with related data response
 */
export type BuildingWithDataResponse = ApiResponse<{
    building: BuildingData
    units: UnitData[]
    unitTypes: UnitTypeData[]
}>;

/**
 * Building deletion response
 */
export type BuildingDeletionResponse = ApiResponse<{
    buildingID: string
    deletedAt: string
}>;

// ===== UNIT API TYPES =====

/**
 * Unit creation request
 */
export interface CreateUnitRequest {
    buildingID: string
    unitID: string
    modelID?: string
    unitNumber?: string
    beds?: number
    baths?: number
    sqft?: number
    rent?: number
    deposit?: number | {
        amount: number
        refundable?: boolean
        partialRefundPercentage?: number
    }
    maxOccupants?: number
    perPersonRent?: number
    minLeaseTerm?: number
    maxLeaseTerm?: number
    availableDate?: string
    vacancyClass?: VacancyClass
    vacateDate?: string
    madeReadyDate?: string
    status?: string
    description?: string
    unitDescription?: string
    unitAmenities?: Amenity[]
    photos?: string[]
    feedInclusion?: Record<string, string>
    manualReferences?: Record<string, string>
    unitRentSpecial?: {
        title?: string
        description?: string
        startDate?: string
        endDate?: string
    }
}

/**
 * Unit update request
 */
export interface UpdateUnitRequest extends Partial<CreateUnitRequest> {
    unitID: string
    buildingID: string
}

/**
 * Unit response
 */
export type UnitResponse = ApiResponse<UnitData>;

/**
 * Units list response
 */
export type UnitsListResponse = ApiResponse<UnitData[]>;

/**
 * Unit deletion response
 */
export type UnitDeletionResponse = ApiResponse<{
    unitID: string
    buildingID: string
    deletedAt: string
}>;

// ===== UNIT TYPE API TYPES =====

/**
 * Unit type creation request
 */
export interface CreateUnitTypeRequest {
    buildingID: string
    modelID: string
    modelName: string
    beds: number
    baths: number
    minSqft?: number
    maxSqft?: number
    minRent?: number
    maxRent?: number
    deposit?: number | {
        amount: number
        refundable?: boolean
        partialRefundPercentage?: number
    }
    maxOccupants?: number
    perPersonRent?: number
    minLeaseTerm?: number
    maxLeaseTerm?: number
    modelAmenities?: Amenity[]
    photos?: string[]
    description?: string
}

/**
 * Unit type update request
 */
export interface UpdateUnitTypeRequest extends Partial<CreateUnitTypeRequest> {
    modelID: string
    buildingID: string
}

/**
 * Unit type response
 */
export type UnitTypeResponse = ApiResponse<UnitTypeData>;

/**
 * Unit types list response
 */
export type UnitTypesListResponse = ApiResponse<UnitTypeData[]>;

/**
 * Unit type deletion response
 */
export type UnitTypeDeletionResponse = ApiResponse<{
    modelID: string
    buildingID: string
    deletedAt: string
}>;

// ===== BULK OPERATIONS API TYPES =====

/**
 * Bulk unit status update request
 */
export interface BulkStatusUpdateRequest {
    unitIDs: string[]
    updates: {
        status?: string
        vacancyClass?: VacancyClass
        availableDate?: string
        vacateDate?: string
        madeReadyDate?: string
    }
}

/**
 * Bulk unit rent update request
 */
export interface BulkRentUpdateRequest {
    unitIDs: string[]
    updates: {
        rentType: 'absolute' | 'percentage'
        rentValue: number
    }
}

/**
 * Bulk units update request (generic)
 */
export interface BulkUnitsUpdateRequest {
    unitIDs: string[]
    updates: Partial<UnitData>
}

/**
 * Bulk operation response
 */
export interface BulkUpdateResponse extends BulkOperationResponse {
    updatedUnits?: string[]
}

// ===== PHOTO UPLOAD API TYPES =====

/**
 * Photo upload request
 */
export interface PhotoUploadRequest {
    entityType: 'building' | 'unit' | 'unitType'
    entityID: string
    buildingID?: string
    files: File[]
}

/**
 * Photo upload response
 */
export type PhotoUploadResponse = ApiResponse<{
    uploadedPhotos: {
        filename: string
        url: string
        size: number
        mimeType: string
    }[]
    failedUploads?: {
        filename: string
        error: string
    }[]
}>;

/**
 * Photo deletion request
 */
export interface PhotoDeletionRequest {
    entityType: 'building' | 'unit' | 'unitType'
    entityID: string
    buildingID?: string
    photoUrl: string
}

/**
 * Photo deletion response
 */
export type PhotoDeletionResponse = ApiResponse<{
    deletedPhoto: string
    deletedAt: string
}>;

// ===== VALIDATION API TYPES =====

/**
 * Validation request
 */
export interface ValidationRequest {
    entityType: 'building' | 'unit' | 'unitType'
    data: Record<string, unknown>
    rules?: string[]
}

/**
 * Validation response
 */
export type ValidationResponse = ApiResponse<{
    isValid: boolean
    errors: Record<string, string[]>
    warnings?: Record<string, string[]>
}>;

// ===== SEARCH AND FILTER API TYPES =====

/**
 * Search request
 */
export interface SearchRequest {
    query: string
    entityTypes?: ('building' | 'unit' | 'unitType')[]
    filters?: Record<string, unknown>
    sort?: {
        field: string
        direction: 'asc' | 'desc'
    }
    pagination?: {
        page: number
        limit: number
    }
}

/**
 * Search response
 */
export interface SearchResponse<T = unknown> extends PaginatedApiResponse<T> {
    query: string
    suggestions?: string[]
    facets?: Record<string, {
        value: string
        count: number
    }[]>
}

/**
 * Filter options response
 */
export type FilterOptionsResponse = ApiResponse<{
    statusOptions: {
        value: string
        label: string
        count: number
    }[]
    amenityOptions: {
        category: string
        amenities: Amenity[]
    }[]
    priceRanges: {
        min: number
        max: number
        count: number
    }[]
}>;

// ===== GEOCODING API TYPES =====

/**
 * Geocoding request
 */
export interface GeocodingRequest {
    address: string
    buildingID?: string
}

/**
 * Geocoding response
 */
export type GeocodingResponse = ApiResponse<{
    latitude: number
    longitude: number
    formattedAddress: string
    accuracy: 'exact' | 'approximate' | 'interpolated'
    components: {
        street?: string
        city?: string
        state?: string
        zip?: string
        country?: string
    }
}>;

/**
 * Reverse geocoding request
 */
export interface ReverseGeocodingRequest {
    latitude: number
    longitude: number
}

/**
 * Reverse geocoding response
 */
export type ReverseGeocodingResponse = GeocodingResponse;

// ===== ANALYTICS API TYPES =====

/**
 * Analytics request
 */
export interface AnalyticsRequest {
    entityType: 'building' | 'unit' | 'unitType'
    entityID: string
    metrics: string[]
    timeRange?: {
        start: string
        end: string
    }
    groupBy?: 'day' | 'week' | 'month'
}

/**
 * Analytics response
 */
export type AnalyticsResponse = ApiResponse<{
    metrics: Record<string, {
        current: number
        previous?: number
        change?: number
        data?: {
            date: string
            value: number
        }[]
    }>
}>;

// ===== EXPORT/IMPORT API TYPES =====

/**
 * Export request
 */
export interface ExportRequest {
    entityType: 'building' | 'unit' | 'unitType'
    entityIDs?: string[]
    format: 'json' | 'csv' | 'xlsx'
    fields?: string[]
    includePhotos?: boolean
}

/**
 * Export response
 */
export type ExportResponse = ApiResponse<{
    downloadUrl: string
    filename: string
    expiresAt: string
}>;

/**
 * Import request
 */
export interface ImportRequest {
    entityType: 'building' | 'unit' | 'unitType'
    file: File
    options?: {
        skipDuplicates?: boolean
        updateExisting?: boolean
        validateOnly?: boolean
    }
}

/**
 * Import response
 */
export interface ImportResponse extends BulkOperationResponse {
    preview?: {
        row: number
        data: Record<string, unknown>
        warnings?: string[]
    }[]
}

// ===== WEBHOOK API TYPES =====

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'building.created'
  | 'building.updated'
  | 'building.deleted'
  | 'unit.created'
  | 'unit.updated'
  | 'unit.deleted'
  | 'unitType.created'
  | 'unitType.updated'
  | 'unitType.deleted';

/**
 * Webhook payload
 */
export interface WebhookPayload<T = unknown> {
    event: WebhookEventType
    timestamp: string
    data: T
    metadata?: Record<string, unknown>
}

// ===== API CLIENT TYPES =====

/**
 * API client configuration
 */
export interface ApiClientConfig {
    baseURL: string
    timeout?: number
    retries?: number
    retryDelay?: number
    headers?: Record<string, string>
    interceptors?: {
        request?: (config: RequestInit) => RequestInit
        response?: <T>(response: ApiResponse<T>) => ApiResponse<T>
    }
}

/**
 * API request options
 */
export interface ApiRequestOptions extends RequestInit {
    timeout?: number
    retries?: number
    validateResponse?: boolean
}

/**
 * API client methods interface
 */
export interface ApiClient {
    // Building methods
    getBuildings(): Promise<BuildingsListResponse>
    getBuilding(buildingID: string): Promise<BuildingResponse>
    createBuilding(data: CreateBuildingRequest): Promise<BuildingResponse>
    updateBuilding(buildingID: string, data: UpdateBuildingRequest): Promise<BuildingResponse>
    deleteBuilding(buildingID: string): Promise<BuildingDeletionResponse>

    // Unit methods
    getUnits(buildingID: string): Promise<UnitsListResponse>
    getUnit(buildingID: string, unitID: string): Promise<UnitResponse>
    createUnit(data: CreateUnitRequest): Promise<UnitResponse>
    updateUnit(buildingID: string, unitID: string, data: UpdateUnitRequest): Promise<UnitResponse>
    deleteUnit(buildingID: string, unitID: string): Promise<UnitDeletionResponse>

    // Unit type methods
    getUnitTypes(buildingID: string): Promise<UnitTypesListResponse>
    getUnitType(buildingID: string, modelID: string): Promise<UnitTypeResponse>
    createUnitType(data: CreateUnitTypeRequest): Promise<UnitTypeResponse>
    updateUnitType(buildingID: string, modelID: string, data: UpdateUnitTypeRequest): Promise<UnitTypeResponse>
    deleteUnitType(buildingID: string, modelID: string): Promise<UnitTypeDeletionResponse>

    // Bulk operations
    bulkUpdateUnits(data: BulkUnitsUpdateRequest): Promise<BulkUpdateResponse>
    bulkUpdateStatus(data: BulkStatusUpdateRequest): Promise<BulkUpdateResponse>
    bulkUpdateRent(data: BulkRentUpdateRequest): Promise<BulkUpdateResponse>

    // Photo operations
    uploadPhotos(data: PhotoUploadRequest): Promise<PhotoUploadResponse>
    deletePhoto(data: PhotoDeletionRequest): Promise<PhotoDeletionResponse>

    // Utility methods
    validate(data: ValidationRequest): Promise<ValidationResponse>
    search<T = unknown>(data: SearchRequest): Promise<SearchResponse<T>>
    geocode(data: GeocodingRequest): Promise<GeocodingResponse>
    reverseGeocode(data: ReverseGeocodingRequest): Promise<ReverseGeocodingResponse>
}
