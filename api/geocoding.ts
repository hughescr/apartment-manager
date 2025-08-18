import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { geocodingService, GeocodingResult } from '../src/services/geocoding';
import { logger as baseLogger } from '@hughescr/logger';
import { trim } from 'lodash';

const logger = baseLogger;

// Helper function to create consistent headers
function createHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json'
    };
}

/**
 * Geocoding API request body
 */
interface GeocodingRequest {
    address: string
    city?: string
    state?: string
}

/**
 * Geocoding API response
 */
interface GeocodingResponse {
    success: boolean
    result?: GeocodingResult
    error?: string
    cacheStats?: {
        size: number
        ttlDays: number
    }
}

/**
 * Geocode an address to coordinates
 * POST /geocoding
 */
export const geocode: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        logger.info('Geocoding request received', {
            method: event.requestContext.http.method,
            path: event.rawPath
        });

        if(event.requestContext.http.method !== 'POST') {
            return {
                statusCode: 405,
                headers: createHeaders(),
                body: JSON.stringify({
                    success: false,
                    error: 'Method not allowed. Use POST.'
                }),
            };
        }

        if(!event.body) {
            return {
                statusCode: 400,
                headers: createHeaders(),
                body: JSON.stringify({
                    success: false,
                    error: 'Request body is required'
                }),
            };
        }

        let requestData: GeocodingRequest;
        try {
            requestData = JSON.parse(event.body) as GeocodingRequest;
        } catch(parseError) {
            logger.warn('Failed to parse request body', { error: parseError });
            return {
                statusCode: 400,
                headers: createHeaders(),
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid JSON in request body'
                }),
            };
        }

        // Validate required fields
        if(!requestData.address || !trim(requestData.address)) {
            return {
                statusCode: 400,
                headers: createHeaders(),
                body: JSON.stringify({
                    success: false,
                    error: 'Address is required'
                }),
            };
        }

        logger.info('Geocoding address', {
            address: requestData.address,
            city: requestData.city,
            state: requestData.state
        });

        // Perform geocoding
        const result = await geocodingService.geocode(
            trim(requestData.address),
            requestData.city ? trim(requestData.city) : undefined,
            requestData.state ? trim(requestData.state) : undefined
        );

        const response: GeocodingResponse = {
            success: true,
            result: result || undefined,
            cacheStats: geocodingService.getCacheStats()
        };

        if(!result) {
            logger.warn('Geocoding returned no results', { requestData });
            response.error = 'No results found for the provided address';
        } else {
            logger.info('Geocoding successful', {
                address: requestData.address,
                coordinates: { lat: result.lat, lng: result.lng },
                source: result.source
            });
        }

        return {
            statusCode: 200,
            headers: createHeaders(),
            body: JSON.stringify(response),
        };
    } catch(error) {
        logger.error('Geocoding API error', { error });

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
 * Get geocoding service status and cache statistics
 * GET /geocoding/status
 */
export const status: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        logger.info('Geocoding status request received');

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

        const cacheStats = geocodingService.getCacheStats();

        const statusResponse = {
            success: true,
            service: 'OpenStreetMap Nominatim',
            status: 'operational',
            cache: cacheStats,
            rateLimit: {
                requestsPerSecond: 1,
                policy: 'Nominatim usage policy compliant'
            }
        };

        return {
            statusCode: 200,
            headers: createHeaders(),
            body: JSON.stringify(statusResponse),
        };
    } catch(error) {
        logger.error('Geocoding status API error', { error });

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
 * Clear geocoding cache (admin endpoint)
 * DELETE /geocoding/cache
 */
export const clearCache: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        logger.info('Geocoding cache clear request received');

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

        const statsBefore = geocodingService.getCacheStats();
        geocodingService.clearCache();
        const statsAfter = geocodingService.getCacheStats();

        logger.info('Geocoding cache cleared', {
            entriesCleared: statsBefore.size
        });

        return {
            statusCode: 200,
            headers: createHeaders(),
            body: JSON.stringify({
                success: true,
                message: 'Cache cleared successfully',
                cleared: statsBefore.size,
                remaining: statsAfter.size
            }),
        };
    } catch(error) {
        logger.error('Geocoding cache clear API error', { error });

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
