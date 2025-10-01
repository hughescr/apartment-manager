// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createMockAlpineContext,
    createMockElement,
    resetAllMocks,
    cleanup
} from './test-setup';

// Import factory functions
import { createUnitTypeCardFactory } from '../../../../astro-src/lib/unit-type-card/factory';
import { createLocationMapFactory } from '../../../../astro-src/lib/location-map/factory';
import { createUnitTypeFormFactory } from '../../../../astro-src/lib/unit-type-form/factory';

describe('Alpine.js Factory Functions', () => {
    beforeEach(() => {
        resetAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    describe('createUnitTypeCardFactory', () => {
        const mockUnitType = {
            modelID:    'studio-1',
            modelName:  'Studio Apartment',
            buildingID: 'building-1',
            beds:       0,
            baths:      1,
            sqft:       450,
            rent:       2000,
            deposit:    { amount: 1000, refundable: true }
        };

        const mockBuildingAmenities = [
            { id: 'pool', name: 'Swimming Pool', category: 'Recreation' },
            { id: 'gym', name: 'Fitness Center', category: 'Recreation' }
        ];

        it('should extract configuration from data attributes correctly', () => {
            const dataset = {
                unitType:          JSON.stringify(mockUnitType),
                buildingAmenities: JSON.stringify(mockBuildingAmenities),
                apiUrl:            '/api/v1/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);
            const result = factory();

            expect(result.unitType).toEqual(mockUnitType);
            expect(result.buildingAmenities).toEqual(mockBuildingAmenities);
            expect(result.apiURL).toBe('/api/v1/');
        });

        it('should handle missing data attributes with defaults', () => {
            const mockContext = createMockAlpineContext({});
            const factory = createUnitTypeCardFactory.bind(mockContext);
            const result = factory();

            expect(result.unitType).toEqual({});
            expect(result.buildingAmenities).toEqual([]);
            expect(result.apiURL).toBe('');
        });

        it('should handle malformed JSON in data attributes gracefully', () => {
            const dataset = {
                unitType:          'invalid-json{',
                buildingAmenities: '[invalid-json',
                apiUrl:            '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);
            const result = factory();

            // Should fallback to defaults when JSON is malformed
            expect(result.unitType).toEqual({});
            expect(result.buildingAmenities).toEqual([]);
            expect(result.apiURL).toBe('/api/');
        });

        it('should initialize proper state structure', () => {
            const dataset = {
                unitType:          JSON.stringify(mockUnitType),
                buildingAmenities: JSON.stringify(mockBuildingAmenities),
                apiUrl:            '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);
            const result = factory();

            // Check required state properties
            expect(result).toHaveProperty('unitType');
            expect(result).toHaveProperty('originalUnitType');
            expect(result).toHaveProperty('apiURL');
            expect(result).toHaveProperty('saving');
            expect(result).toHaveProperty('expandedAmenities');
            expect(result).toHaveProperty('buildingAmenities');

            // Check methods
            expect(typeof result.init).toBe('function');
            expect(typeof result.getEffectiveAmenities).toBe('function');
            expect(typeof result.saveUnitType).toBe('function');
            expect(typeof result.deleteUnitType).toBe('function');
            expect(typeof result.formatCurrency).toBe('function');

            expect(result.saving).toBe(false);
            expect(result.expandedAmenities).toBe(false);
        });

        it('should create deep copy for originalUnitType', () => {
            const dataset = {
                unitType: JSON.stringify(mockUnitType),
                apiUrl:   '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);
            const result = factory();

            // Modify unitType and verify originalUnitType is unaffected
            result.unitType.rent = 2500;
            expect(result.originalUnitType.rent).toBe(2000);
            expect(result.unitType).not.toEqual(result.originalUnitType);
        });
    });

    describe('createLocationMapFactory', () => {
        it('should extract all map configuration from data attributes', () => {
            const dataset = {
                latModel:      'building.coordinates.lat',
                lngModel:      'building.coordinates.lng',
                verifiedModel: 'building.coordinates.verified',
                defaultLat:    '37.7749',
                defaultLng:    '-122.4194',
                apiUrl:        '/api/v1/',
                addressModels: JSON.stringify({
                    addressModel: 'building.address.street',
                    cityModel:    'building.address.city',
                    stateModel:   'building.address.state'
                })
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createLocationMapFactory.bind(mockContext);
            const result = factory();

            expect(result).toHaveProperty('map', null);
            expect(result).toHaveProperty('marker', null);
            expect(result).toHaveProperty('geocoding', false);
            expect(result).toHaveProperty('mapInitialized', false);

            // Check methods are present
            expect(typeof result.initMap).toBe('function');
            expect(typeof result.addMarker).toBe('function');
            expect(typeof result.setMarker).toBe('function');
            expect(typeof result.centerOnMarker).toBe('function');
            expect(typeof result.geocodeAddress).toBe('function');
            expect(typeof result.getNestedProperty).toBe('function');
            expect(typeof result.setNestedProperty).toBe('function');
        });

        it('should use default values for missing configuration', () => {
            const mockContext = createMockAlpineContext({});
            const factory = createLocationMapFactory.bind(mockContext);
            const result = factory();

            // Should not throw and should have default state
            expect(result.geocoding).toBe(false);
            expect(result.mapInitialized).toBe(false);
            expect(result.map).toBeNull();
            expect(result.marker).toBeNull();
        });

        it('should handle malformed addressModels JSON', () => {
            const dataset = {
                latModel:      'lat',
                lngModel:      'lng',
                addressModels: 'invalid-json{'
            };

            const mockContext = createMockAlpineContext(dataset);

            expect(() => {
                const factory = createLocationMapFactory.bind(mockContext);
                factory();
            }).not.toThrow();
        });

        it('should provide property helper methods', () => {
            const mockContext = createMockAlpineContext({
                latModel: 'building.lat',
                lngModel: 'building.lng'
            });

            // Add some nested properties to the context
            mockContext.building = { lat: 37.7749, lng: -122.4194 };

            const factory = createLocationMapFactory.bind(mockContext);
            const result = factory();

            // Test nested property access
            expect(result.getNestedProperty('building.lat')).toBe(37.7749);
            expect(result.getNestedProperty('building.lng')).toBe(-122.4194);
            expect(result.getNestedProperty('nonexistent.path')).toBeUndefined();

            // Test nested property setting
            result.setNestedProperty('building.verified', true);
            expect((mockContext.building as { verified?: boolean }).verified).toBe(true);
        });
    });

    describe('createUnitTypeFormFactory', () => {
        it('should extract configuration from data attributes', () => {
            const dataset = {
                apiUrl:     '/api/v1/',
                buildingId: 'building-123'
            };

            const mockElement = createMockElement(dataset);
            const factory = createUnitTypeFormFactory();
            const result = factory.call(mockElement);

            // The factory should return a function that creates the state
            expect(typeof result).toBe('object');
            expect(result).not.toBeNull();
        });

        it('should throw error when required data attributes are missing', () => {
            const mockElement = createMockElement({});
            const factory = createUnitTypeFormFactory();

            expect(() => {
                factory.call(mockElement);
            }).toThrow('UnitTypeFormFactory requires data-api-url and data-building-id attributes');
        });

        it('should handle legacy direct parameter patterns', () => {
            const factory = createUnitTypeFormFactory('/api/', 'building-456');
            const result = factory.call({} as HTMLElement);

            expect(typeof result).toBe('object');
            expect(result).not.toBeNull();
        });

        it('should handle config object pattern', () => {
            const config = {
                apiURL:     '/api/v2/',
                buildingID: 'building-789'
            };

            const factory = createUnitTypeFormFactory(config);
            const result = factory.call({} as HTMLElement);

            expect(typeof result).toBe('object');
            expect(result).not.toBeNull();
        });

        it('should handle JSON string config pattern', () => {
            const configString = JSON.stringify({
                apiURL:     '/api/v3/',
                buildingID: 'building-999'
            });

            const factory = createUnitTypeFormFactory(configString);
            const result = factory.call({} as HTMLElement);

            expect(typeof result).toBe('object');
            expect(result).not.toBeNull();
        });
    });

    describe('Factory function context handling', () => {
        it('should handle $root and $el context variations', () => {
            const dataset = {
                unitType: JSON.stringify({ modelID: 'test' }),
                apiUrl:   '/api/'
            };

            // Test with $root context
            const contextWithRoot = createMockAlpineContext(dataset);
            contextWithRoot.$root = createMockElement(dataset);
            // Test without $el context (make property optional)
            if('$el' in contextWithRoot) {
                delete (contextWithRoot as { $el?: unknown }).$el;
            }

            const factory1 = createUnitTypeCardFactory.bind(contextWithRoot);
            const result1 = factory1();
            expect(result1.unitType.modelID).toBe('test');

            // Test with $el context
            const contextWithEl = createMockAlpineContext(dataset);
            // Test without $root context (make property optional)
            if('$root' in contextWithEl) {
                delete (contextWithEl as { $root?: unknown }).$root;
            }

            const factory2 = createUnitTypeCardFactory.bind(contextWithEl);
            const result2 = factory2();
            expect(result2.unitType.modelID).toBe('test');
        });

        it('should handle missing context gracefully', () => {
            const emptyContext = {} as ReturnType<typeof createMockAlpineContext>;

            expect(() => {
                const factory = createUnitTypeCardFactory.bind(emptyContext);
                factory();
            }).not.toThrow();
        });
    });
});
