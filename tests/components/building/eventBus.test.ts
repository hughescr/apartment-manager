// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';

import { describe, it, expect, beforeEach } from 'bun:test';
import _ from 'lodash';
import { BuildingEventBus, buildingEventBus, connectAlpineEventBus } from '../../../astro-src/lib/building/eventBus';
import { jest } from './test-setup';

describe('BuildingEventBus', () => {
    let eventBus: BuildingEventBus;

    beforeEach(() => {
        eventBus = new BuildingEventBus();
    });

    describe('Event Subscription', () => {
        it('should subscribe to events', () => {
            const listener = jest.fn();

            const unsubscribe = eventBus.on('building:updated', listener);

            expect(typeof unsubscribe).toBe('function');
            expect(eventBus.listenerCount('building:updated')).toBe(1);
        });

        it('should support multiple listeners for same event', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();

            eventBus.on('building:updated', listener1);
            eventBus.on('building:updated', listener2);

            expect(eventBus.listenerCount('building:updated')).toBe(2);
        });

        it('should subscribe to different event types', () => {
            const buildingListener = jest.fn();
            const toastListener = jest.fn();

            eventBus.on('building:updated', buildingListener);
            eventBus.on('toast:show', toastListener);

            expect(eventBus.listenerCount('building:updated')).toBe(1);
            expect(eventBus.listenerCount('toast:show')).toBe(1);
        });

        it('should subscribe to events once', () => {
            const listener = jest.fn();

            eventBus.once('building:save', listener);

            expect(eventBus.listenerCount('building:save')).toBe(1);
        });
    });

    describe('Event Emission', () => {
        it('should emit events to all listeners', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();
            const eventData = { building: { buildingID: 'test-123' } };

            eventBus.on('building:updated', listener1);
            eventBus.on('building:updated', listener2);

            eventBus.emit('building:updated', eventData);

            expect(listener1).toHaveBeenCalledWith(eventData);
            expect(listener2).toHaveBeenCalledWith(eventData);
        });

        it('should emit toast events', () => {
            const listener = jest.fn();
            const toastData = { message: 'Test message', toastType: 'success' as const };

            eventBus.on('toast:show', listener);
            eventBus.emit('toast:show', toastData);

            expect(listener).toHaveBeenCalledWith(toastData);
        });

        it('should emit validation events', () => {
            const listener = jest.fn();
            const validationData = { isValid: true, errors: {} };

            eventBus.on('building:validate', listener);
            eventBus.emit('building:validate', validationData);

            expect(listener).toHaveBeenCalledWith(validationData);
        });

        it('should emit tab change events', () => {
            const listener = jest.fn();
            const tabData = { activeTab: 'marketing' };

            eventBus.on('tab:change', listener);
            eventBus.emit('tab:change', tabData);

            expect(listener).toHaveBeenCalledWith(tabData);
        });

        it('should emit units filter events', () => {
            const listener = jest.fn();
            const filterData = { filter: 'Occupied', query: '101' };

            eventBus.on('units:filter', listener);
            eventBus.emit('units:filter', filterData);

            expect(listener).toHaveBeenCalledWith(filterData);
        });

        it('should emit bulk update events', () => {
            const listener = jest.fn();
            const bulkData = { operationType: 'status' as const, unitIDs: ['unit-1', 'unit-2'] };

            eventBus.on('units:bulk-update', listener);
            eventBus.emit('units:bulk-update', bulkData);

            expect(listener).toHaveBeenCalledWith(bulkData);
        });

        it('should not throw when emitting events with no listeners', () => {
            expect(() => {
                eventBus.emit('building:updated', { building: { buildingID: 'test' } });
            }).not.toThrow();
        });

        it('should continue emitting to other listeners when one throws', () => {
            const errorListener = jest.fn().mockImplementation(() => {
                throw new Error('Listener error');
            });
            const goodListener = jest.fn();

            eventBus.on('building:updated', errorListener);
            eventBus.on('building:updated', goodListener);

            const eventData = { building: { buildingID: 'test' } };

            expect(() => {
                eventBus.emit('building:updated', eventData);
            }).not.toThrow();

            expect(errorListener).toHaveBeenCalledWith(eventData);
            expect(goodListener).toHaveBeenCalledWith(eventData);
        });
    });

    describe('Event Unsubscription', () => {
        it('should unsubscribe individual listeners', () => {
            const listener = jest.fn();

            const unsubscribe = eventBus.on('building:updated', listener);
            expect(eventBus.listenerCount('building:updated')).toBe(1);

            unsubscribe();
            expect(eventBus.listenerCount('building:updated')).toBe(0);
        });

        it('should only unsubscribe the specific listener', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();

            const unsubscribe1 = eventBus.on('building:updated', listener1);
            eventBus.on('building:updated', listener2);

            expect(eventBus.listenerCount('building:updated')).toBe(2);

            unsubscribe1();
            expect(eventBus.listenerCount('building:updated')).toBe(1);

            // Only listener2 should be called
            eventBus.emit('building:updated', { building: { buildingID: 'test' } });
            expect(listener1).not.toHaveBeenCalled();
            expect(listener2).toHaveBeenCalled();
        });

        it('should unsubscribe once listeners after first call', () => {
            const listener = jest.fn();

            eventBus.once('building:save', listener);
            expect(eventBus.listenerCount('building:save')).toBe(1);

            eventBus.emit('building:save', { building: { buildingID: 'test' } });
            expect(listener).toHaveBeenCalledTimes(1);
            expect(eventBus.listenerCount('building:save')).toBe(0);

            // Second emit should not call listener
            eventBus.emit('building:save', { building: { buildingID: 'test-2' } });
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('should remove all listeners for an event type', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();

            eventBus.on('building:updated', listener1);
            eventBus.on('building:updated', listener2);
            eventBus.on('toast:show', listener1);

            expect(eventBus.listenerCount('building:updated')).toBe(2);
            expect(eventBus.listenerCount('toast:show')).toBe(1);

            eventBus.off('building:updated');

            expect(eventBus.listenerCount('building:updated')).toBe(0);
            expect(eventBus.listenerCount('toast:show')).toBe(1); // Should not affect other events
        });

        it('should clear all listeners', () => {
            const listener = jest.fn();

            eventBus.on('building:updated', listener);
            eventBus.on('toast:show', listener);
            eventBus.on('building:validate', listener);

            expect(eventBus.listenerCount('building:updated')).toBe(1);
            expect(eventBus.listenerCount('toast:show')).toBe(1);
            expect(eventBus.listenerCount('building:validate')).toBe(1);

            eventBus.clear();

            expect(eventBus.listenerCount('building:updated')).toBe(0);
            expect(eventBus.listenerCount('toast:show')).toBe(0);
            expect(eventBus.listenerCount('building:validate')).toBe(0);
        });
    });

    describe('Listener Count', () => {
        it('should return 0 for events with no listeners', () => {
            expect(eventBus.listenerCount('building:updated')).toBe(0);
        });

        it('should return correct count for events with listeners', () => {
            const listener1 = jest.fn();
            const listener2 = jest.fn();
            const listener3 = jest.fn();

            eventBus.on('building:updated', listener1);
            eventBus.on('building:updated', listener2);
            eventBus.on('building:updated', listener3);

            expect(eventBus.listenerCount('building:updated')).toBe(3);
        });
    });

    describe('Type Safety', () => {
        it('should enforce correct event data types', () => {
            const buildingListener = jest.fn();
            const toastListener = jest.fn();

            eventBus.on('building:updated', buildingListener);
            eventBus.on('toast:show', toastListener);

            // These should compile without errors due to proper typing
            eventBus.emit('building:updated', { building: { buildingID: 'test' } });
            eventBus.emit('toast:show', { message: 'Test', toastType: 'success' });
            eventBus.emit('building:validate', { isValid: true, errors: {} });
            eventBus.emit('tab:change', { activeTab: 'building-info' });
            eventBus.emit('units:filter', { filter: 'Occupied', query: 'test' });
            eventBus.emit('units:bulk-update', { operationType: 'status', unitIDs: ['unit-1'] });
            eventBus.emit('building:save', { building: { buildingID: 'test' } });
            eventBus.emit('building:reset', { building: { buildingID: 'test' } });
        });
    });
});

describe('Global Event Bus Instance', () => {
    beforeEach(() => {
        buildingEventBus.clear();
    });

    it('should provide a global event bus instance', () => {
        expect(buildingEventBus).toBeInstanceOf(BuildingEventBus);
    });

    it('should maintain state across imports', () => {
        const listener = jest.fn();

        buildingEventBus.on('building:updated', listener);

        expect(buildingEventBus.listenerCount('building:updated')).toBe(1);

        // Simulate emitting from another module
        buildingEventBus.emit('building:updated', { building: { buildingID: 'test' } });

        expect(listener).toHaveBeenCalled();
    });
});

describe('Alpine.js Integration', () => {
    let mockDispatch: jest.Mock;

    beforeEach(() => {
        mockDispatch = jest.fn();
        buildingEventBus.clear();
    });

    it('should connect event bus to Alpine.js dispatch', () => {
        const connectedEventBus = connectAlpineEventBus(mockDispatch);

        expect(connectedEventBus).toBe(buildingEventBus);
    });

    it('should forward toast events to Alpine.js', () => {
        connectAlpineEventBus(mockDispatch);

        const toastData = { message: 'Test message', toastType: 'success' as const };
        buildingEventBus.emit('toast:show', toastData);

        expect(mockDispatch).toHaveBeenCalledWith('show-toast', toastData);
    });

    it('should not affect other event types', () => {
        connectAlpineEventBus(mockDispatch);

        buildingEventBus.emit('building:updated', { building: { buildingID: 'test' } });
        buildingEventBus.emit('building:validate', { isValid: true, errors: {} });

        expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should handle multiple Alpine.js connections', () => {
        const mockDispatch2 = jest.fn();

        connectAlpineEventBus(mockDispatch);
        connectAlpineEventBus(mockDispatch2);

        const toastData = { message: 'Test message', toastType: 'error' as const };
        buildingEventBus.emit('toast:show', toastData);

        expect(mockDispatch).toHaveBeenCalledWith('show-toast', toastData);
        expect(mockDispatch2).toHaveBeenCalledWith('show-toast', toastData);
    });
});

describe('Event Bus Performance', () => {
    let eventBus: BuildingEventBus;

    beforeEach(() => {
        eventBus = new BuildingEventBus();
    });

    it('should handle large number of listeners efficiently', () => {
        const listeners: jest.Mock[] = [];

        // Add 1000 listeners
        for(let i = 0; i < 1000; i++) {
            const listener = jest.fn();
            listeners.push(listener);
            eventBus.on('building:updated', listener);
        }

        expect(eventBus.listenerCount('building:updated')).toBe(1000);

        const startTime = Date.now();
        eventBus.emit('building:updated', { building: { buildingID: 'test' } });
        const endTime = Date.now();

        // Should complete in reasonable time (< 100ms)
        expect(endTime - startTime).toBeLessThan(100);

        // All listeners should have been called
        _.forEach(listeners, (listener) => {
            expect(listener).toHaveBeenCalled();
        });
    });

    it('should handle frequent emissions efficiently', () => {
        const listener = jest.fn();
        eventBus.on('building:updated', listener);

        const startTime = Date.now();

        // Emit 1000 events
        for(let i = 0; i < 1000; i++) {
            eventBus.emit('building:updated', { building: { buildingID: `test-${i}` } });
        }

        const endTime = Date.now();

        // Should complete in reasonable time
        expect(endTime - startTime).toBeLessThan(100);
        expect(listener).toHaveBeenCalledTimes(1000);
    });

    it('should clean up memory when listeners are removed', () => {
        const listeners: (() => void)[] = [];

        // Add and remove listeners multiple times
        for(let i = 0; i < 100; i++) {
            const unsubscribe = eventBus.on('building:updated', jest.fn());
            listeners.push(unsubscribe);
        }

        expect(eventBus.listenerCount('building:updated')).toBe(100);

        // Remove all listeners
        _.forEach(listeners, unsubscribe => unsubscribe());

        expect(eventBus.listenerCount('building:updated')).toBe(0);

        // Memory should be cleaned up (no memory leaks)
        eventBus.emit('building:updated', { building: { buildingID: 'test' } });
        // Should not throw or cause issues
    });
});
