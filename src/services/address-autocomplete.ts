import { logger as baseLogger } from '@hughescr/logger';
import _ from 'lodash';

const logger = baseLogger;

/**
 * Address suggestion result from autocomplete
 */
export interface AddressSuggestion {
    /** Display text for the suggestion */
    displayText: string
    /** Structured address components */
    address: {
        /** Street number and name */
        street?: string
        /** City name */
        city?: string
        /** State name or abbreviation */
        state?: string
        /** Postal code */
        postalCode?: string
        /** Full formatted address */
        formatted: string
    }
    /** Geographic coordinates if available */
    coordinates?: {
        lat: number
        lng: number
    }
    /** Confidence score (0-1) if provided by the service */
    confidence?: number
    /** Source that provided the suggestion */
    source: 'photon' | 'cache'
    /** Unique identifier for the suggestion */
    id: string
}

/**
 * Error details for autocomplete failures
 */
export interface AutocompleteError {
    /** Error code for programmatic handling */
    code: 'NETWORK_ERROR' | 'INVALID_QUERY' | 'NO_RESULTS' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE'
    /** Human-readable error message */
    message: string
    /** Original error if applicable */
    originalError?: Error
}

/**
 * Photon API response structure
 */
interface PhotonFeature {
    type: 'Feature'
    geometry: {
        type: 'Point'
        coordinates: [number, number] // [longitude, latitude]
    }
    properties: {
        osm_id: number
        osm_type: string
        osm_key: string
        osm_value: string
        name?: string
        housenumber?: string
        street?: string
        city?: string
        state?: string
        postcode?: string
        country?: string
        countrycode?: string
        extent?: [number, number, number, number]
    }
}

interface PhotonResponse {
    type: 'FeatureCollection'
    features: PhotonFeature[]
}

/**
 * Cache entry for autocomplete results
 */
interface CacheEntry {
    suggestions: AddressSuggestion[]
    timestamp: number
}

/**
 * Simple in-memory cache for autocomplete results
 * In production, this could be replaced with Redis or DynamoDB
 */
class AutocompleteCache {
    private cache = new Map<string, CacheEntry>();
    private readonly ttlMs = 5 * 60 * 1000; // 5 minutes

    private createKey(query: string): string {
        return _.trim(_.toLower(query));
    }

    get(query: string): AddressSuggestion[] | null {
        const key = this.createKey(query);
        const entry = this.cache.get(key);

        if(!entry) {
            return null;
        }

        // Check if entry has expired
        if(Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(key);
            return null;
        }

        logger.debug(`Cache hit for query: ${key}`);
        return _.map(entry.suggestions, s => ({ ...s, source: 'cache' as const }));
    }

    set(query: string, suggestions: AddressSuggestion[]): void {
        const key = this.createKey(query);
        this.cache.set(key, {
            suggestions: _.map(suggestions, s => ({ ...s, source: 'photon' as const })),
            timestamp: Date.now()
        });
        logger.debug(`Cached ${suggestions.length} suggestions for query: ${key}`);
    }

    clear(): void {
        this.cache.clear();
        logger.info('Autocomplete cache cleared');
    }

    size(): number {
        return this.cache.size;
    }
}

/**
 * Rate limiter for Photon API requests
 * Conservative rate limiting to respect the free service
 */
class RateLimiter {
    private lastRequestTime = 0;
    private readonly minIntervalMs = 300; // 300ms minimum between requests

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
const cache = new AutocompleteCache();
const rateLimiter = new RateLimiter();
const debouncer = new Debouncer();

/**
 * Address autocomplete service using Photon API (OpenStreetMap-based)
 * Features:
 * - Free service, no API key required
 * - Conservative rate limiting (300ms between requests)
 * - Debouncing to prevent excessive API calls (200ms)
 * - Caches results to minimize API calls (5-minute TTL)
 * - US-focused geographic bias using bbox parameter
 * - Query preprocessing for common street abbreviations
 * - Proper error handling and logging
 * - TypeScript types for all interactions
 */
export class PhotonAutocompleteService {
    private readonly baseUrl = 'https://photon.komoot.io/api/';
    private readonly userAgent = 'apartment-manager/1.0';
    // US bounding box: [west, south, east, north]
    private readonly usBbox = '-125.0,25.0,-66.0,49.0';

    /**
     * Street abbreviation mappings for query preprocessing
     */
    private readonly streetAbbreviations = new Map([
        ['st', 'street'],
        ['ave', 'avenue'],
        ['blvd', 'boulevard'],
        ['dr', 'drive'],
        ['ct', 'court'],
        ['pl', 'place'],
        ['ln', 'lane'],
        ['rd', 'road'],
        ['cir', 'circle'],
        ['ter', 'terrace'],
        ['way', 'way'],
        ['pkwy', 'parkway']
    ]);

    /**
     * Preprocess query to expand common street abbreviations
     * This helps improve matching for queries like "2720 SE Steele St"
     */
    private preprocessQuery(query: string): string {
        // Remove common punctuation and split on spaces
        const cleanQuery = _.trim(_.replace(_.replace(query, /,/g, ' '), /\s+/g, ' '));
        const parts = _.split(cleanQuery, ' ');
        const processedParts = _.map(parts, (part) => {
            const lowerPart = _.toLower(part);

            // Handle directional abbreviations (SE, NE, SW, NW)
            if(_.includes(['se', 'ne', 'sw', 'nw'], lowerPart)) {
                return _.toUpper(lowerPart);
            }

            // Handle street type abbreviations
            if(this.streetAbbreviations.has(lowerPart)) {
                return this.streetAbbreviations.get(lowerPart)!;
            }

            return lowerPart;
        });

        return _.join(processedParts, ' ');
    }

    async getSuggestions(query: string, limit = 5, userCoordinates?: { lat: number, lon: number }): Promise<AddressSuggestion[]> {
        try {
            // Validate query
            const trimmedQuery = _.trim(query);
            if(!trimmedQuery || trimmedQuery.length < 3) {
                logger.debug('Query too short for autocomplete', { query: trimmedQuery });
                return [];
            }

            if(trimmedQuery.length > 100) {
                logger.warn('Query too long for autocomplete', { query: trimmedQuery });
                return [];
            }

            // Preprocess query to improve matching
            const processedQuery = this.preprocessQuery(trimmedQuery);
            logger.debug('Processed query', { original: trimmedQuery, processed: processedQuery });

            // Create cache key that includes coordinates for location-specific caching
            const cacheKey = userCoordinates ?
                `${trimmedQuery}|${userCoordinates.lat.toFixed(3)},${userCoordinates.lon.toFixed(3)}` :
                trimmedQuery;

            // Check cache first
            const cachedSuggestions = cache.get(cacheKey);
            if(cachedSuggestions) {
                return cachedSuggestions.slice(0, limit);
            }

            logger.info(`Getting address suggestions: ${trimmedQuery} (processed: ${processedQuery})`, {
                hasUserLocation: !!userCoordinates,
                userLocation: userCoordinates
            });

            // Use debouncer to prevent excessive API calls (include coordinates in debounce key)
            const debounceKey = userCoordinates ?
                `${trimmedQuery}|${userCoordinates.lat.toFixed(3)},${userCoordinates.lon.toFixed(3)}` :
                trimmedQuery;

            const suggestions = await debouncer.debounce(debounceKey, async () => {
                // Apply rate limiting
                await rateLimiter.waitIfNeeded();

                // Make API request
                const url = new URL(this.baseUrl);
                url.searchParams.set('q', processedQuery); // Use processed query
                url.searchParams.set('limit', Math.min(limit * 2, 10).toString()); // Get more results for better filtering

                // Use user location for geographic biasing if available, otherwise use US bbox
                if(userCoordinates) {
                    // Create a local bounding box around user location (roughly 50 miles)
                    const latDelta = 0.7; // approximately 50 miles in degrees
                    const lonDelta = 0.7;
                    const localBbox = [
                        userCoordinates.lon - lonDelta,
                        userCoordinates.lat - latDelta,
                        userCoordinates.lon + lonDelta,
                        userCoordinates.lat + latDelta
                    ].join(',');
                    url.searchParams.set('bbox', localBbox);
                    logger.debug('Using user location bounding box', { bbox: localBbox });
                } else {
                    url.searchParams.set('bbox', this.usBbox); // Bias towards US results
                }
                // Removed osm_tag=place to allow more address types

                const response = await fetch(url.toString(), {
                    headers: {
                        'User-Agent': this.userAgent
                    }
                });

                if(!response.ok) {
                    const error: AutocompleteError = {
                        code: response.status === 429 ? 'RATE_LIMITED' : 'SERVICE_UNAVAILABLE',
                        message: `Photon API error: ${response.status} ${response.statusText}`
                    };
                    logger.error('Autocomplete API error', error);
                    return [];
                }

                const data = await response.json() as PhotonResponse;

                if(!data || !data.features || data.features.length === 0) {
                    logger.debug(`No suggestions found for query: ${trimmedQuery}`);
                    return [];
                }

                const parsedSuggestions = this.parsePhotonResults(data.features);

                // Cache the results with location-specific key
                cache.set(cacheKey, parsedSuggestions);

                logger.info(`Retrieved ${parsedSuggestions.length} suggestions for query: ${trimmedQuery}`);
                return parsedSuggestions;
            });

            // Sort results by proximity if user coordinates are available
            const sortedSuggestions = userCoordinates ?
                this.sortByProximity(suggestions, userCoordinates) :
                suggestions;

            return sortedSuggestions.slice(0, limit);
        } catch(error) {
            const autocompleteError: AutocompleteError = {
                code: 'NETWORK_ERROR',
                message: 'Failed to get address suggestions',
                originalError: error as Error
            };
            logger.error('Autocomplete failed', autocompleteError);
            return [];
        }
    }

    /**
     * Parse Photon API results into our suggestion format
     */
    private parsePhotonResults(features: PhotonFeature[]): AddressSuggestion[] {
        const suggestions = _.map(features, (feature, index) => this.parsePhotonFeature(feature, index));
        return _.filter(suggestions, (suggestion): suggestion is AddressSuggestion => suggestion !== null);
    }

    /**
     * Parse a single Photon feature into our suggestion format
     */
    private parsePhotonFeature(feature: PhotonFeature, index: number): AddressSuggestion | null {
        try {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;

            // Skip if we don't have basic location info
            if(!props.name && !props.street && !props.city) {
                return null;
            }

            const addressComponents = this.buildAddressComponents(props);
            const displayText = this.buildDisplayText(addressComponents, props);

            if(!displayText) {
                return null;
            }

            return {
                displayText,
                address: {
                    street: addressComponents.street,
                    city: addressComponents.city,
                    state: addressComponents.state,
                    postalCode: addressComponents.postalCode,
                    formatted: addressComponents.formatted
                },
                coordinates: {
                    lat: coords[1], // Photon returns [lng, lat]
                    lng: coords[0]
                },
                source: 'photon',
                id: `photon_${props.osm_type}_${props.osm_id}_${index}`
            };
        } catch(error) {
            logger.warn('Failed to parse Photon feature', { feature, error });
            return null;
        }
    }

    /**
     * Build address components from Photon properties
     */
    private buildAddressComponents(props: PhotonFeature['properties']) {
        const addressParts: string[] = [];
        let street: string | undefined;
        let city: string | undefined;
        let state: string | undefined;
        let postalCode: string | undefined;

        // Build street address
        if(props.housenumber && props.street) {
            street = `${props.housenumber} ${props.street}`;
            addressParts.push(street);
        } else if(props.street) {
            street = props.street;
            addressParts.push(street);
        } else if(props.name) {
            addressParts.push(props.name);
        }

        // Add city
        if(props.city) {
            city = props.city;
            addressParts.push(city);
        }

        // Add state
        if(props.state) {
            state = props.state;
            addressParts.push(state);
        }

        // Add postal code
        if(props.postcode) {
            postalCode = props.postcode;
            addressParts.push(postalCode);
        }

        return {
            street,
            city,
            state,
            postalCode,
            formatted: _.join(addressParts, ', ')
        };
    }

    /**
     * Calculate distance between two points using Haversine formula
     */
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 3959; // Earth's radius in miles
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     */
    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Sort suggestions by proximity to user location
     */
    private sortByProximity(suggestions: AddressSuggestion[], userCoordinates: { lat: number, lon: number }): AddressSuggestion[] {
        return _.sortBy(suggestions, (suggestion) => {
            if(!suggestion.coordinates) {
                return Number.MAX_SAFE_INTEGER; // Put suggestions without coordinates at the end
            }
            return this.calculateDistance(
                userCoordinates.lat,
                userCoordinates.lon,
                suggestion.coordinates.lat,
                suggestion.coordinates.lng
            );
        });
    }

    /**
     * Build display text from address components
     */
    private buildDisplayText(addressComponents: { street?: string, city?: string, state?: string }, props: PhotonFeature['properties']): string {
        const displayParts: string[] = [];

        if(addressComponents.street) {
            displayParts.push(addressComponents.street);
        } else if(props.name && props.name !== props.city) {
            // Only use name if it's different from city to avoid duplicates
            displayParts.push(props.name);
        }

        if(addressComponents.city) {
            displayParts.push(addressComponents.city);
        }

        if(addressComponents.state) {
            displayParts.push(addressComponents.state);
        }

        return _.join(displayParts, ', ');
    }

    /**
     * Clear the autocomplete cache
     */
    clearCache(): void {
        cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number, ttlMinutes: number } {
        return {
            size: cache.size(),
            ttlMinutes: 5
        };
    }
}

// Export singleton instance
export const photonAutocompleteService = new PhotonAutocompleteService();

/**
 * Helper function for simple autocomplete without detailed structure
 */
export async function getAddressSuggestions(query: string, limit = 5): Promise<string[]> {
    const suggestions = await photonAutocompleteService.getSuggestions(query, limit);
    return _.map(suggestions, 'displayText');
}
