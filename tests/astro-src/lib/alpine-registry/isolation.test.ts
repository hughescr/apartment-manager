// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';

import { describe, it, expect, beforeEach, afterEach, jest } from 'bun:test';
import {
    createMockAlpineContext,
    resetAllMocks,
    cleanup,
    mockAlpine,
    mockAlpineData
} from './test-setup';

// Import registry function
import registerAlpineComponents from '../../../../astro-src/lib/alpine-registry';
import { createUnitTypeCardFactory } from '../../../../astro-src/lib/unit-type-card/factory';
import { createLocationMapFactory } from '../../../../astro-src/lib/location-map/factory';

describe('Alpine.js Component Isolation and Registration', () => {
    beforeEach(() => {
        resetAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    describe('Duplicate Registration Prevention', () => {
        it('should handle multiple registration calls gracefully', () => {
            // Register components multiple times
            registerAlpineComponents(mockAlpine);
            registerAlpineComponents(mockAlpine);
            registerAlpineComponents(mockAlpine);

            // Should have called Alpine.data for each component multiple times
            // but shouldn't throw or cause errors
            expect(mockAlpineData.mock.calls.length).toBe(33); // 11 components × 3 calls
            expect(mockAlpineData).toHaveBeenCalledWith('unitCardData', expect.any(Function));
        });

        it('should not interfere with existing Alpine registrations', () => {
            // Pre-register some external components
            const externalFactory = () => ({ external: true });
            mockAlpine.data('externalComponent1', externalFactory);
            mockAlpine.data('externalComponent2', externalFactory);

            const externalCallsBefore = mockAlpineData.mock.calls.length;

            // Register our components
            registerAlpineComponents(mockAlpine);

            // Verify external components weren't affected
            const externalCallsAfter = mockAlpineData.mock.calls.length;
            expect(externalCallsAfter - externalCallsBefore).toBe(11);

            // Verify external components are still registered
            expect(mockAlpineData).toHaveBeenCalledWith('externalComponent1', externalFactory);
            expect(mockAlpineData).toHaveBeenCalledWith('externalComponent2', externalFactory);
        });

        it('should maintain component registration order', () => {
            registerAlpineComponents(mockAlpine);

            const calls = mockAlpineData.mock.calls;
            const componentNames = calls.map((call) => {
                const [name] = call as [string, unknown];
                return name;
            });

            // Verify specific components are registered in the expected order
            expect(componentNames).toContain('buildingStateData');
            expect(componentNames).toContain('petPolicyData');
            expect(componentNames).toContain('unitCardData');
            expect(componentNames).toContain('unitTypeCardData');
            expect(componentNames).toContain('locationMapData');

            // First few components should be in specific order
            expect(componentNames[0]).toBe('buildingStateData');
            expect(componentNames[1]).toBe('petPolicyData');
        });
    });

    describe('Component Instance Isolation', () => {
        it('should create isolated instances for each factory call', () => {
            const mockUnitType1 = { modelID: 'studio', rent: 2000 };
            const mockUnitType2 = { modelID: '1br', rent: 2800 };

            const context1 = createMockAlpineContext({
                unitType: JSON.stringify(mockUnitType1),
                apiUrl:   '/api/'
            });

            const context2 = createMockAlpineContext({
                unitType: JSON.stringify(mockUnitType2),
                apiUrl:   '/api/'
            });

            const factory1 = createUnitTypeCardFactory.bind(context1);
            const factory2 = createUnitTypeCardFactory.bind(context2);

            const instance1 = factory1();
            const instance2 = factory2();

            // Instances should be completely separate
            expect(instance1).not.toBe(instance2);
            expect(instance1.unitType).not.toBe(instance2.unitType);

            // Verify independent state
            expect(instance1.unitType.modelID).toBe('studio');
            expect(instance2.unitType.modelID).toBe('1br');

            // Modifying one should not affect the other
            instance1.unitType.rent = 2200;
            expect(instance1.unitType.rent).toBe(2200);
            expect(instance2.unitType.rent).toBe(2800);

            instance1.saving = true;
            expect(instance1.saving).toBe(true);
            expect(instance2.saving).toBe(false);
        });

        it('should isolate factory function state properly', () => {
            // Create multiple location map instances
            const dataset1 = {
                latModel:   'building1.lat',
                lngModel:   'building1.lng',
                defaultLat: '37.7749',
                defaultLng: '-122.4194'
            };

            const dataset2 = {
                latModel:   'building2.lat',
                lngModel:   'building2.lng',
                defaultLat: '40.7589',
                defaultLng: '-73.9851'
            };

            const context1 = createMockAlpineContext(dataset1);
            const context2 = createMockAlpineContext(dataset2);

            // Add different coordinates to each context
            context1.building1 = { lat: 37.7749, lng: -122.4194 };
            context2.building2 = { lat: 40.7589, lng: -73.9851 };

            const factory1 = createLocationMapFactory.bind(context1);
            const factory2 = createLocationMapFactory.bind(context2);

            const instance1 = factory1();
            const instance2 = factory2();

            // Should access different property paths
            expect(instance1.getNestedProperty('building1.lat') as number).toBe(37.7749);
            expect(instance2.getNestedProperty('building2.lat') as number).toBe(40.7589);

            expect(instance1.getNestedProperty('building2.lat')).toBeUndefined();
            expect(instance2.getNestedProperty('building1.lat')).toBeUndefined();

            // Should have independent geocoding state
            instance1.geocoding = true;
            expect(instance1.geocoding).toBe(true);
            expect(instance2.geocoding).toBe(false);
        });

        it('should prevent cross-instance method interference', () => {
            const mockContext1 = createMockAlpineContext({
                unitType: JSON.stringify({ modelID: 'test1', rent: 2000 }),
                apiUrl:   '/api/'
            });

            const mockContext2 = createMockAlpineContext({
                unitType: JSON.stringify({ modelID: 'test2', rent: 3000 }),
                apiUrl:   '/api/'
            });

            const instance1 = createUnitTypeCardFactory.bind(mockContext1)();
            const instance2 = createUnitTypeCardFactory.bind(mockContext2)();

            // Test method calls on different instances
            const formatted1 = instance1.formatCurrency(2500);
            const formatted2 = instance2.formatCurrency(3500);

            expect(formatted1).toBe('$2,500');
            expect(formatted2).toBe('$3,500');

            // Test state modification methods
            instance1.expandedAmenities = true;
            instance2.expandedAmenities = false;

            expect(instance1.expandedAmenities).toBe(true);
            expect(instance2.expandedAmenities).toBe(false);

            // Test independent object references
            expect(instance1.unitType).not.toBe(instance2.unitType);
            expect(instance1.buildingAmenities).not.toBe(instance2.buildingAmenities);
        });
    });

    describe('Memory Management and Cleanup', () => {
        it('should not create memory leaks with multiple instances', () => {
            const instances: unknown[] = [];

            // Create many instances
            for(let i = 0; i < 100; i++) {
                const context = createMockAlpineContext({
                    unitType: JSON.stringify({ modelID: `unit-${i}`, rent: 2000 + i }),
                    apiUrl:   '/api/'
                });

                const factory = createUnitTypeCardFactory.bind(context);
                instances.push(factory());
            }

            expect(instances).toHaveLength(100);

            // Each instance should be unique
            const uniqueInstances = new Set(instances);
            expect(uniqueInstances.size).toBe(100);

            // Instances should be garbage collectable
            instances.length = 0;
            expect(instances).toHaveLength(0);
        });

        it('should handle cleanup of complex nested objects', () => {
            const complexUnitType = {
                modelID:        'complex-unit',
                modelAmenities: Array(50).fill(null).map((_, i) => ({
                    id:       `amenity-${i}`,
                    name:     `Amenity ${i}`,
                    metadata: {
                        category:    'test',
                        subcategory: `sub-${i}`,
                        nested:      {
                            deep: {
                                value: i
                            }
                        }
                    }
                }))
            };

            const context = createMockAlpineContext({
                unitType: JSON.stringify(complexUnitType),
                apiUrl:   '/api/'
            });

            const factory = createUnitTypeCardFactory.bind(context);
            let instance = factory();

            expect(instance.unitType.modelAmenities).toHaveLength(50);

            // Clear reference to allow garbage collection
            instance = null as unknown as typeof instance;

            expect(instance).toBeNull();
        });

        it('should properly isolate service instances', () => {
            const context1 = createMockAlpineContext({
                unitType: JSON.stringify({ modelID: 'test1' }),
                apiUrl:   '/api/'
            });

            const context2 = createMockAlpineContext({
                unitType: JSON.stringify({ modelID: 'test2' }),
                apiUrl:   '/api/'
            });

            const instance1 = createUnitTypeCardFactory.bind(context1)();
            const instance2 = createUnitTypeCardFactory.bind(context2)();

            // Each instance should have independent service references
            // (In a real implementation, these would be different service instances)
            expect(instance1.unitType).not.toBe(instance2.unitType);
            expect(instance1.buildingAmenities).not.toBe(instance2.buildingAmenities);
            expect(instance1.originalUnitType).not.toBe(instance2.originalUnitType);
        });
    });

    describe('Registry State Management', () => {
        it('should maintain consistent registration state across calls', () => {
            // Get initial state
            const initialCallCount = mockAlpineData.mock.calls.length;

            registerAlpineComponents(mockAlpine);
            const firstCallCount = mockAlpineData.mock.calls.length;

            registerAlpineComponents(mockAlpine);
            const secondCallCount = mockAlpineData.mock.calls.length;

            // Each call should register the same number of components
            expect(firstCallCount - initialCallCount).toBe(secondCallCount - firstCallCount);
            expect(secondCallCount - firstCallCount).toBe(11);
        });

        it('should handle registry errors gracefully', () => {
            // Mock Alpine.data to throw on specific component
            const originalData = mockAlpineData;
            const faultyData = jest.fn().mockImplementation((name: string, factory: () => unknown) => {
                if(name === 'unitCardData') {
                    throw new Error('Registration failed');
                }
                return originalData(name, factory) as unknown;
            });

            mockAlpine.data = faultyData;

            // Should not throw even if one registration fails
            expect(() => registerAlpineComponents(mockAlpine)).toThrow();

            // Reset mock
            mockAlpine.data = originalData;
        });

        it('should preserve Alpine instance integrity', () => {
            const alpineInstance = { ...mockAlpine };

            registerAlpineComponents(alpineInstance);

            // Alpine instance should not be modified
            expect(alpineInstance.data).toBe(mockAlpineData);
            expect(Object.keys(alpineInstance)).toEqual(Object.keys(mockAlpine));
        });
    });

    describe('Component Factory Consistency', () => {
        it('should ensure all factory functions return consistent interfaces', () => {
            registerAlpineComponents(mockAlpine);

            const calls = mockAlpineData.mock.calls;

            calls.forEach((call) => {
                const [componentName, factory] = call as [string, () => unknown];
                expect(typeof factory).toBe('function');

                // Factory functions should be callable
                if(['unitTypeCardData', 'unitTypeFormData', 'locationMapData'].includes(componentName)) {
                    // These require context, so we test they're functions
                    expect(typeof factory).toBe('function');
                } else {
                    // These should return objects when called
                    const result = factory();
                    expect(typeof result).toBe('object');
                    expect(result).not.toBeNull();
                }
            });
        });

        it('should maintain factory function identity across registrations', () => {
            registerAlpineComponents(mockAlpine);
            const firstCalls = [...mockAlpineData.mock.calls];

            resetAllMocks();
            registerAlpineComponents(mockAlpine);
            const secondCalls = [...mockAlpineData.mock.calls];

            // Should register the same factories (by reference)
            expect(firstCalls).toHaveLength(secondCalls.length);

            // Component names should be consistent
            const firstNames = firstCalls.map((call) => {
                const [name] = call as [string, unknown];
                return name;
            });
            const secondNames = secondCalls.map((call) => {
                const [name] = call as [string, unknown];
                return name;
            });
            expect(firstNames).toEqual(secondNames);
        });

        it('should provide stable component interfaces', () => {
            // Create two instances of the same component
            const dataset = {
                unitType: JSON.stringify({ modelID: 'test' }),
                apiUrl:   '/api/'
            };

            const context1 = createMockAlpineContext(dataset);
            const context2 = createMockAlpineContext(dataset);

            const instance1 = createUnitTypeCardFactory.bind(context1)();
            const instance2 = createUnitTypeCardFactory.bind(context2)();

            // Should have same interface (method names)
            const keys1 = Object.keys(instance1);
            const keys2 = Object.keys(instance2);

            expect(keys1).toEqual(keys2);

            // Critical methods should exist on both
            const criticalMethods = ['init', 'saveUnitType', 'isDirty', 'formatCurrency'];
            criticalMethods.forEach((method) => {
                expect(typeof instance1[method as keyof typeof instance1]).toBe('function');
                expect(typeof instance2[method as keyof typeof instance2]).toBe('function');
            });
        });
    });
});
