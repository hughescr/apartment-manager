/**
 * Type-safe event bus for building component communication
 * This provides a way for components to communicate without tight coupling
 */

import type { BuildingEvents } from './types';

// Generic event listener type that matches our event data structure
type EventListener<T = unknown> = (data: T) => void;

export class BuildingEventBus {
    private eventListeners: Record<string, EventListener[]> = {};

    /**
     * Subscribe to an event
     */
    on<T extends keyof BuildingEvents>(
        eventType: T,
        listener: EventListener<BuildingEvents[T]>
    ): () => void {
        const key = eventType as string;

        if(!this.eventListeners[key]) {
            this.eventListeners[key] = [];
        }

        const wrappedListener: EventListener = (data: unknown) => {
            listener(data as BuildingEvents[T]);
        };
        this.eventListeners[key].push(wrappedListener);

        // Return unsubscribe function
        return () => {
            const listeners = this.eventListeners[key];
            if(listeners) {
                const index = listeners.indexOf(wrappedListener);
                if(index > -1) {
                    listeners.splice(index, 1);
                }
            }
        };
    }

    /**
     * Subscribe to an event once (auto-unsubscribe after first call)
     */
    once<T extends keyof BuildingEvents>(
        eventType: T,
        listener: EventListener<BuildingEvents[T]>
    ): void {
        const unsubscribe = this.on(eventType, (data: BuildingEvents[T]) => {
            listener(data);
            unsubscribe();
        });
    }

    /**
     * Emit an event to all listeners
     */
    emit<T extends keyof BuildingEvents>(
        eventType: T,
        data: BuildingEvents[T]
    ): void {
        const key = eventType as string;
        const listeners = this.eventListeners[key];

        if(listeners) {
            for(const listener of listeners) {
                try {
                    listener(data);
                } catch(error) {
                    // eslint-disable-next-line no-console -- Intentional console.warn for debugging event listener errors
                    console.warn(`Event listener error for ${key}:`, error);
                }
            }
        }
    }

    /**
     * Remove all listeners for an event type
     */
    off<T extends keyof BuildingEvents>(eventType: T): void {
        const key = eventType as string;
        delete this.eventListeners[key];
    }

    /**
     * Remove all listeners
     */
    clear(): void {
        this.eventListeners = {};
    }

    /**
     * Get count of listeners for an event type
     */
    listenerCount<T extends keyof BuildingEvents>(eventType: T): number {
        const key = eventType as string;
        return this.eventListeners[key]?.length || 0;
    }
}

// Global event bus instance for building components
export const buildingEventBus = new BuildingEventBus();

/**
 * Helper function to integrate with Alpine.js
 * Call this in Alpine.js init() to connect the event bus with Alpine dispatching
 */
export function connectAlpineEventBus($dispatch: (event: string, data: unknown) => void) {
    // Connect building event bus to Alpine.js custom events
    buildingEventBus.on('toast:show', (data) => {
        $dispatch('show-toast', data);
    });

    return buildingEventBus;
}
