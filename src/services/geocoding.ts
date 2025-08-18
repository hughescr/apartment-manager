import { logger as baseLogger } from '@hughescr/logger';
import { join, toLower, trim } from 'lodash';

const logger = baseLogger;

/**
 * Coordinates result from geocoding
 */
export interface GeocodingResult {
    /** Latitude coordinate */
    lat: number
    /** Longitude coordinate */
    lng: number
    /** Display name of the geocoded location */
    displayName?: string
    /** Confidence score (0-1) if provided by the service */
    confidence?: number
    /** Source that provided the geocoding result */
    source: 'nominatim' | 'cache'
}

/**
 * Error details for geocoding failures
 */
export interface GeocodingError {
    /** Error code for programmatic handling */
    code: 'NETWORK_ERROR' | 'INVALID_ADDRESS' | 'NO_RESULTS' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE'
    /** Human-readable error message */
    message: string
    /** Original error if applicable */
    originalError?: Error
}

/**
 * Nominatim API response structure
 */
interface NominatimResult {
    lat: string
    lon: string
    display_name: string
    importance?: number
    place_id: string
    licence: string
    osm_type: string
    osm_id: string
    boundingbox: string[]
}

/**
 * Cache entry for geocoding results
 */
interface CacheEntry {
    result: GeocodingResult
    timestamp: number
}

/**
 * Simple in-memory cache for geocoding results
 * In production, this could be replaced with Redis or DynamoDB
 */
class GeocodingCache {
    private cache = new Map<string, CacheEntry>();
    private readonly ttlMs = 7 * 24 * 60 * 60 * 1000; // 7 days

    private createKey(address: string, city?: string, state?: string): string {
        const parts = [address];
        if(city) {
            parts.push(city);
        }
        if(state) {
            parts.push(state);
        }
        return trim(toLower(join(parts, ', ')));
    }

    get(address: string, city?: string, state?: string): GeocodingResult | null {
        const key = this.createKey(address, city, state);
        const entry = this.cache.get(key);

        if(!entry) {
            return null;
        }

        // Check if entry has expired
        if(Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(key);
            return null;
        }

        logger.debug(`Cache hit for address: ${key}`);
        return { ...entry.result, source: 'cache' };
    }

    set(address: string, result: GeocodingResult, city?: string, state?: string): void {
        const key = this.createKey(address, city, state);
        this.cache.set(key, {
            result: { ...result, source: 'nominatim' },
            timestamp: Date.now()
        });
        logger.debug(`Cached result for address: ${key}`);
    }

    clear(): void {
        this.cache.clear();
        logger.info('Geocoding cache cleared');
    }

    size(): number {
        return this.cache.size;
    }
}

/**
 * Rate limiter for Nominatim API requests
 * Nominatim usage policy: max 1 request per second
 */
class RateLimiter {
    private lastRequestTime = 0;
    private readonly minIntervalMs = 1000; // 1 second

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

// Singleton instances
const cache = new GeocodingCache();
const rateLimiter = new RateLimiter();

/**
 * Geocoding service using OpenStreetMap Nominatim API
 *
 * Features:
 * - Free service, no API key required
 * - Respects usage policy (1 request/second)
 * - Caches results to minimize API calls
 * - Proper error handling and logging
 * - TypeScript types for all interactions
 */
export class GeocodingService {
    private readonly baseUrl = 'https://nominatim.openstreetmap.org/search';
    private readonly userAgent = 'apartment-manager/1.0';

    /**
     * Geocode an address to coordinates
     */
    async geocode(address: string, city?: string, state?: string): Promise<GeocodingResult | null> {
        try {
            // Check cache first
            const cachedResult = cache.get(address, city, state);
            if(cachedResult) {
                return cachedResult;
            }

            // Build query string
            const query = this.buildQuery(address, city, state);
            if(!query) {
                logger.warn('Empty query string, cannot geocode');
                return null;
            }

            logger.info(`Geocoding address: ${query}`);

            // Apply rate limiting
            await rateLimiter.waitIfNeeded();

            // Make API request
            const url = new URL(this.baseUrl);
            url.searchParams.set('q', query);
            url.searchParams.set('format', 'json');
            url.searchParams.set('limit', '1');
            url.searchParams.set('addressdetails', '1');
            url.searchParams.set('countrycodes', 'us'); // Restrict to US addresses

            const response = await fetch(url.toString(), {
                headers: {
                    'User-Agent': this.userAgent
                }
            });

            if(!response.ok) {
                const error: GeocodingError = {
                    code: response.status === 429 ? 'RATE_LIMITED' : 'SERVICE_UNAVAILABLE',
                    message: `Nominatim API error: ${response.status} ${response.statusText}`
                };
                logger.error('Geocoding API error', error);
                return null;
            }

            const data = await response.json() as NominatimResult[];

            if(!data || data.length === 0) {
                logger.warn(`No results found for address: ${query}`);
                return null;
            }

            const result = this.parseNominatimResult(data[0]);

            // Cache the result
            cache.set(address, result, city, state);

            logger.info(`Successfully geocoded address: ${query} -> ${result.lat}, ${result.lng}`);
            return result;
        } catch(error) {
            const geocodingError: GeocodingError = {
                code: 'NETWORK_ERROR',
                message: 'Failed to geocode address',
                originalError: error as Error
            };
            logger.error('Geocoding failed', geocodingError);
            return null;
        }
    }

    /**
     * Build query string from address components
     */
    private buildQuery(address: string, city?: string, state?: string): string {
        const parts: string[] = [];

        if(address && trim(address)) {
            parts.push(trim(address));
        }

        if(city && trim(city)) {
            parts.push(trim(city));
        }

        if(state && trim(state)) {
            parts.push(trim(state));
        }

        return join(parts, ', ');
    }

    /**
     * Parse Nominatim API result into our result format
     */
    private parseNominatimResult(nominatimResult: NominatimResult): GeocodingResult {
        const lat = parseFloat(nominatimResult.lat);
        const lng = parseFloat(nominatimResult.lon);

        if(isNaN(lat) || isNaN(lng)) {
            throw new Error('Invalid coordinates in Nominatim result');
        }

        return {
            lat,
            lng,
            displayName: nominatimResult.display_name,
            confidence: nominatimResult.importance, // Nominatim uses 'importance' as confidence
            source: 'nominatim'
        };
    }

    /**
     * Clear the geocoding cache
     */
    clearCache(): void {
        cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number, ttlDays: number } {
        return {
            size: cache.size(),
            ttlDays: 7
        };
    }
}

// Export singleton instance
export const geocodingService = new GeocodingService();

/**
 * Helper function for backward compatibility with existing code
 * Matches the signature expected by the MITS generator
 */
export async function geocodeAddress(address: string, city?: string, state?: string): Promise<{ lat: number, lng: number } | null> {
    const result = await geocodingService.geocode(address, city, state);
    if(!result) {
        return null;
    }

    return {
        lat: result.lat,
        lng: result.lng
    };
}
