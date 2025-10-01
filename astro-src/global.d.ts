/// <reference types="astro/client" />
/// <reference types="@types/alpinejs" />

declare global {
    interface Window {
        /**
         * Shows a toast notification with the given message and type
         * @param message - The message to display in the toast
         * @param type - The type of toast ("success" | "error" | "warning" | "info")
         */
        showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void

        /**
         * Callback function that is called when a unit type form submission succeeds.
         * This is typically set by parent components to handle post-save actions.
         */
        unitTypeFormOnSuccess?: () => void

        /**
         * Toast controller for managing toast notifications
         */
        toastController?: {
            dismissToast: () => void
        }

        /**
         * Alpine.js framework instance
         */
        Alpine: import('alpinejs').Alpine

        /**
         * Alpine.js component data functions - made globally accessible for x-data directives
         * Using official @types/alpinejs types via our centralized type definitions
         * These return component-specific implementations that extend AlpineComponent
         */
        buildingsComponentData:    () => import('./lib/types/alpine-types').AlpineComponent<unknown>
        buildingManagerData:       () => import('./lib/types/alpine-types').AlpineComponent<unknown>
        buildingStateData:         () => import('./lib/types/alpine-types').AlpineComponent<unknown>
        modelAmenitiesManagerData: () => import('./lib/types/alpine-types').AlpineComponent<unknown>
        buildingsListData:         () => import('./lib/types/alpine-types').AlpineComponent<unknown>
        unitCardData:              () => import('./lib/types/alpine-types').AlpineComponent<unknown>
        addBuildingFormData:       () => import('./lib/types/alpine-types').AlpineComponent<unknown>
    }

    /**
     * Alpine.js global variable (accessible in script tags)
     */
    const Alpine: import('alpinejs').Alpine;
}

export {};
