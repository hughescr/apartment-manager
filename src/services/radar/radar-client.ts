import { logger as baseLogger } from '@hughescr/logger';
import { Resource } from 'sst';
import { forEach, trim, chain } from 'lodash';
import pDebounce from 'p-debounce';
import pThrottle from 'p-throttle';
import { RadarCache } from './radar-cache';
import type {
    RadarAutocompleteOptions,
    RadarAutocompleteResult,
    GeolocationResult,
    RadarServiceError,
    RadarAutocompleteResponse,
    RadarIPGeocodeResponse,
    RadarForwardGeocodeResponse
} from './types';
import { startsWith } from 'lodash';

const logger = baseLogger;

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
export class RadarClient {
    private readonly baseUrl = 'https://api.radar.io/v1';
    private readonly userAgent = 'apartment-manager/1.0';
    private cache: RadarCache;
    private throttledMakeRequest: (endpoint: string, params: Record<string, string>) => Promise<Response>;
    private debouncedAutocomplete: Map<string, (() => Promise<RadarAutocompleteResult[]>)>;

    constructor(cache: RadarCache) {
        this.cache = cache;

        // Create a throttled version of makeRequest (10 requests per second)
        const throttle = pThrottle({
            limit: 10,
            interval: 1000
        });
        this.throttledMakeRequest = throttle(this.makeRequestInternal.bind(this));

        // Store debounced functions per query key
        this.debouncedAutocomplete = new Map();
    }

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
        if(startsWith(apiKey, 'prj_live_') || startsWith(apiKey, 'prj_test_')) {
            return apiKey;
        }
        // Fallback for keys without prefix (shouldn't happen with Radar)
        return `prj_test_${apiKey}`;
    }

    /**
     * Internal method for making requests (before throttling)
     */
    private async makeRequestInternal(endpoint: string, params: Record<string, string>): Promise<Response> {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        forEach(params, (value, key) => {
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
     * Make authenticated request to Radar API (throttled)
     */
    private async makeRequest(endpoint: string, params: Record<string, string>): Promise<Response> {
        return this.throttledMakeRequest(endpoint, params);
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
                const cachedResult = this.cache.getIP(clientIP);
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
                this.cache.setIP(clientIP, result);
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
            const trimmedQuery = trim(options.query);
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
            const cachedResults = this.cache.getAutocomplete(trimmedQuery, options.coordinates);
            if(cachedResults) {
                return cachedResults.slice(0, limit);
            }
            // Get or create a debounced function for this specific query
            // This ensures each unique query gets its own debounce timer
            let debouncedFn = this.debouncedAutocomplete.get(trimmedQuery);
            if(!debouncedFn) {
                debouncedFn = pDebounce(async (): Promise<RadarAutocompleteResult[]> => {
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
                    this.cache.setAutocomplete(trimmedQuery, parsedResults, options.coordinates);

                    logger.info(`Retrieved ${parsedResults.length} autocomplete suggestions for query: ${trimmedQuery}`);
                    return parsedResults;
                }, 200); // 200ms debounce

                this.debouncedAutocomplete.set(trimmedQuery, debouncedFn);
            }

            const results = await debouncedFn();

            return results ? results.slice(0, limit) : [];
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
            const trimmedAddress = trim(address);
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
        return chain(addresses)
            .sortBy('confidence')
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

            const components = {
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
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): {
        autocompleteSize: number
        ipSize: number
        maxAutocompleteSize: number
        maxIPSize: number
        autocompleteTtlMinutes: number
        ipTtlMinutes: number
    } {
        return this.cache.getStats();
    }
}
