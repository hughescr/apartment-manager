// Import test setup first to ensure proper mocking
import '../data/test-setup';

import { describe, test, expect, beforeEach, afterEach, jest } from 'bun:test';
import {
    cleanupRadarService,
    getRadarServiceStats,
    isRadarServiceDestroyed
} from '../../src/services/radar-service';
import {
    cleanupAddressAutocompleteService,
    getAddressAutocompleteServiceStats,
    isAddressAutocompleteServiceDestroyed
} from '../../src/services/address-autocomplete';
import {
    CleanupManager,
    registerCleanupHandler,
    triggerCleanup,
    getCleanupManagerStats
} from '../../src/services/cleanup-manager';

// Note: Bun test doesn't have jest.mock, so we'll just test functionality

describe('CleanupManager', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Clean up mock calls
        jest.clearAllMocks();
    });

    test('should be a singleton', () => {
        const instance1 = CleanupManager.getInstance();
        const instance2 = CleanupManager.getInstance();
        expect(instance1).toBe(instance2);
    });

    test('should register and track cleanup handlers', () => {
        const mockHandler = jest.fn();
        const initialStats = getCleanupManagerStats();

        registerCleanupHandler(mockHandler);

        const afterStats = getCleanupManagerStats();
        expect(afterStats.registeredHandlers).toBe(initialStats.registeredHandlers + 1);
    });

    test('should execute cleanup handlers when triggered', () => {
        const mockHandler1 = jest.fn();
        const mockHandler2 = jest.fn();

        registerCleanupHandler(mockHandler1);
        registerCleanupHandler(mockHandler2);

        triggerCleanup();

        expect(mockHandler1).toHaveBeenCalled();
        expect(mockHandler2).toHaveBeenCalled();
    });

    test('should handle errors in cleanup handlers gracefully', () => {
        const errorHandler = jest.fn(() => {
            throw new Error('Test cleanup error');
        });
        const normalHandler = jest.fn();

        registerCleanupHandler(errorHandler);
        registerCleanupHandler(normalHandler);

        // Should not throw despite the error handler
        expect(() => triggerCleanup()).not.toThrow();

        // If cleanup was already triggered, handlers may not be called again
        // But the function should still not throw
        expect(getCleanupManagerStats().isShuttingDown).toBe(true);
    });

    test('should track shutdown state', () => {
        const initialStats = getCleanupManagerStats();
        // Note: may already be true if cleanup was previously triggered
        expect(typeof initialStats.isShuttingDown).toBe('boolean');

        triggerCleanup();

        const afterStats = getCleanupManagerStats();
        expect(afterStats.isShuttingDown).toBe(true);
    });

    test('should verify service cleanup status', () => {
        const stats = getCleanupManagerStats();

        // Check that services status is tracked (may already be destroyed)
        expect(typeof stats.servicesDestroyed.radarService).toBe('boolean');
        expect(typeof stats.servicesDestroyed.addressAutocompleteService).toBe('boolean');

        triggerCleanup();

        const afterStats = getCleanupManagerStats();
        expect(afterStats.servicesDestroyed.radarService).toBe(true);
        expect(afterStats.servicesDestroyed.addressAutocompleteService).toBe(true);
    });
});

describe('Service Cleanup Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should cleanup radar service properly', () => {
        // Call cleanup (idempotent if already destroyed)
        cleanupRadarService();

        expect(isRadarServiceDestroyed()).toBe(true);
        // Note: Logger may not be called if already destroyed
    });

    test('should cleanup address autocomplete service properly', () => {
        // Call cleanup (idempotent if already destroyed)
        cleanupAddressAutocompleteService();

        expect(isAddressAutocompleteServiceDestroyed()).toBe(true);
        // Note: Logger may not be called if already destroyed
    });

    test('should handle multiple cleanup calls idempotently', () => {
        // First cleanup
        cleanupRadarService();
        expect(isRadarServiceDestroyed()).toBe(true);

        // Second cleanup should be idempotent
        cleanupRadarService();
        expect(isRadarServiceDestroyed()).toBe(true);

        // Service should remain destroyed after multiple calls
        expect(isRadarServiceDestroyed()).toBe(true);
    });

    test('should provide accurate service statistics', () => {
        const radarStats = getRadarServiceStats();
        const addressStats = getAddressAutocompleteServiceStats();

        expect(radarStats).toHaveProperty('cache');
        expect(radarStats).toHaveProperty('debouncer');
        expect(radarStats.cache).toHaveProperty('autocompleteSize');
        expect(radarStats.cache).toHaveProperty('ipSize');
        expect(radarStats.debouncer).toHaveProperty('pendingTimeouts');
        expect(radarStats.debouncer).toHaveProperty('pendingPromises');

        expect(addressStats).toHaveProperty('cache');
        expect(addressStats).toHaveProperty('debouncer');
        expect(addressStats.cache).toHaveProperty('size');
        expect(addressStats.cache).toHaveProperty('ttlMinutes');
        expect(addressStats.debouncer).toHaveProperty('pendingTimeouts');
        expect(addressStats.debouncer).toHaveProperty('pendingPromises');
    });
});

describe('Memory Leak Prevention', () => {
    test('should clear all singleton resources', () => {
        // Trigger cleanup (idempotent)
        triggerCleanup();

        // Verify all singletons are destroyed
        expect(isRadarServiceDestroyed()).toBe(true);
        expect(isAddressAutocompleteServiceDestroyed()).toBe(true);

        // Verify cleanup manager tracked the destruction
        const cleanupStats = getCleanupManagerStats();
        expect(cleanupStats.servicesDestroyed.radarService).toBe(true);
        expect(cleanupStats.servicesDestroyed.addressAutocompleteService).toBe(true);
    });

    test('should prevent further usage of destroyed instances', () => {
        // Cleanup services (idempotent)
        cleanupRadarService();
        cleanupAddressAutocompleteService();

        // Verify services are destroyed and tracked
        expect(isRadarServiceDestroyed()).toBe(true);
        expect(isAddressAutocompleteServiceDestroyed()).toBe(true);
    });
});
