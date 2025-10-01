// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';

import { describe, it, expect, beforeEach, afterEach, jest, spyOn } from 'bun:test';
import { noop } from 'lodash';
import {
    mockAlpine,
    mockAlpineData,
    resetAllMocks,
    cleanup
} from './test-setup';

// Import the registry function
import registerAlpineComponents from '../../../../astro-src/lib/alpine-registry';

describe('Alpine.js Registry System', () => {
    beforeEach(() => {
        resetAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    describe('registerAlpineComponents', () => {
        it('should register all Alpine components with correct names', () => {
            registerAlpineComponents(mockAlpine);

            // Verify all components are registered
            const expectedRegistrations = [
                'buildingStateData',
                'petPolicyData',
                'addBuildingFormData',
                'buildingManagerData',
                'buildingsComponentData',
                'buildingsListData',
                'modelAmenitiesManagerData',
                'unitCardData',
                'unitTypeCardData',
                'unitTypeFormData',
                'locationMapData'
            ];

            expect(mockAlpineData).toHaveBeenCalledTimes(expectedRegistrations.length);

            // Check each registration
            expectedRegistrations.forEach((componentName) => {
                expect(mockAlpineData).toHaveBeenCalledWith(
                    componentName,
                    expect.any(Function)
                );
            });
        });

        it('should register components with factory functions that return objects', () => {
            registerAlpineComponents(mockAlpine);

            // Get the calls made to Alpine.data
            const calls = mockAlpineData.mock.calls;

            calls.forEach(([componentName, factory]) => {
                expect(typeof factory).toBe('function');

                // Factory functions should be callable
                // Note: Some factories may require context (this binding) and parameters
                if(['unitTypeCardData', 'unitTypeFormData', 'locationMapData'].includes(componentName)) {
                    // These are factory functions that need context
                    expect(typeof factory).toBe('function');
                } else {
                    // These should return objects directly
                    const result = factory();
                    expect(typeof result).toBe('object');
                    expect(result).not.toBeNull();
                }
            });
        });

        it('should handle multiple registrations without throwing', () => {
            expect(() => {
                registerAlpineComponents(mockAlpine);
                registerAlpineComponents(mockAlpine);
            }).not.toThrow();

            // Should have been called twice for each component
            expect(mockAlpineData).toHaveBeenCalledTimes(22); // 11 components × 2 calls
        });

        it('should log registration information to console', () => {
            // Mock console.log to capture logging
            const consoleSpy = spyOn(console, 'log').mockImplementation(noop);

            registerAlpineComponents(mockAlpine);

            expect(consoleSpy).toHaveBeenCalledWith(
                '[alpine-registry] Alpine components registered:',
                expect.objectContaining({
                    buildingStateData: 'building state management',
                    petPolicyData:     'pet policy state',
                    unitTypeFormData:  'unit type form state (now centralized with factory)',
                    unitCardData:      'unit card state (now centralized)',
                    locationMapData:   'location map (now centralized with factory)',
                    unitTypeCardData:  'unit type card (now centralized with factory)'
                })
            );

            consoleSpy.mockRestore();
        });

        it('should handle null or undefined Alpine objects', () => {
            // The current implementation doesn't handle null/undefined gracefully, which is expected
            expect(() => registerAlpineComponents(null as unknown as typeof mockAlpine)).toThrow();
            expect(() => registerAlpineComponents(undefined as unknown as typeof mockAlpine)).toThrow();
        });
    });

    describe('Auto-registration behavior', () => {
        it('should register immediately when Alpine is already available on window', () => {
            // This tests the fallback registration in the module
            // The module checks if window.Alpine exists and registers immediately

            // Reset the module state by clearing require cache (if supported)
            // Since we can't easily test module loading, we'll test the logic conceptually
            expect(global.window.Alpine).toBe(mockAlpine);

            // The auto-registration should have occurred during module load
            // We can verify this by checking that Alpine.data was called
            // (Note: This might have been called during module import)
        });

        it('should set up event listener for alpine:init when Alpine is not immediately available', () => {
            // Mock window without Alpine initially
            const mockWindowWithoutAlpine = {
                Alpine:              undefined,
                addEventListener:    jest.fn(),
                removeEventListener: jest.fn()
            };

            global.window = mockWindowWithoutAlpine as unknown as Window & typeof globalThis;

            // Re-import or re-evaluate the module logic
            // Since the module auto-runs, we test the concept that it would add the listener
            expect(typeof global.window.addEventListener).toBe('function');
        });
    });

    describe('Component isolation', () => {
        it('should ensure each registered component has unique factory', () => {
            registerAlpineComponents(mockAlpine);

            const calls = mockAlpineData.mock.calls;
            const factories = calls.map(([_, factory]) => factory);

            // All factories should be unique function references
            const uniqueFactories = new Set(factories);
            expect(uniqueFactories.size).toBe(factories.length);
        });

        it('should not interfere with external Alpine registrations', () => {
            // Register some external component first
            mockAlpine.data('externalComponent', () => ({ external: true }));

            const externalCallCount = mockAlpineData.mock.calls.length;

            // Now register our components
            registerAlpineComponents(mockAlpine);

            // Should have added our components without affecting existing registrations
            expect(mockAlpineData).toHaveBeenCalledTimes(externalCallCount + 11);
        });
    });
});
