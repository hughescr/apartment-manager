import { logger as baseLogger } from '@hughescr/logger';
import { Resource } from 'sst';
import _ from 'lodash';

const logger = baseLogger;

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
interface RadarAutocompleteResponse {
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
interface RadarIPGeocodeResponse {
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
interface RadarForwardGeocodeResponse {
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
 * Cache entry for autocomplete results
 */
interface AutocompleteCacheEntry {
    results: RadarAutocompleteResult[]
    timestamp: number
}

/**
 * Cache entry for IP geocoding results
 */
interface IPCacheEntry {
    result: GeolocationResult
    timestamp: number
}

/**
 * Simple in-memory cache for Radar results
 * In production, this could be replaced with Redis or DynamoDB
 */
class RadarCache {
    private autocompleteCache = new Map<string, AutocompleteCacheEntry>();
    private ipCache = new Map<string, IPCacheEntry>();
    private readonly autocompleteTtlMs = 5 * 60 * 1000; // 5 minutes
    private readonly ipTtlMs = 60 * 60 * 1000; // 1 hour

    private createAutocompleteKey(query: string, coordinates?: { lat: number, lon: number }): string {
        const baseKey = _.trim(_.toLower(query));
        if(coordinates) {
            return `${baseKey}:${coordinates.lat.toFixed(4)},${coordinates.lon.toFixed(4)}`;
        }
        return baseKey;
    }

    getAutocomplete(query: string, coordinates?: { lat: number, lon: number }): RadarAutocompleteResult[] | null {
        const key = this.createAutocompleteKey(query, coordinates);
        const entry = this.autocompleteCache.get(key);

        if(!entry) {
            return null;
        }

        // Check if entry has expired
        if(Date.now() - entry.timestamp > this.autocompleteTtlMs) {
            this.autocompleteCache.delete(key);
            return null;
        }

        logger.debug(`Autocomplete cache hit for query: ${key}`);
        return _.map(entry.results, r => ({ ...r, source: 'cache' as const }));
    }

    setAutocomplete(query: string, results: RadarAutocompleteResult[], coordinates?: { lat: number, lon: number }): void {
        const key = this.createAutocompleteKey(query, coordinates);
        this.autocompleteCache.set(key, {
            results: _.map(results, r => ({ ...r, source: 'radar' as const })),
            timestamp: Date.now()
        });
        logger.debug(`Cached ${results.length} autocomplete results for query: ${key}`);
    }

    getIP(clientIP: string): GeolocationResult | null {
        const entry = this.ipCache.get(clientIP);

        if(!entry) {
            return null;
        }

        // Check if entry has expired
        if(Date.now() - entry.timestamp > this.ipTtlMs) {
            this.ipCache.delete(clientIP);
            return null;
        }

        logger.debug(`IP cache hit for: ${clientIP}`);
        return entry.result;
    }

    setIP(clientIP: string, result: GeolocationResult): void {
        this.ipCache.set(clientIP, {
            result,
            timestamp: Date.now()
        });
        logger.debug(`Cached IP geocoding result for: ${clientIP}`);
    }

    clear(): void {
        this.autocompleteCache.clear();
        this.ipCache.clear();
        logger.info('Radar cache cleared');
    }

    getStats(): { autocompleteSize: number, ipSize: number, autocompleteTtlMinutes: number, ipTtlMinutes: number } {
        return {
            autocompleteSize: this.autocompleteCache.size,
            ipSize: this.ipCache.size,
            autocompleteTtlMinutes: 5,
            ipTtlMinutes: 60
        };
    }
}

/**
 * Rate limiter for Radar API requests
 * Radar allows up to 100 requests per second on paid plans, 10 per second on free tier
 */
class RateLimiter {
    private lastRequestTime = 0;
    private readonly minIntervalMs = 100; // Conservative 100ms between requests

    async waitIfNeeded(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if(timeSinceLastRequest < this.minIntervalMs) {
            const waitTime = this.minIntervalMs - timeSinceLastRequest;
            logger.debug(`Rate limiting: waiting ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }
}

/**
 * Debouncer to prevent excessive API calls during typing
 */
class Debouncer {
    private timeouts = new Map<string, ReturnType<typeof setTimeout>>();
    private readonly debounceMs = 200; // 200ms debounce

    async debounce<T>(key: string, fn: () => Promise<T>): Promise<T> {
        // Clear existing timeout for this key
        const existingTimeout = this.timeouts.get(key);
        if(existingTimeout) {
            clearTimeout(existingTimeout);
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(async () => {
                try {
                    this.timeouts.delete(key);
                    const result = await fn();
                    resolve(result);
                } catch(error) {
                    reject(error);
                }
            }, this.debounceMs);

            this.timeouts.set(key, timeout);
        });
    }
}

// Singleton instances
const cache = new RadarCache();
const rateLimiter = new RateLimiter();
const debouncer = new Debouncer();

/**
 * Comprehensive Radar service for address autocomplete, geocoding, and location services
 *
 * Features:
 * - Address autocomplete with proximity bias
 * - IP-based geocoding for user location detection
 * - Forward geocoding for address to coordinates conversion
 * - Smart location fallback chain (browser → IP → default)
 * - Caching to minimize API calls
 * - Rate limiting and debouncing
 * - Comprehensive error handling
 * - TypeScript types for all interactions
 */
export class RadarService {
    private readonly baseUrl = 'https://api.radar.io/v1';
    private readonly userAgent = 'apartment-manager/1.0';

    /**
     * Get the Radar API key from SST secrets
     */
    private getApiKey(): string {
        return Resource.RADAR_SECRET_KEY.value;
    }

    /**
     * Create authorization header for Radar API
     */
    private createAuthHeader(): string {
        const apiKey = this.getApiKey();
        // Radar API keys come with prj_ prefix already, use as-is
        if(_.startsWith(apiKey, 'prj_live_') || _.startsWith(apiKey, 'prj_test_')) {
            return apiKey;
        }
        // Fallback for keys without prefix (shouldn't happen with Radar)
        return `prj_test_${apiKey}`;
    }

    /**
     * Make authenticated request to Radar API
     */
    private async makeRequest(endpoint: string, params: Record<string, string>): Promise<Response> {
        await rateLimiter.waitIfNeeded();

        const url = new URL(`${this.baseUrl}${endpoint}`);
        _.forEach(params, (value, key) => {
            if(value) {
                url.searchParams.set(key, value);
            }
        });

        return fetch(url.toString(), {
            headers: {
                Authorization: this.createAuthHeader(),
                'User-Agent': this.userAgent,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Get user location from IP address
     * Uses Radar's IP geocoding API as fallback when browser geolocation isn't available
     */
    async getLocationFromIP(clientIP?: string): Promise<GeolocationResult | null> {
        try {
            // Use a placeholder IP if none provided (Radar will use request IP)
            const ipAddress = clientIP || 'auto';

            // Check cache first
            if(clientIP) {
                const cachedResult = cache.getIP(clientIP);
                if(cachedResult) {
                    return cachedResult;
                }
            }

            logger.info(`Getting location from IP: ${ipAddress}`);

            const response = await this.makeRequest('/geocode/ip', {});

            if(!response.ok) {
                let errorCode: RadarServiceError['code'] = 'SERVICE_UNAVAILABLE';
                if(response.status === 429) {
                    errorCode = 'RATE_LIMITED';
                } else if(response.status === 401) {
                    errorCode = 'UNAUTHORIZED';
                }

                const error: RadarServiceError = {
                    code: errorCode,
                    message: `Radar IP geocoding error: ${response.status} ${response.statusText}`
                };
                logger.error('IP geocoding API error', error);
                return null;
            }

            const data = await response.json() as RadarIPGeocodeResponse;

            if(!data?.address?.geometry?.coordinates) {
                logger.warn('No location data from IP geocoding');
                return null;
            }

            const coords = data.address.geometry.coordinates;
            const result: GeolocationResult = {
                lat: coords[1], // Radar returns [lng, lat]
                lon: coords[0],
                confidence: data.address.confidence,
                source: 'ip'
            };

            // Cache the result if we have a specific IP
            if(clientIP) {
                cache.setIP(clientIP, result);
            }

            logger.info(`IP geocoding successful: ${ipAddress} -> ${result.lat}, ${result.lon}`);
            return result;
        } catch(error) {
            const serviceError: RadarServiceError = {
                code: 'NETWORK_ERROR',
                message: 'Failed to get location from IP',
                originalError: error as Error
            };
            logger.error('IP geocoding failed', serviceError);
            return null;
        }
    }

    /**
     * Get address suggestions with optional proximity bias
     * Uses Radar's autocomplete API for high-quality address suggestions
     */
    async autocompleteAddress(options: RadarAutocompleteOptions): Promise<RadarAutocompleteResult[]> {
        try {
            // Validate query
            const trimmedQuery = _.trim(options.query);
            if(!trimmedQuery || trimmedQuery.length < 3) {
                logger.debug('Query too short for autocomplete', { query: trimmedQuery });
                return [];
            }

            if(trimmedQuery.length > 100) {
                logger.warn('Query too long for autocomplete', { query: trimmedQuery });
                return [];
            }

            const limit = Math.min(options.limit || 5, 10);

            // Check cache first
            const cachedResults = cache.getAutocomplete(trimmedQuery, options.coordinates);
            if(cachedResults) {
                return cachedResults.slice(0, limit);
            }

            logger.info(`Getting address autocomplete suggestions: ${trimmedQuery}`);

            // Use debouncer to prevent excessive API calls
            const results = await debouncer.debounce(trimmedQuery, async () => {
                const params: Record<string, string> = {
                    query: trimmedQuery,
                    country: 'US',
                    layers: 'address,place',
                    limit: limit.toString()
                };

                // Add proximity bias if coordinates provided
                if(options.coordinates) {
                    params.near = `${options.coordinates.lat},${options.coordinates.lon}`;
                }

                const response = await this.makeRequest('/search/autocomplete', params);

                if(!response.ok) {
                    let errorCode: RadarServiceError['code'] = 'SERVICE_UNAVAILABLE';
                    if(response.status === 429) {
                        errorCode = 'RATE_LIMITED';
                    } else if(response.status === 401) {
                        errorCode = 'UNAUTHORIZED';
                    }

                    const error: RadarServiceError = {
                        code: errorCode,
                        message: `Radar autocomplete error: ${response.status} ${response.statusText}`
                    };
                    logger.error('Autocomplete API error', error);
                    return [];
                }

                const data = await response.json() as RadarAutocompleteResponse;

                if(!data?.addresses || data.addresses.length === 0) {
                    logger.debug(`No autocomplete suggestions found for query: ${trimmedQuery}`);
                    return [];
                }

                const parsedResults = this.parseAutocompleteResults(data.addresses);

                // Cache the results
                cache.setAutocomplete(trimmedQuery, parsedResults, options.coordinates);

                logger.info(`Retrieved ${parsedResults.length} autocomplete suggestions for query: ${trimmedQuery}`);
                return parsedResults;
            });

            return results.slice(0, limit);
        } catch(error) {
            const serviceError: RadarServiceError = {
                code: 'NETWORK_ERROR',
                message: 'Failed to get address autocomplete suggestions',
                originalError: error as Error
            };
            logger.error('Address autocomplete failed', serviceError);
            return [];
        }
    }

    /**
     * Convert address to coordinates using forward geocoding
     * Uses Radar's forward geocoding API for precise coordinate conversion
     */
    async geocodeAddress(address: string): Promise<{ lat: number, lon: number } | null> {
        try {
            const trimmedAddress = _.trim(address);
            if(!trimmedAddress) {
                logger.warn('Empty address provided for geocoding');
                return null;
            }

            logger.info(`Forward geocoding address: ${trimmedAddress}`);

            const response = await this.makeRequest('/geocode/forward', {
                query: trimmedAddress,
                country: 'US',
                limit: '1'
            });

            if(!response.ok) {
                let errorCode: RadarServiceError['code'] = 'SERVICE_UNAVAILABLE';
                if(response.status === 429) {
                    errorCode = 'RATE_LIMITED';
                } else if(response.status === 401) {
                    errorCode = 'UNAUTHORIZED';
                }

                const error: RadarServiceError = {
                    code: errorCode,
                    message: `Radar geocoding error: ${response.status} ${response.statusText}`
                };
                logger.error('Forward geocoding API error', error);
                return null;
            }

            const data = await response.json() as RadarForwardGeocodeResponse;

            if(!data?.addresses || data.addresses.length === 0) {
                logger.warn(`No geocoding results found for address: ${trimmedAddress}`);
                return null;
            }

            const coords = data.addresses[0].geometry.coordinates;
            const result = {
                lat: coords[1], // Radar returns [lng, lat]
                lon: coords[0]
            };

            logger.info(`Forward geocoding successful: ${trimmedAddress} -> ${result.lat}, ${result.lon}`);
            return result;
        } catch(error) {
            const serviceError: RadarServiceError = {
                code: 'NETWORK_ERROR',
                message: 'Failed to geocode address',
                originalError: error as Error
            };
            logger.error('Forward geocoding failed', serviceError);
            return null;
        }
    }

    /**
     * Get default location (San Francisco coordinates)
     * Used as final fallback when other location methods fail
     */
    getDefaultLocation(): GeolocationResult {
        return {
            lat: 37.7749,
            lon: -122.4194,
            source: 'fallback'
        };
    }

    /**
     * Parse Radar autocomplete results into our standard format
     */
    private parseAutocompleteResults(addresses: RadarAutocompleteResponse['addresses']): RadarAutocompleteResult[] {
        return _(addresses)
            .map((address, index) => this.parseAutocompleteAddress(address, index))
            .compact()
            .value();
    }

    /**
     * Parse a single Radar autocomplete address into our format
     */
    private parseAutocompleteAddress(address: RadarAutocompleteResponse['addresses'][0], index: number): RadarAutocompleteResult | null {
        try {
            const coords = address.geometry.coordinates;

            // Use placeLabel for places, addressLabel for addresses, or fall back to formattedAddress
            const displayText = address.placeLabel || address.addressLabel || address.formattedAddress;

            if(!displayText) {
                return null;
            }

            const components: RadarAddressComponents = {
                street: address.addressLabel,
                city: address.city,
                state: address.state,
                country: address.country,
                postalCode: address.postalCode
            };

            // Map Radar confidence levels to numeric scores
            const confidenceMap = {
                exact: 1.0,
                high: 0.8,
                medium: 0.6,
                low: 0.4
            };

            return {
                displayText,
                description: address.layer === 'place' ? 'Place' : 'Address',
                coordinates: {
                    lat: coords[1], // Radar returns [lng, lat]
                    lon: coords[0]
                },
                components,
                confidence: address.confidence ? confidenceMap[address.confidence] : undefined,
                source: 'radar',
                id: `radar_${address.layer}_${index}_${Date.now()}`
            };
        } catch(error) {
            logger.warn('Failed to parse Radar autocomplete address', { address, error });
            return null;
        }
    }

    /**
     * Clear all caches
     */
    clearCache(): void {
        cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { autocompleteSize: number, ipSize: number, autocompleteTtlMinutes: number, ipTtlMinutes: number } {
        return cache.getStats();
    }
}

// Export singleton instance
export const radarService = new RadarService();

/**
 * Helper function for backward compatibility - get address suggestions
 * Compatible with existing frontend expectations
 */
export async function getAddressSuggestions(
    query: string,
    limit = 5,
    coordinates?: { lat: number, lon: number }
): Promise<RadarAutocompleteResult[]> {
    return radarService.autocompleteAddress({ query, limit, coordinates });
}

/**
 * Helper function for getting user location with smart fallback chain
 * 1. Use provided browser coordinates (if available)
 * 2. Fall back to IP-based geocoding
 * 3. Final fallback: US West Coast (San Francisco)
 */
export async function getUserLocation(
    browserCoords?: { lat: number, lon: number },
    clientIP?: string
): Promise<GeolocationResult> {
    // Use browser coordinates if available
    if(browserCoords) {
        logger.info('Using browser geolocation coordinates');
        return {
            lat: browserCoords.lat,
            lon: browserCoords.lon,
            source: 'browser'
        };
    }

    // Try IP-based geocoding
    const ipLocation = await radarService.getLocationFromIP(clientIP);
    if(ipLocation) {
        return ipLocation;
    }

    // Fall back to default location
    logger.info('Using default fallback location (San Francisco)');
    return radarService.getDefaultLocation();
}
