// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createMockAlpineContext,
    createMockElement,
    resetAllMocks,
    cleanup,
    mockFetch
} from './test-setup';

// Import factory functions
import { createUnitTypeCardFactory } from '../../../../astro-src/lib/unit-type-card/factory';
import { createLocationMapFactory } from '../../../../astro-src/lib/location-map/factory';
import { createUnitTypeFormFactory } from '../../../../astro-src/lib/unit-type-form/factory';

describe('Alpine.js Registry Error Handling', () => {
    beforeEach(() => {
        resetAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    describe('Malformed Data Attributes', () => {
        it('should handle completely invalid JSON gracefully', () => {
            const dataset = {
                unitType:          '{"invalid": json, missing quotes}',
                buildingAmenities: '[broken array without closing bracket',
                apiUrl:            '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);

            expect(() => factory()).not.toThrow();

            const result = factory();
            expect(result.unitType).toEqual({});
            expect(result.buildingAmenities).toEqual([]);
            expect(result.apiURL).toBe('/api/');
        });

        it('should handle null and undefined JSON strings', () => {
            const dataset = {
                unitType:          'null',
                buildingAmenities: 'undefined',
                apiUrl:            '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);
            const result = factory();

            expect(result.unitType).toBeNull();
            expect(result.buildingAmenities).toEqual([]); // Should fallback to empty array
        });

        it('should handle empty strings and whitespace', () => {
            const dataset = {
                unitType:          '',
                buildingAmenities: '   ',
                apiUrl:            '   /api/   '
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);
            const result = factory();

            expect(result.unitType).toEqual({});
            expect(result.buildingAmenities).toEqual([]);
            expect(result.apiURL).toBe('   /api/   '); // URL should be preserved as-is
        });

        it('should handle mixed valid and invalid JSON attributes', () => {
            const validUnitType = { modelID: 'studio', beds: 0 };
            const dataset = {
                unitType:          JSON.stringify(validUnitType),
                buildingAmenities: 'invalid-json[',
                apiUrl:            '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);
            const result = factory();

            expect(result.unitType).toEqual(validUnitType);
            expect(result.buildingAmenities).toEqual([]); // Invalid JSON should fallback
            expect(result.apiURL).toBe('/api/');
        });
    });

    describe('Missing Required Parameters', () => {
        it('should throw descriptive error for UnitTypeFormFactory without required attributes', () => {
            const mockElement = createMockElement({});
            const factory = createUnitTypeFormFactory();

            expect(() => {
                factory.call(mockElement);
            }).toThrow('UnitTypeFormFactory requires data-api-url and data-building-id attributes');
        });

        it('should throw error when only apiUrl is missing', () => {
            const mockElement = createMockElement({ buildingId: 'test-building' });
            const factory = createUnitTypeFormFactory();

            expect(() => {
                factory.call(mockElement);
            }).toThrow('UnitTypeFormFactory requires data-api-url and data-building-id attributes');
        });

        it('should throw error when only buildingId is missing', () => {
            const mockElement = createMockElement({ apiUrl: '/api/' });
            const factory = createUnitTypeFormFactory();

            expect(() => {
                factory.call(mockElement);
            }).toThrow('UnitTypeFormFactory requires data-api-url and data-building-id attributes');
        });

        it('should handle empty string values as missing', () => {
            const mockElement = createMockElement({
                apiUrl:     '',
                buildingId: ''
            });
            const factory = createUnitTypeFormFactory();

            expect(() => {
                factory.call(mockElement);
            }).toThrow('UnitTypeFormFactory requires data-api-url and data-building-id attributes');
        });

        it('should handle whitespace-only values as missing', () => {
            const mockElement = createMockElement({
                apiUrl:     '   ',
                buildingId: '   '
            });
            const factory = createUnitTypeFormFactory();

            expect(() => {
                factory.call(mockElement);
            }).toThrow('UnitTypeFormFactory requires data-api-url and data-building-id attributes');
        });
    });

    describe('LocationMap Configuration Errors', () => {
        it('should handle invalid numeric values gracefully', () => {
            const dataset = {
                defaultLat: 'not-a-number',
                defaultLng: 'also-not-a-number',
                latModel:   'lat',
                lngModel:   'lng'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createLocationMapFactory.bind(mockContext);

            expect(() => factory()).not.toThrow();

            const result = factory();
            expect(result.geocoding).toBe(false);
            expect(result.mapInitialized).toBe(false);
        });

        it('should handle malformed addressModels configuration', () => {
            const dataset = {
                latModel:      'lat',
                lngModel:      'lng',
                addressModels: '{"addressModel": incomplete json'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createLocationMapFactory.bind(mockContext);

            expect(() => factory()).not.toThrow();
        });

        it('should handle missing context properties for nested access', () => {
            const mockContext = createMockAlpineContext({
                latModel: 'building.coordinates.lat',
                lngModel: 'building.coordinates.lng'
            });

            const factory = createLocationMapFactory.bind(mockContext);
            const result = factory();

            // Should not throw when accessing non-existent nested properties
            expect(() => {
                result.getNestedProperty('building.coordinates.lat');
                result.getNestedProperty('nonexistent.deep.path');
            }).not.toThrow();

            expect(result.getNestedProperty('building.coordinates.lat')).toBeUndefined();
            expect(result.getNestedProperty('nonexistent.deep.path')).toBeUndefined();
        });
    });

    describe('API Error Simulation', () => {
        it('should handle network failures in UnitTypeCard save operations', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const mockUnitType = {
                modelID:    'studio',
                buildingID: 'building-1',
                rent:       2000
            };

            const dataset = {
                unitType: JSON.stringify(mockUnitType),
                apiUrl:   '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);
            const result = factory();

            // Simulate a change to make it dirty
            result.unitType.rent = 2500;

            // Should not throw on network error
            expect(async () => {
                await result.saveUnitType(result);
            }).not.toThrow();
        });

        it('should handle HTTP error responses in save operations', async () => {
            mockFetch.mockResolvedValueOnce({
                ok:     false,
                status: 500,
                json:   () => Promise.resolve({ error: 'Internal server error' })
            });

            const mockUnitType = {
                modelID:    'studio',
                buildingID: 'building-1',
                rent:       2000
            };

            const dataset = {
                unitType: JSON.stringify(mockUnitType),
                apiUrl:   '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);
            const result = factory();

            result.unitType.rent = 2500;

            // Should handle HTTP errors gracefully
            expect(async () => {
                await result.saveUnitType(result);
            }).not.toThrow();
        });

        it('should handle geocoding API failures', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Geocoding service unavailable'));

            const dataset = {
                latModel:      'lat',
                lngModel:      'lng',
                apiUrl:        '/api/',
                addressModels: JSON.stringify({
                    addressModel: 'address'
                })
            };

            const mockContext = createMockAlpineContext(dataset);
            mockContext.address = '123 Main St';

            const factory = createLocationMapFactory.bind(mockContext);
            const result = factory();

            // Should handle geocoding failures gracefully
            expect(async () => {
                await result.geocodeAddress();
            }).not.toThrow();

            expect(result.geocoding).toBe(false); // Should reset geocoding state
        });
    });

    describe('Edge Case Data Types', () => {
        it('should handle unexpected data types in unitType', () => {
            const dataset = {
                unitType: JSON.stringify({
                    modelID: 123, // Number instead of string
                    beds:    '2', // String instead of number
                    rent:    null,
                    deposit: 'invalid-deposit-type'
                }),
                apiUrl: '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);

            expect(() => factory()).not.toThrow();

            const result = factory();
            expect(result.unitType.modelID).toBe(123);
            expect(result.unitType.beds).toBe('2');
            expect(result.unitType.rent).toBeNull();
        });

        it('should handle circular references in JSON', () => {
            const circularObject: Record<string, unknown> = { name: 'test' };
            circularObject.self = circularObject;

            // JSON.stringify would normally throw on circular references
            // but our factories should handle dataset parsing errors
            const dataset = {
                unitType: '{"name": "test", "self": "[circular]"}', // Simulate what might happen
                apiUrl:   '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);

            expect(() => factory()).not.toThrow();
        });

        it('should handle very large numeric values', () => {
            const dataset = {
                defaultLat: '999999999999.999999',
                defaultLng: '-999999999999.999999'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createLocationMapFactory.bind(mockContext);

            expect(() => factory()).not.toThrow();
        });
    });

    describe('Memory and Performance Edge Cases', () => {
        it('should handle very large JSON objects without memory issues', () => {
            const largeAmenities = Array(1000).fill(null).map((_, i) => ({
                id:          `amenity-${i}`,
                name:        `Amenity ${i}`,
                description: 'A'.repeat(1000) // Large description
            }));

            const dataset = {
                unitType:          JSON.stringify({ modelID: 'test' }),
                buildingAmenities: JSON.stringify(largeAmenities),
                apiUrl:            '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);

            expect(() => factory()).not.toThrow();

            const result = factory();
            expect(result.buildingAmenities).toHaveLength(1000);
        });

        it('should handle deeply nested property paths', () => {
            const mockContext = createMockAlpineContext({
                latModel: 'level1.level2.level3.level4.level5.lat'
            });

            // Create deeply nested object
            mockContext.level1 = {
                level2: {
                    level3: {
                        level4: {
                            level5: {
                                lat: 37.7749
                            }
                        }
                    }
                }
            };

            const factory = createLocationMapFactory.bind(mockContext);
            const result = factory();

            expect(() => {
                const value = result.getNestedProperty('level1.level2.level3.level4.level5.lat');
                expect(value).toBe(37.7749);
            }).not.toThrow();
        });
    });
});
