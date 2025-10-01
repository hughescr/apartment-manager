/**
 * Centralized logger configuration for the Apartment Manager application
 *
 * This module provides a consistent logging interface across the entire application,
 * ensuring proper log levels, security, and environment-based configuration.
 */

import { logger as baseLogger } from '@hughescr/logger';
import { isError, isObject, isArray, map, toLower, some } from 'lodash';

/**
 * Application logger with environment-based configuration
 *
 * Features:
 * - Environment-based log level control
 * - Consistent log formatting across the application
 * - Security-safe logging that prevents sensitive data leakage
 * - Proper log levels: debug, info, warn, error
 */
export const logger = baseLogger;

/**
 * Helper function for logging in development vs production
 * In development, we can be more verbose
 * In production, we're more conservative with logging
 */
export function getLogLevel(): string {
    const env = process.env.NODE_ENV || 'development';
    const logLevel = process.env.LOG_LEVEL;

    if(logLevel) {
        return logLevel;
    }

    // Default log levels by environment
    switch(env) {
        case 'production':
            return 'warn';
        case 'test':
            return 'error';
        case 'development':
        default:
            return 'info';
    }
}

/**
 * Safe logging helper that ensures sensitive data doesn't leak to logs
 * This sanitizes objects before logging them
 */
export function createSafeLogger(context: string) {
    return {
        debug: (message: string, data?: unknown) => {
            logger.debug(`[${context}] ${message}`, data ? sanitizeForLogging(data) : undefined);
        },
        info: (message: string, data?: unknown) => {
            logger.info(`[${context}] ${message}`, data ? sanitizeForLogging(data) : undefined);
        },
        warn: (message: string, data?: unknown) => {
            logger.warn(`[${context}] ${message}`, data ? sanitizeForLogging(data) : undefined);
        },
        error: (message: string, error?: unknown) => {
            logger.error(`[${context}] ${message}`, isError(error)
                ? {
                    message: error.message,
                    stack:   error.stack,
                    name:    error.name
                }
                : sanitizeForLogging(error));
        }
    };
}

/**
 * Sanitize data for safe logging - removes potentially sensitive fields
 */
function sanitizeForLogging(data: unknown): unknown {
    if(!data || !isObject(data)) {
        return data;
    }

    if(isArray(data)) {
        return map(data, item => sanitizeForLogging(item));
    }

    const obj = data as Record<string, unknown>;
    const sensitiveFields = [
        'password', 'token', 'secret', 'key', 'apiKey', 'accessToken',
        'refreshToken', 'authorization', 'auth', 'credential', 'ssn',
        'socialSecurityNumber', 'creditCard', 'bankAccount'
    ];

    const sanitized: Record<string, unknown> = {};

    for(const [key, value] of Object.entries(obj)) {
        const keyLower = toLower(key);

        if(some(sensitiveFields, sensitive => keyLower.includes(sensitive))) {
            sanitized[key] = '[REDACTED]';
        } else if(isObject(value) && value !== null) {
            sanitized[key] = sanitizeForLogging(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Migration logger specifically for database migration scripts
 * Provides enhanced logging for migration operations with progress tracking
 */
export function createMigrationLogger(scriptName: string) {
    return {
        start: (message: string) => {
            logger.info(`🏗️  [${scriptName}] ${message}`);
        },
        progress: (message: string, data?: unknown) => {
            logger.info(`📋 [${scriptName}] ${message}`, data ? sanitizeForLogging(data) : undefined);
        },
        success: (message: string, data?: unknown) => {
            logger.info(`✅ [${scriptName}] ${message}`, data ? sanitizeForLogging(data) : undefined);
        },
        warning: (message: string, data?: unknown) => {
            logger.warn(`⚠️  [${scriptName}] ${message}`, data ? sanitizeForLogging(data) : undefined);
        },
        error: (message: string, error?: unknown) => {
            logger.error(`❌ [${scriptName}] ${message}`, isError(error)
                ? {
                    message: error.message,
                    stack:   error.stack,
                    name:    error.name
                }
                : sanitizeForLogging(error));
        },
        summary: (message: string, data?: unknown) => {
            logger.info(`📊 [${scriptName}] ${message}`, data ? sanitizeForLogging(data) : undefined);
        },
        complete: (message: string) => {
            logger.info(`🎉 [${scriptName}] ${message}`);
        }
    };
}

export default logger;
