import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { noop } from 'lodash';
import './test-setup'; // Import test setup for DOM mocking
import { setupFakeTimers, teardownFakeTimers, tick } from '../../utils/timer-acceleration';
import { BuildingCore } from '../../../astro-src/lib/building/state.ts';
import type { BuildingCoreState } from '../../../astro-src/lib/building/state.ts';
import type { AlpineMagicProperties } from '../../../astro-src/lib/alpine';

describe('BuildingCore', () => {
    let mockState: BuildingCoreState & AlpineMagicProperties;
    let buildingCore: BuildingCore;

    beforeEach(() => {
        // Setup fake timers for all tests
        setupFakeTimers();

        // Mock Alpine.js state
        mockState = {
            building: null,
            original: null,
            apiURL: '',
            saving: false,
            showSave: false,
            lastSaveSuccess: false,
            errors: {},
            expandedRentSpecials: {},
            $watch: noop,
            $nextTick: (callback: () => void) => callback(),
            $dispatch: noop,
            $store: {},
            $root: { dataset: {} } as HTMLElement,
            $el: (() => {
                // Create a mock element that works in test environment
                const el = { dataset: {} } as HTMLElement;
                return el;
            })()
        };

        buildingCore = new BuildingCore(mockState);
    });

    afterEach(() => {
        // Always cleanup after each test
        if(buildingCore) {
            buildingCore.destroy();
        }

        // Teardown fake timers
        teardownFakeTimers();
    });

    describe('timeout cleanup', () => {
        it('should clear timeout when destroy is called before timeout completes', (done) => {
            // Mock global setTimeout and clearTimeout to track calls
            const originalSetTimeout = global.setTimeout;
            const originalClearTimeout = global.clearTimeout;

            let timeoutId: ReturnType<typeof setTimeout> | null = null;
            let clearTimeoutCalled = false;
            let timeoutCallback: (() => void) | null = null;

            global.setTimeout = ((callback: () => void, delay: number) => {
                timeoutCallback = callback;
                timeoutId = originalSetTimeout(callback, delay);
                return timeoutId;
            }) as typeof global.setTimeout;

            global.clearTimeout = ((id?: ReturnType<typeof setTimeout>) => {
                clearTimeoutCalled = true;
                if(id && timeoutId === id) {
                    originalClearTimeout(id);
                }
            }) as typeof global.clearTimeout;

            // Setup watchers to trigger setTimeout
            buildingCore.setupBuildingWatchers();

            // Verify timeout was created
            expect(timeoutId).not.toBeNull();
            expect(timeoutCallback).not.toBeNull();

            // Immediately destroy to test cleanup
            buildingCore.destroy();

            // Verify clearTimeout was called
            expect(clearTimeoutCalled).toBe(true);

            // Restore original functions
            global.setTimeout = originalSetTimeout;
            global.clearTimeout = originalClearTimeout;

            done();
        });

        it('should handle destroy gracefully when timeout has already completed', () => {
            // Setup watchers
            buildingCore.setupBuildingWatchers();

            // Advance time to let timeout complete
            tick(150); // Wait longer than the 100ms timeout

            // Destroy after timeout completes - should not throw error
            expect(() => buildingCore.destroy()).not.toThrow();
        });

        it('should handle multiple destroy calls gracefully', () => {
            buildingCore.setupBuildingWatchers();

            // Multiple destroy calls should not throw
            expect(() => {
                buildingCore.destroy();
                buildingCore.destroy();
                buildingCore.destroy();
            }).not.toThrow();
        });
    });

    describe('original functionality', () => {
        it('should maintain original setTimeout behavior when not destroyed', () => {
            let timeoutExecuted = false;

            // Mock the timeout callback to track execution
            const originalSetTimeout = global.setTimeout;
            global.setTimeout = ((callback: () => void, delay: number) => {
                const wrappedCallback = () => {
                    // eslint-disable-next-line n/callback-return -- Test mock callback wrapper doesn't need return
                    callback();
                    timeoutExecuted = true;
                };
                return originalSetTimeout(wrappedCallback, delay);
            }) as typeof global.setTimeout;

            buildingCore.setupBuildingWatchers();

            // Advance time to let timeout execute
            tick(150);

            // Verify timeout executed
            expect(timeoutExecuted).toBe(true);

            // Restore original function
            global.setTimeout = originalSetTimeout;
        });
    });
});
