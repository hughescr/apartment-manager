/**
 * Shared types for the Radar service modules
 */

/**
 * Options for Radar address autocomplete
 */
export interface RadarAutocompleteOptions {
    /** Search query string */
    query: string
    /** Optional coordinates for proximity bias */
    coordinates?: { lat: number, lon: number }
    /** Maximum number of results to return (default: 5) */
    limit?: number
}

/**
 * Structured address components from Radar
 */
export interface RadarAddressComponents {
    /** Street number and name */
    street?: string
    /** City name */
    city?: string
    /** State name or abbreviation */
    state?: string
    /** Country name */
    country?: string
    /** Postal/ZIP code */
    postalCode?: string
}

/**
 * Radar autocomplete result compatible with existing frontend expectations
 */
export interface RadarAutocompleteResult {
    /** Display text for the suggestion */
    displayText: string
    /** Optional description for additional context */
    description?: string
    /** Geographic coordinates if available */
    coordinates?: { lat: number, lon: number }
    /** Structured address components */
    components: RadarAddressComponents
    /** Confidence score from Radar (if provided) */
    confidence?: number
    /** Source that provided the suggestion */
    source: 'radar' | 'cache'
    /** Unique identifier for the suggestion */
    id: string
}

/**
 * Result from geolocation operations
 */
export interface GeolocationResult {
    /** Latitude coordinate */
    lat: number
    /** Longitude coordinate */
    lon: number
    /** Confidence level if available */
    confidence?: string
    /** Source of the location data */
    source: 'browser' | 'ip' | 'fallback'
}

/**
 * Error details for Radar service failures
 */
export interface RadarServiceError {
    /** Error code for programmatic handling */
    code: 'NETWORK_ERROR' | 'INVALID_QUERY' | 'NO_RESULTS' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE' | 'UNAUTHORIZED'
    /** Human-readable error message */
    message: string
    /** Original error if applicable */
    originalError?: Error
}

/**
 * Radar API autocomplete response structure
 */
export interface RadarAutocompleteResponse {
    addresses: {
        formattedAddress: string
        placeLabel?: string
        confidence?: 'exact' | 'high' | 'medium' | 'low'
        geometry: {
            type: 'Point'
            coordinates: [number, number] // [longitude, latitude]
        }
        addressLabel?: string
        city?: string
        state?: string
        postalCode?: string
        country?: string
        layer: 'address' | 'place'
    }[]
}

/**
 * Radar API IP geocoding response structure
 */
export interface RadarIPGeocodeResponse {
    address: {
        formattedAddress?: string
        city?: string
        state?: string
        country?: string
        postalCode?: string
        confidence?: 'exact' | 'high' | 'medium' | 'low'
        geometry: {
            type: 'Point'
            coordinates: [number, number] // [longitude, latitude]
        }
    }
}

/**
 * Radar API forward geocoding response structure
 */
export interface RadarForwardGeocodeResponse {
    addresses: {
        formattedAddress: string
        confidence?: 'exact' | 'high' | 'medium' | 'low'
        geometry: {
            type: 'Point'
            coordinates: [number, number] // [longitude, latitude]
        }
        city?: string
        state?: string
        postalCode?: string
        country?: string
    }[]
}

/**
 * Cache entry for autocomplete results with access tracking for LRU
 */
export interface AutocompleteCacheEntry {
    results: RadarAutocompleteResult[]
    timestamp: number
    lastAccessed: number
}

/**
 * Cache entry for IP geocoding results with access tracking for LRU
 */
export interface IPCacheEntry {
    result: GeolocationResult
    timestamp: number
    lastAccessed: number
}
