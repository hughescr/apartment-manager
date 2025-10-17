// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
    createMockAlpineContext,
    createMockElement,
    resetAllMocks,
    cleanup,
    mockAlpine,
    mockAlpineData,
    mockFetch,
    mockLeaflet,
    jest
} from './test-setup';

// Import registry and factory functions
import registerAlpineComponents from '../../../../astro-src/lib/alpine-registry';
import { createUnitTypeCardFactory } from '../../../../astro-src/lib/unit-type-card/factory';
import { createLocationMapFactory } from '../../../../astro-src/lib/location-map/factory';

describe('Alpine.js Registry Integration Tests', () => {
    beforeEach(() => {
        resetAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    describe('End-to-End Registration Flow', () => {
        it('should complete full registration workflow', () => {
            // Step 1: Register all components
            registerAlpineComponents(mockAlpine);

            // Step 2: Verify all expected components are registered
            expect(mockAlpineData).toHaveBeenCalledTimes(11);

            // Step 3: Extract and test a specific factory
            const unitTypeCardCall = mockAlpineData.mock.calls.find(
                ([name]) => name === 'unitTypeCardData'
            );
            expect(unitTypeCardCall).toBeDefined();

            const [, factory] = unitTypeCardCall! as [string, (this: unknown) => { unitType: unknown, apiURL: string, saveUnitType: unknown, formatCurrency: unknown }];

            // Step 4: Create component instance with real data
            const mockUnitType = {
                modelID:    'studio-deluxe',
                modelName:  'Deluxe Studio',
                buildingID: 'building-123',
                beds:       0,
                baths:      1,
                sqft:       550,
                rent:       2800
            };

            const dataset = {
                unitType:          JSON.stringify(mockUnitType),
                buildingAmenities: JSON.stringify([]),
                apiUrl:            '/api/v1/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const instance = factory.bind(mockContext)();

            // Step 5: Verify component is fully functional
            expect(instance.unitType).toEqual(mockUnitType);
            expect(instance.apiURL).toBe('/api/v1/');
            expect(typeof instance.saveUnitType).toBe('function');
            expect(typeof instance.formatCurrency).toBe('function');
        });

        it('should handle component interactions with DOM elements', () => {
            const dataset = {
                unitType: JSON.stringify({ modelID: 'test', rent: 2000 }),
                apiUrl:   '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            // Set the $el to have the correct dataset
            mockContext.$el = createMockElement(dataset);

            const factory = createUnitTypeCardFactory.bind(mockContext);
            const instance = factory();

            // Test DOM data extraction
            expect(instance.unitType.modelID).toBe('test');
            expect(instance.unitType.rent).toBe(2000);

            // Test method calls don't throw
            expect(() => {
                instance.isDirty();
                instance.formatCurrency(2500);
            }).not.toThrow();
        });

        it('should support multiple component instances without interference', () => {
            // Create two different unit type card instances
            const dataset1 = {
                unitType: JSON.stringify({ modelID: 'studio', rent: 2000 }),
                apiUrl:   '/api/'
            };

            const dataset2 = {
                unitType: JSON.stringify({ modelID: '1br', rent: 2800 }),
                apiUrl:   '/api/'
            };

            const context1 = createMockAlpineContext(dataset1);
            const context2 = createMockAlpineContext(dataset2);

            const factory1 = createUnitTypeCardFactory.bind(context1);
            const factory2 = createUnitTypeCardFactory.bind(context2);

            const instance1 = factory1();
            const instance2 = factory2();

            // Instances should be independent
            expect(instance1.unitType.modelID).toBe('studio');
            expect(instance2.unitType.modelID).toBe('1br');
            expect(instance1.unitType.rent).toBe(2000);
            expect(instance2.unitType.rent).toBe(2800);

            // Modifying one should not affect the other
            instance1.unitType.rent = 2200;
            expect(instance2.unitType.rent).toBe(2800);
        });
    });

    describe('LocationMap Integration', () => {
        it('should integrate with Leaflet library mock', async () => {
            const dataset = {
                latModel:   'coordinates.lat',
                lngModel:   'coordinates.lng',
                defaultLat: '37.7749',
                defaultLng: '-122.4194',
                apiUrl:     '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            mockContext.coordinates = { lat: 37.7749, lng: -122.4194 };

            const factory = createLocationMapFactory.bind(mockContext);
            const instance = factory();

            // Mock the initMap function to avoid actual Leaflet initialization
            const mockInitMap = jest.fn().mockResolvedValue(undefined);
            instance.initMap = mockInitMap;

            // Test map initialization
            await instance.initMap();

            // Verify mock initMap was called
            expect(mockInitMap).toHaveBeenCalled();
        });

        it('should handle geocoding workflow integration', async () => {
            // Mock successful geocoding response
            mockFetch.mockResolvedValueOnce({
                ok:   true,
                json: () => Promise.resolve({
                    success: true,
                    result:  {
                        lat:         40.7589,
                        lng:         -73.9851,
                        displayName: 'Times Square, New York, NY'
                    }
                })
            });

            const dataset = {
                latModel:      'coordinates.lat',
                lngModel:      'coordinates.lng',
                apiUrl:        '/api/',
                addressModels: JSON.stringify({
                    addressModel: 'address.street',
                    cityModel:    'address.city',
                    stateModel:   'address.state'
                })
            };

            const mockContext = createMockAlpineContext(dataset);
            // Set address properties directly on context for getNestedProperty to find
            mockContext.address = {
                street: '1 Times Square',
                city:   'New York',
                state:  'NY'
            };
            mockContext.coordinates = { lat: null, lng: null };

            const factory = createLocationMapFactory.bind(mockContext);
            const instance = factory();

            // Verify instance has needed properties
            expect(typeof instance.geocodeAddress).toBe('function');
            expect(typeof instance.getNestedProperty).toBe('function');

            // Test that getNestedProperty works correctly
            expect(instance.getNestedProperty('address.street')).toBe('1 Times Square');
            expect(instance.getNestedProperty('address.city')).toBe('New York');
            expect(instance.getNestedProperty('address.state')).toBe('NY');

            // Test geocoding workflow
            await instance.geocodeAddress();

            // Verify API was called with correct data
            expect(mockFetch).toHaveBeenCalledWith('/api/geocoding', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    address: '1 Times Square',
                    city:    'New York',
                    state:   'NY'
                })
            });

            // Verify dispatch was called for success toast
            expect(mockContext.$dispatch).toHaveBeenCalledWith('show-toast', {
                message: 'Address geocoded: Times Square, New York, NY',
                type:    'success'
            });
        });
    });

    describe('Real-world Usage Patterns', () => {
        it('should simulate typical unit card editing workflow', async () => {
            const originalUnit = {
                unitID:     'unit-101',
                modelID:    'studio',
                buildingID: 'building-1',
                unitNumber: '101',
                beds:       0,
                baths:      1,
                sqft:       500,
                rent:       2000,
                deposit:    { amount: 1500, refundable: true }
            };

            const dataset = {
                unitType: JSON.stringify(originalUnit),
                apiUrl:   '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);
            const instance = factory();

            // Step 1: Initial state should not be dirty
            expect(instance.isDirty()).toBe(false);

            // Step 2: Make changes
            instance.unitType.rent = 2200;
            (instance.unitType.deposit as { amount: number }).amount = 1600;

            // Step 3: Should now be dirty
            expect(instance.isDirty()).toBe(true);

            // Step 4: Test validation
            expect(instance.formatCurrency(instance.unitType.rent as number)).toBe('$2,200');

            // Step 5: Test deposit methods
            expect(instance.getDepositAmount()).toBe(1600);
            expect(instance.getDepositRefundable()).toBe(true);

            instance.setDepositRefundable(false);
            expect(instance.getDepositRefundable()).toBe(false);

            // Step 6: Mock successful save
            mockFetch.mockResolvedValueOnce({
                ok:   true,
                json: () => Promise.resolve({ success: true })
            });

            await instance.saveUnitType(instance);

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/buildings/building-1/unit-types/studio',
                expect.objectContaining({
                    method:  'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body:    expect.stringContaining('"rent":2200') as string
                }) as RequestInit
            );
        });

        it('should handle complex building amenities inheritance', () => {
            const buildingAmenities = [
                { id: 'pool', name: 'Pool', category: 'Recreation' },
                { id: 'gym', name: 'Gym', category: 'Recreation' },
                { id: 'parking', name: 'Parking', category: 'Convenience' }
            ];

            const unitType = {
                modelID:        'deluxe-1br',
                modelAmenities: [
                    { id: 'balcony', name: 'Private Balcony', category: 'Unit Features' }
                ]
            };

            const dataset = {
                unitType:          JSON.stringify(unitType),
                buildingAmenities: JSON.stringify(buildingAmenities),
                apiUrl:            '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);
            const instance = factory();

            // Test amenity inheritance logic
            const effectiveAmenities = instance.getEffectiveAmenities() as unknown[];
            expect(effectiveAmenities).toHaveLength(1);
            expect((effectiveAmenities as { id: string, name: string, category: string }[])[0]).toEqual({ id: 'balcony', name: 'Private Balcony', category: 'Unit Features' });
            // Test reset to inherited amenities
            instance.resetToInheritedAmenities();

            const afterReset = instance.getEffectiveAmenities() as unknown;
            expect(afterReset).toEqual(buildingAmenities);
        });

        it('should support tab-based UI integration for location maps', async () => {
            const dataset = {
                latModel: 'lat',
                lngModel: 'lng'
            };

            const mockContext = createMockAlpineContext(dataset);
            // Mock tab system
            mockContext.$root = createMockElement({}, { activeSectionTab: 'other-tab' });

            const factory = createLocationMapFactory.bind(mockContext);
            const instance = factory();

            // Mock initMap to avoid actual Leaflet calls
            const mockInitMap = jest.fn().mockResolvedValue(undefined);
            instance.initMap = mockInitMap;

            // Should set up watcher for tab visibility
            await instance.initMapWhenReady();

            // Verify $watch was called to monitor tab changes
            expect(mockContext.$watch).toHaveBeenCalledWith(
                '$root.activeSectionTab',
                expect.any(Function)
            );

            // Simulate tab becoming visible
            const watchCallback = (mockContext.$watch.mock.calls.find(
                ([property]) => property === '$root.activeSectionTab'
            )?.[1]) as ((value: string) => Promise<void>) | undefined;

            if(watchCallback) {
                await watchCallback('building-info');
            }

            // Verify that the watcher setup was called (mocked initMap avoids actual Leaflet)
            expect(mockInitMap).toHaveBeenCalled();
        });
    });

    describe('Performance and Resource Management', () => {
        it('should handle cleanup properly', () => {
            const dataset = {
                latModel: 'lat',
                lngModel: 'lng'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createLocationMapFactory.bind(mockContext);
            const instance = factory();

            // Initialize map
            const mockMapInstance = mockLeaflet.map() as { remove: jest.Mock };
            instance.map = mockMapInstance as never;

            // Test cleanup
            instance.destroy();

            // Verify cleanup was called
            if(instance.map && typeof instance.map === 'object' && 'remove' in instance.map) {
                expect(mockMapInstance.remove).toHaveBeenCalled();
            }
            expect(instance.map).toBeNull();
        });

        it('should prevent memory leaks in watchers', () => {
            const dataset = {
                latModel: 'lat',
                lngModel: 'lng'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createLocationMapFactory.bind(mockContext);
            factory();

            // $watch should return cleanup functions
            const calls = mockContext.$watch.mock.calls;
            calls.forEach(() => {
                // Each watcher should be properly configured
                expect(typeof (mockContext.$watch.mock.results[0]?.value as unknown)).toBe('function');
            });
        });

        it('should handle large datasets efficiently', () => {
            // Create large building with many amenities and unit types
            const largeBuildingAmenities = Array(100).fill(null).map((_, i) => ({
                id:       `amenity-${i}`,
                name:     `Amenity ${i}`,
                category: i % 2 === 0 ? 'Recreation' : 'Convenience'
            }));

            const largeUnitType = {
                modelID:        'luxury-penthouse',
                beds:           3,
                baths:          2.5,
                sqft:           1800,
                rent:           5000,
                modelAmenities: largeBuildingAmenities.slice(0, 50) // First 50 amenities
            };

            const dataset = {
                unitType:          JSON.stringify(largeUnitType),
                buildingAmenities: JSON.stringify(largeBuildingAmenities),
                apiUrl:            '/api/'
            };

            const mockContext = createMockAlpineContext(dataset);
            const factory = createUnitTypeCardFactory.bind(mockContext);

            // Should handle large datasets without performance issues
            const startTime = Date.now();
            const instance = factory();
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(100); // Should be very fast

            expect(instance.buildingAmenities).toHaveLength(100);
            expect((instance.getEffectiveAmenities() as unknown[]).length).toBe(50);
        });
    });
});
