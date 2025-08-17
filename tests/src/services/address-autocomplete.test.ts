// Import test setup first to ensure proper mocking
import '../../data/test-setup';

import { describe, it, expect, beforeEach, afterEach, jest } from 'bun:test';
import _ from 'lodash';
import { PhotonAutocompleteService } from '../../../src/services/address-autocomplete';

// Mock fetch for testing
const mockFetch = jest.fn() as jest.Mock & typeof fetch;
mockFetch.preconnect = jest.fn();
global.fetch = mockFetch;

// Mock setTimeout to eliminate delays
const mockSetTimeout = jest.fn();
const originalSetTimeout = global.setTimeout;

// Mock Date.now for rate limiter testing
const mockDateNow = jest.fn();
const originalDateNow = Date.now;

describe('PhotonAutocompleteService', () => {
    let service: PhotonAutocompleteService;
    let timeNow = 0;

    beforeEach(() => {
        // Reset time counter for consistent rate limiter behavior
        timeNow = 0;

        // Mock setTimeout to resolve immediately (no delays)
        mockSetTimeout.mockImplementation((callback: () => void) => {
            callback();
            return 'mock-timeout-id';
        });
        global.setTimeout = mockSetTimeout as unknown as typeof setTimeout;

        // Mock Date.now to control rate limiter timing
        mockDateNow.mockImplementation(() => {
            return timeNow;
        });
        global.Date.now = mockDateNow;

        // Create fresh service instance and clear cache
        service = new PhotonAutocompleteService();
        service.clearCache();

        // Reset all mocks
        mockFetch.mockClear();
        mockFetch.mockReset();
        mockSetTimeout.mockClear();
        mockDateNow.mockClear();
    });

    afterEach(() => {
        // Restore original functions
        global.setTimeout = originalSetTimeout;
        global.Date.now = originalDateNow;
    });

    describe('Query Preprocessing', () => {
        it('should expand street abbreviations', async () => {
            const mockResponse = {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-122.6587, 45.5152]
                    },
                    properties: {
                        osm_id: 123456,
                        osm_type: 'way',
                        osm_key: 'highway',
                        osm_value: 'residential',
                        housenumber: '2720',
                        street: 'SE Steele Street',
                        city: 'Portland',
                        state: 'Oregon',
                        postcode: '97202',
                        country: 'United States',
                        countrycode: 'US'
                    }
                }]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            // Test that "St" is expanded to "street" in the query
            const query = '2720 SE Steele St';
            await service.getSuggestions(query);

            expect(mockFetch).toHaveBeenCalledTimes(1);
            const fetchCall = mockFetch.mock.calls[0];
            const url = new URL(fetchCall[0]);

            // The processed query should expand "st" to "street" and preserve "SE"
            expect(url.searchParams.get('q')).toBe('2720 SE steele street');
        });

        it('should handle directional abbreviations correctly', async () => {
            const mockResponse = {
                type: 'FeatureCollection',
                features: []
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const query = '123 ne broadway ave';
            await service.getSuggestions(query);

            const fetchCall = mockFetch.mock.calls[0];
            const url = new URL(fetchCall[0]);

            // Should preserve directional as uppercase and expand avenue
            expect(url.searchParams.get('q')).toBe('123 NE broadway avenue');
        });

        it('should handle multiple abbreviations in one query', async () => {
            const mockResponse = {
                type: 'FeatureCollection',
                features: []
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const query = '456 sw main st apt 2b';
            await service.getSuggestions(query);

            const fetchCall = mockFetch.mock.calls[0];
            const url = new URL(fetchCall[0]);

            expect(url.searchParams.get('q')).toBe('456 SW main street apt 2b');
        });
    });

    describe('API Request Configuration', () => {
        it('should not include osm_tag parameter (removed filtering)', async () => {
            const mockResponse = {
                type: 'FeatureCollection',
                features: []
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            await service.getSuggestions('2720 SE Steele St');

            expect(mockFetch).toHaveBeenCalledTimes(1);
            const fetchCall = mockFetch.mock.calls[0];
            const url = new URL(fetchCall[0]);

            // Should NOT have osm_tag parameter
            expect(url.searchParams.has('osm_tag')).toBe(false);
        });

        it('should include bbox parameter for US bias', async () => {
            const mockResponse = {
                type: 'FeatureCollection',
                features: []
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            await service.getSuggestions('test address');

            const fetchCall = mockFetch.mock.calls[0];
            const url = new URL(fetchCall[0]);

            // Should have US bounding box
            expect(url.searchParams.get('bbox')).toBe('-125.0,25.0,-66.0,49.0');
        });

        it('should set appropriate limit parameter', async () => {
            const mockResponse = {
                type: 'FeatureCollection',
                features: []
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            await service.getSuggestions('test address', 3);

            const fetchCall = mockFetch.mock.calls[0];
            const url = new URL(fetchCall[0]);

            // Should request 6 results (limit * 2) for better filtering
            expect(url.searchParams.get('limit')).toBe('6');
        });
    });

    describe('Result Parsing', () => {
        it('should parse complete address results correctly', async () => {
            const mockResponse = {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-122.6587, 45.5152] // [lng, lat]
                    },
                    properties: {
                        osm_id: 123456,
                        osm_type: 'way',
                        osm_key: 'highway',
                        osm_value: 'residential',
                        housenumber: '2720',
                        street: 'SE Steele Street',
                        city: 'Portland',
                        state: 'Oregon',
                        postcode: '97202',
                        country: 'United States',
                        countrycode: 'US'
                    }
                }]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const suggestions = await service.getSuggestions('2720 SE Steele St');

            expect(suggestions).toHaveLength(1);
            const suggestion = suggestions[0];

            expect(suggestion.displayText).toBe('2720 SE Steele Street, Portland, Oregon');
            expect(suggestion.address.street).toBe('2720 SE Steele Street');
            expect(suggestion.address.city).toBe('Portland');
            expect(suggestion.address.state).toBe('Oregon');
            expect(suggestion.address.postalCode).toBe('97202');
            expect(suggestion.address.formatted).toBe('2720 SE Steele Street, Portland, Oregon, 97202');
            expect(suggestion.coordinates).toEqual({
                lat: 45.5152,
                lng: -122.6587
            });
            expect(suggestion.source).toBe('photon');
            expect(suggestion.id).toBe('photon_way_123456_0');
        });

        it('should handle partial address information', async () => {
            const mockResponse = {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-122.6587, 45.5152]
                    },
                    properties: {
                        osm_id: 789012,
                        osm_type: 'node',
                        osm_key: 'place',
                        osm_value: 'city',
                        name: 'Portland',
                        city: 'Portland',
                        state: 'Oregon',
                        country: 'United States',
                        countrycode: 'US'
                    }
                }]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const suggestions = await service.getSuggestions('Portland OR');

            expect(suggestions).toHaveLength(1);
            const suggestion = suggestions[0];

            expect(suggestion.displayText).toBe('Portland, Oregon');
            expect(suggestion.address.street).toBeUndefined();
            expect(suggestion.address.city).toBe('Portland');
            expect(suggestion.address.state).toBe('Oregon');
        });

        it('should filter out invalid results', async () => {
            const mockResponse = {
                type: 'FeatureCollection',
                features: [
                    // Valid result
                    {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [-122.6587, 45.5152]
                        },
                        properties: {
                            osm_id: 123456,
                            osm_type: 'way',
                            osm_key: 'highway',
                            osm_value: 'residential',
                            street: 'Main Street',
                            city: 'Portland',
                            state: 'Oregon'
                        }
                    },
                    // Invalid result (no name, street, or city)
                    {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [-122.6587, 45.5152]
                        },
                        properties: {
                            osm_id: 789012,
                            osm_type: 'node',
                            osm_key: 'natural',
                            osm_value: 'tree'
                        }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            const suggestions = await service.getSuggestions('test query');

            // Should only return the valid result
            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].address.street).toBe('Main Street');
        });
    });

    describe('Caching Behavior', () => {
        it('should cache results and return cached data on subsequent calls', async () => {
            const mockResponse = {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-122.6587, 45.5152]
                    },
                    properties: {
                        osm_id: 123456,
                        osm_type: 'way',
                        osm_key: 'highway',
                        osm_value: 'residential',
                        street: 'Main Street',
                        city: 'Portland',
                        state: 'Oregon'
                    }
                }]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            // First call should hit the API
            const firstResult = await service.getSuggestions('test query');
            expect(mockFetch).toHaveBeenCalledTimes(1);

            // Second call should use cache
            const secondResult = await service.getSuggestions('test query');
            expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call

            // The second result should have cache source
            expect(secondResult[0].source).toBe('cache');
            // But the values should be the same (except for source)
            expect(secondResult[0].displayText).toBe(firstResult[0].displayText);
        });

        it('should use original query for cache key, not processed query', async () => {
            const mockResponse = {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-122.6587, 45.5152]
                    },
                    properties: {
                        osm_id: 123456,
                        osm_type: 'way',
                        osm_key: 'highway',
                        osm_value: 'residential',
                        street: 'Main Street',
                        city: 'Portland',
                        state: 'Oregon'
                    }
                }]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            // Make request with abbreviation
            await service.getSuggestions('123 main st');

            // Same query should hit cache (processed query should be used for API, original for cache)
            const cachedResult = await service.getSuggestions('123 main st');

            // Should only have made one API call because second call uses cache
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(cachedResult[0].source).toBe('cache');
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const suggestions = await service.getSuggestions('test query');

            expect(suggestions).toEqual([]);
        });

        it('should handle API errors gracefully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            });

            const suggestions = await service.getSuggestions('test query');

            expect(suggestions).toEqual([]);
        });

        it('should handle rate limiting', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests'
            });

            const suggestions = await service.getSuggestions('test query');

            expect(suggestions).toEqual([]);
        });
    });

    describe('Input Validation', () => {
        it('should reject queries that are too short', async () => {
            const suggestions = await service.getSuggestions('ab');

            expect(suggestions).toEqual([]);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should reject queries that are too long', async () => {
            const longQuery = _.repeat('a', 101);
            const suggestions = await service.getSuggestions(longQuery);

            expect(suggestions).toEqual([]);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('should handle empty and whitespace queries', async () => {
            const emptyResult = await service.getSuggestions('');
            const whitespaceResult = await service.getSuggestions('   ');

            expect(emptyResult).toEqual([]);
            expect(whitespaceResult).toEqual([]);
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    describe('Portland Address Test Case', () => {
        it('should successfully process the specific Portland address from the bug report', async () => {
            const mockResponse = {
                type: 'FeatureCollection',
                features: [{
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-122.6587, 45.5152]
                    },
                    properties: {
                        osm_id: 123456,
                        osm_type: 'way',
                        osm_key: 'highway',
                        osm_value: 'residential',
                        housenumber: '2720',
                        street: 'SE Steele Street',
                        city: 'Portland',
                        state: 'Oregon',
                        postcode: '97202',
                        country: 'United States',
                        countrycode: 'US'
                    }
                }]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            // Test the exact query from the bug report
            const suggestions = await service.getSuggestions('2720 SE Steele St, Portland, OR');

            expect(suggestions).toHaveLength(1);
            expect(suggestions[0].displayText).toContain('2720 SE Steele Street');
            expect(suggestions[0].displayText).toContain('Portland');
            expect(suggestions[0].displayText).toContain('Oregon');

            // Verify the processed query was sent to the API
            const fetchCall = mockFetch.mock.calls[0];
            const url = new URL(fetchCall[0]);
            expect(url.searchParams.get('q')).toBe('2720 SE steele street portland or');
        });
    });

    describe('Geolocation Integration', () => {
        it('accepts user coordinates in getSuggestions', async () => {
            const userCoordinates = { lat: 45.5152, lon: -122.6784 }; // Portland, OR

            const mockResponse = {
                type: 'FeatureCollection',
                features: []
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            await service.getSuggestions('123 Main St', 5, userCoordinates);

            // Verify fetch was called with coordinates in the URL
            expect(mockFetch).toHaveBeenCalled();
            const fetchCall = mockFetch.mock.calls[0];
            const url = new URL(fetchCall[0]);
            const bbox = url.searchParams.get('bbox');

            // Should contain a local bounding box around Portland
            expect(bbox).toContain('-123.3784'); // lon - 0.7
            expect(bbox).toContain('44.8152'); // lat - 0.7
        });

        it('uses US bounding box when no coordinates provided', async () => {
            const mockResponse = {
                type: 'FeatureCollection',
                features: []
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue(mockResponse)
            });

            await service.getSuggestions('123 Main St', 5);

            // Verify fetch was called with US bounding box
            const fetchCall = mockFetch.mock.calls[0];
            const url = new URL(fetchCall[0]);
            const bbox = url.searchParams.get('bbox');
            expect(bbox).toBe('-125.0,25.0,-66.0,49.0');
        });

        it('sorts results by proximity when coordinates provided', async () => {
            const userCoordinates = { lat: 45.5152, lon: -122.6784 }; // Portland, OR

            // Mock fetch with multiple results
            const mockFeatures = [
                {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [-74.0060, 40.7128] }, // NYC (far)
                    properties: {
                        osm_id: 1,
                        osm_type: 'way',
                        osm_key: 'highway',
                        osm_value: 'primary',
                        name: 'Main Street NYC',
                        street: 'Main Street',
                        city: 'New York',
                        state: 'NY'
                    }
                },
                {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [-122.6500, 45.5200] }, // Portland (close)
                    properties: {
                        osm_id: 2,
                        osm_type: 'way',
                        osm_key: 'highway',
                        osm_value: 'primary',
                        name: 'Main Street Portland',
                        street: 'Main Street',
                        city: 'Portland',
                        state: 'OR'
                    }
                }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({ type: 'FeatureCollection', features: mockFeatures })
            });

            const results = await service.getSuggestions('Main Street', 5, userCoordinates);

            // Portland result should come first (closer to user location)
            expect(results).toHaveLength(2);
            expect(results[0].address.city).toBe('Portland');
            expect(results[1].address.city).toBe('New York');
        });

        it('caches results with location-specific keys', async () => {
            const userCoordinates = { lat: 45.5152, lon: -122.6784 };

            // Mock successful response
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] })
            });

            // First call with coordinates
            await service.getSuggestions('test query', 5, userCoordinates);

            // Reset mock call count
            mockFetch.mockClear();

            // Second call with same query but no coordinates
            await service.getSuggestions('test query', 5);

            // Should have made 1 API call (different cache keys)
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });
});
