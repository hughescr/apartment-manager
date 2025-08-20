/// <reference types="astro/client" />

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
    }
}

export {};
