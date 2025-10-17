/**
 * Type definitions for @hughescr/logger
 *
 * Provides TypeScript type safety for the hughescr/logger package
 */

declare module '@hughescr/logger' {
    /**
     * Logger interface providing standard log levels
     */
    export interface Logger {
        /**
         * Log a debug message
         * @param message - The message to log
         * @param data - Optional context data
         */
        debug(message: string, data?: unknown): void

        /**
         * Log an info message
         * @param message - The message to log
         * @param data - Optional context data
         */
        info(message: string, data?: unknown): void

        /**
         * Log a warning message
         * @param message - The message to log
         * @param data - Optional context data
         */
        warn(message: string, data?: unknown): void

        /**
         * Log an error message
         * @param message - The message to log
         * @param data - Optional error or context data
         */
        error(message: string, data?: unknown): void
    }

    /**
     * Default logger instance
     */
    export const logger: Logger;
}
