/**
 * Modular Radar service exports - maintains backward compatibility
 */

// Export all types
export * from './types';

// Export individual classes
export { RadarCache } from './radar-cache';
export { RadarClient } from './radar-client';

// Create singleton instances for backward compatibility
import { RadarCache } from './radar-cache';
import { RadarClient } from './radar-client';

const cache = new RadarCache();

// Create the main service with injected dependencies
export const radarService = new RadarClient(cache);

// Export the main service class for consistency
export class RadarService extends RadarClient {
    constructor() {
        super(new RadarCache());
    }
}

/**
 * Helper function for backward compatibility - get address suggestions
 * Compatible with existing frontend expectations
 */
export async function getAddressSuggestions(
    query: string,
    limit = 5,
    coordinates?: { lat: number, lon: number }
): Promise<import('./types').RadarAutocompleteResult[]> {
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
): Promise<import('./types').GeolocationResult> {
    // Use browser coordinates if available
    if(browserCoords) {
        return {
            lat:    browserCoords.lat,
            lon:    browserCoords.lon,
            source: 'browser'
        };
    }

    // Try IP-based geocoding
    const ipLocation = await radarService.getLocationFromIP(clientIP);
    if(ipLocation) {
        return ipLocation;
    }

    // Fall back to default location
    return radarService.getDefaultLocation();
}

/**
 * Get statistics about all singleton instances
 */
export function getRadarServiceStats(): {
    cache: { autocompleteSize: number, ipSize: number, autocompleteTtlMinutes: number, ipTtlMinutes: number }
} {
    return {
        cache: cache.getStats()
    };
}
