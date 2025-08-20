/**
 * Client-side logger for browser environments
 *
 * This module provides safe logging functionality for the frontend that:
 * - Only logs in development environments
 * - Sanitizes sensitive data
 * - Provides consistent log levels
 * - Can be easily disabled in production builds
 */

/* eslint-disable no-console -- Safe logging wrapper that replaces console usage */

/**
 * Log levels with numeric priorities
 */
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Get the current log level based on environment
 */
function getCurrentLogLevel(): LogLevel {
    // Check for explicit log level in environment or URL parameters
    if(typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlLogLevel = (urlParams.get('logLevel') || '').toUpperCase() as LogLevel;
        if(urlLogLevel && urlLogLevel in LOG_LEVELS) {
            return urlLogLevel;
        }
    }

    // Default levels by environment
    const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';
    const isTest = import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test';

    if(isTest) {
        return 'ERROR';
    }
    if(isDev) {
        return 'DEBUG';
    }
    return 'WARN'; // Production: only warnings and errors
}

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
    const currentLevel = getCurrentLogLevel();
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/**
 * Sanitize data for safe client-side logging
 */
function sanitizeForClientLogging(data: unknown): unknown {
    if(!data || typeof data !== 'object') {
        return data;
    }

    if(Array.isArray(data)) {
        return data.map(item => sanitizeForClientLogging(item));
    }

    const obj = data as Record<string, unknown>;
    const sensitiveFields = [
        'password', 'token', 'secret', 'key', 'apiKey', 'accessToken',
        'refreshToken', 'authorization', 'auth', 'credential', 'ssn',
        'socialSecurityNumber', 'creditCard', 'bankAccount', 'email'
    ];

    const sanitized: Record<string, unknown> = {};

    for(const [key, value] of Object.entries(obj)) {
        const keyLower = key.toLowerCase();

        if(sensitiveFields.some(sensitive => keyLower.includes(sensitive))) {
            sanitized[key] = '[REDACTED]';
        } else if(typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeForClientLogging(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Client-side logger interface
 */
export const clientLogger = {
    debug: (message: string, data?: unknown) => {
        if(!shouldLog('DEBUG')) {
            return;
        }
        console.debug(`[DEBUG] ${message}`, data ? sanitizeForClientLogging(data) : '');
    },

    info: (message: string, data?: unknown) => {
        if(!shouldLog('INFO')) {
            return;
        }
        console.info(`[INFO] ${message}`, data ? sanitizeForClientLogging(data) : '');
    },

    warn: (message: string, data?: unknown) => {
        if(!shouldLog('WARN')) {
            return;
        }
        console.warn(`[WARN] ${message}`, data ? sanitizeForClientLogging(data) : '');
    },

    error: (message: string, error?: unknown) => {
        if(!shouldLog('ERROR')) {
            return;
        }

        if(error instanceof Error) {
            console.error(`[ERROR] ${message}`, {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
        } else {
            console.error(`[ERROR] ${message}`, error ? sanitizeForClientLogging(error) : '');
        }
    }
};

/**
 * Create a logger with a specific context/component name
 */
export function createClientLogger(context: string) {
    return {
        debug: (message: string, data?: unknown) =>
            clientLogger.debug(`[${context}] ${message}`, data),
        info: (message: string, data?: unknown) =>
            clientLogger.info(`[${context}] ${message}`, data),
        warn: (message: string, data?: unknown) =>
            clientLogger.warn(`[${context}] ${message}`, data),
        error: (message: string, error?: unknown) =>
            clientLogger.error(`[${context}] ${message}`, error)
    };
}

/**
 * Development-only logger (completely disabled in production)
 */
export const devLogger = {
    log: (message: string, data?: unknown) => {
        if(!import.meta.env.DEV) {
            return;
        }
        clientLogger.debug(message, data);
    }
};

export default clientLogger;
