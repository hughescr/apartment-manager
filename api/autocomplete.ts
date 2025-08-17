import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { radarService, getUserLocation, type RadarAutocompleteResult } from '../src/services/radar-service';
import { logger as baseLogger } from '@hughescr/logger';
import _ from 'lodash';

const logger = baseLogger;

// Helper function to create consistent headers
function createHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json'
    };
}

/**
 * Address suggestion result compatible with frontend expectations
 */
interface AddressSuggestion {
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
    source: 'radar' | 'cache'
    /** Unique identifier for the suggestion */
    id: string
}

/**
 * Address autocomplete API response
 */
interface AutocompleteResponse {
    success: boolean
    suggestions?: AddressSuggestion[]
    error?: string
    cacheStats?: {
        autocompleteSize: number
        ipSize: number
        autocompleteTtlMinutes: number
        ipTtlMinutes: number
    }
}

/**
 * Parse and validate coordinate parameters
 */
function parseCoordinates(latParam?: string, lonParam?: string): { lat: number, lon: number } | undefined {
    if(!latParam || !lonParam) {
        return undefined;
    }

    const lat = parseFloat(latParam);
    const lon = parseFloat(lonParam);

    if(!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        logger.info('Using user coordinates for location-aware search', { lat, lon });
        return { lat, lon };
    }

    logger.warn('Invalid coordinates provided, ignoring', { lat: latParam, lon: lonParam });
    return undefined;
}

/**
 * Extract client IP address from request headers
 * Checks common IP header sources in order of priority
 */
function getClientIP(event: { headers?: Record<string, string | undefined> }): string | undefined {
    const headers = event.headers || {};

    // Check common IP headers in order of priority
    const ipHeaders = [
        'cf-connecting-ip',        // Cloudflare
        'x-forwarded-for',         // Load balancers, proxies
        'x-real-ip',              // Nginx proxy
        'x-cluster-client-ip',     // Cluster load balancers
        'x-forwarded',            // General forwarded header
        'forwarded-for',          // RFC 7239
        'forwarded'               // RFC 7239
    ];

    for(const header of ipHeaders) {
        const value = headers[header];
        if(value) {
            // X-Forwarded-For can contain multiple IPs, take the first one
            const ip = _.trim(_.split(value, ',')[0]);
            if(ip && ip !== '127.0.0.1' && ip !== '::1') {
                logger.debug(`Client IP found in ${header}: ${ip}`);
                return ip;
            }
        }
    }

    logger.debug('No client IP found in headers');
    return undefined;
}

/**
 * Convert Radar autocomplete result to AddressSuggestion format for backward compatibility
 */
function convertRadarToAddressSuggestion(radarResult: RadarAutocompleteResult): AddressSuggestion {
    return {
        displayText: radarResult.displayText,
        address: {
            street: radarResult.components.street,
            city: radarResult.components.city,
            state: radarResult.components.state,
            postalCode: radarResult.components.postalCode,
            formatted: _([radarResult.components.street, radarResult.components.city, radarResult.components.state, radarResult.components.postalCode])
                .compact()
                .join(', ')
        },
        coordinates: radarResult.coordinates
            ? {
                lat: radarResult.coordinates.lat,
                lng: radarResult.coordinates.lon
            }
            : undefined,
        confidence: radarResult.confidence,
        source: radarResult.source,
        id: radarResult.id
    };
}

/**
 * Get address suggestions for autocomplete
 * GET /autocomplete/address?q=<query>&limit=<limit>
 */
export const addressAutocomplete: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        logger.info('Address autocomplete request received', {
            method: event.requestContext.http.method,
            path: event.rawPath,
            queryParams: event.queryStringParameters
        });

        if(event.requestContext.http.method !== 'GET') {
            return {
                statusCode: 405,
                headers: createHeaders(),
                body: JSON.stringify({
                    success: false,
                    error: 'Method not allowed. Use GET.'
                }),
            };
        }

        const queryParams = event.queryStringParameters || {};
        const query = queryParams.q;
        const limitParam = queryParams.limit;
        const latParam = queryParams.lat;
        const lonParam = queryParams.lon;

        // Validate query parameter
        if(!query || !_.trim(query)) {
            return {
                statusCode: 400,
                headers: createHeaders(),
                body: JSON.stringify({
                    success: false,
                    error: 'Query parameter "q" is required'
                }),
            };
        }

        const trimmedQuery = _.trim(query);

        // Validate query length
        if(trimmedQuery.length < 3) {
            return {
                statusCode: 400,
                headers: createHeaders(),
                body: JSON.stringify({
                    success: false,
                    error: 'Query must be at least 3 characters long'
                }),
            };
        }

        if(trimmedQuery.length > 100) {
            return {
                statusCode: 400,
                headers: createHeaders(),
                body: JSON.stringify({
                    success: false,
                    error: 'Query must be 100 characters or less'
                }),
            };
        }

        // Parse and validate limit parameter
        let limit = 5; // default
        if(limitParam) {
            const parsedLimit = parseInt(limitParam, 10);
            if(isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 20) {
                return {
                    statusCode: 400,
                    headers: createHeaders(),
                    body: JSON.stringify({
                        success: false,
                        error: 'Limit must be a number between 1 and 20'
                    }),
                };
            }
            limit = parsedLimit;
        }

        // Parse and validate coordinate parameters
        const browserCoordinates = parseCoordinates(latParam, lonParam);

        // Extract client IP for location fallback
        const clientIP = getClientIP(event);

        logger.info('Getting address suggestions', {
            query: trimmedQuery,
            limit,
            hasBrowserCoordinates: !!browserCoordinates,
            hasClientIP: !!clientIP
        });

        // Get user location using smart fallback chain (browser → IP → default)
        const userLocation = await getUserLocation(browserCoordinates, clientIP);
        logger.info('Using location for address search', {
            source: userLocation.source,
            lat: userLocation.lat,
            lon: userLocation.lon
        });

        // Get suggestions from Radar service with location bias
        const radarResults = await radarService.autocompleteAddress({
            query: trimmedQuery,
            coordinates: { lat: userLocation.lat, lon: userLocation.lon },
            limit
        });

        // Convert Radar results to backward-compatible format
        const suggestions = _.map(radarResults, convertRadarToAddressSuggestion);

        const response: AutocompleteResponse = {
            success: true,
            suggestions,
            cacheStats: radarService.getCacheStats()
        };

        logger.info('Address autocomplete successful', {
            query: trimmedQuery,
            suggestionsCount: suggestions.length,
            hasCache: suggestions.length > 0 && suggestions[0].source === 'cache'
        });

        return {
            statusCode: 200,
            headers: createHeaders(),
            body: JSON.stringify(response),
        };
    } catch(error) {
        logger.error('Address autocomplete API error', { error });

        return {
            statusCode: 500,
            headers: createHeaders(),
            body: JSON.stringify({
                success: false,
                error: 'Internal server error'
            }),
        };
    }
};

/**
 * Get autocomplete service status and cache statistics
 * GET /autocomplete/status
 */
export const status: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        logger.info('Autocomplete status request received');

        if(event.requestContext.http.method !== 'GET') {
            return {
                statusCode: 405,
                headers: createHeaders(),
                body: JSON.stringify({
                    success: false,
                    error: 'Method not allowed. Use GET.'
                }),
            };
        }

        const cacheStats = radarService.getCacheStats();

        const statusResponse = {
            success: true,
            service: 'Radar Maps API',
            status: 'operational',
            cache: cacheStats,
            rateLimit: {
                intervalMs: 100,
                policy: 'Conservative rate limiting for Radar API'
            },
            debounce: {
                intervalMs: 200,
                policy: 'Prevents excessive API calls during typing'
            },
            features: {
                addressAutocomplete: 'Available',
                ipGeocoding: 'Available',
                proximityBias: 'Available',
                smartLocationFallback: 'Available'
            }
        };

        return {
            statusCode: 200,
            headers: createHeaders(),
            body: JSON.stringify(statusResponse),
        };
    } catch(error) {
        logger.error('Autocomplete status API error', { error });

        return {
            statusCode: 500,
            headers: createHeaders(),
            body: JSON.stringify({
                success: false,
                error: 'Internal server error'
            }),
        };
    }
};

/**
 * Clear autocomplete cache (admin endpoint)
 * DELETE /autocomplete/cache
 */
export const clearCache: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        logger.info('Autocomplete cache clear request received');

        if(event.requestContext.http.method !== 'DELETE') {
            return {
                statusCode: 405,
                headers: createHeaders(),
                body: JSON.stringify({
                    success: false,
                    error: 'Method not allowed. Use DELETE.'
                }),
            };
        }

        const statsBefore = radarService.getCacheStats();
        radarService.clearCache();
        const statsAfter = radarService.getCacheStats();

        logger.info('Autocomplete cache cleared', {
            entriesCleared: statsBefore.autocompleteSize + statsBefore.ipSize
        });

        return {
            statusCode: 200,
            headers: createHeaders(),
            body: JSON.stringify({
                success: true,
                message: 'Cache cleared successfully',
                cleared: {
                    autocomplete: statsBefore.autocompleteSize,
                    ip: statsBefore.ipSize
                },
                remaining: {
                    autocomplete: statsAfter.autocompleteSize,
                    ip: statsAfter.ipSize
                }
            }),
        };
    } catch(error) {
        logger.error('Autocomplete cache clear API error', { error });

        return {
            statusCode: 500,
            headers: createHeaders(),
            body: JSON.stringify({
                success: false,
                error: 'Internal server error'
            }),
        };
    }
};
