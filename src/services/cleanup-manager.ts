import { logger as baseLogger } from '@hughescr/logger';
import { chain } from 'lodash';
import { cleanupRadarService, isRadarServiceDestroyed } from './radar-service';
import { cleanupAddressAutocompleteService, isAddressAutocompleteServiceDestroyed } from './address-autocomplete';

const logger = baseLogger;

/**
 * Centralized cleanup manager for all singleton instances
 * Handles graceful shutdown and memory leak prevention
 */
export class CleanupManager {
    private static instance: CleanupManager | null = null;
    private isShuttingDown = false;
    private cleanupHandlers: (() => void)[] = [];

    private constructor() {
        this.setupProcessEventHandlers();
        this.registerBuiltinCleanupHandlers();
    }

    /**
     * Get the singleton cleanup manager instance
     */
    static getInstance(): CleanupManager {
        if(!CleanupManager.instance) {
            CleanupManager.instance = new CleanupManager();
        }
        return CleanupManager.instance;
    }

    /**
     * Register built-in cleanup handlers for service singletons
     */
    private registerBuiltinCleanupHandlers(): void {
        this.registerCleanupHandler(() => {
            logger.info('Cleaning up radar service');
            cleanupRadarService();
        });

        this.registerCleanupHandler(() => {
            logger.info('Cleaning up address autocomplete service');
            cleanupAddressAutocompleteService();
        });
    }

    /**
     * Set up process event handlers for graceful shutdown
     */
    private setupProcessEventHandlers(): void {
        // Handle normal exit
        process.on('exit', () => {
            if(!this.isShuttingDown) {
                logger.info('Process exit detected, performing cleanup');
                this.performCleanup();
            }
        });

        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            logger.info('SIGINT received, initiating graceful shutdown');
            this.initiateShutdown();
        });

        // Handle SIGTERM (termination signal)
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, initiating graceful shutdown');
            this.initiateShutdown();
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception, performing emergency cleanup', { error });
            this.performCleanup();
            // Re-throw after cleanup
            throw error;
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled promise rejection, performing emergency cleanup', {
                reason,
                promise: promise.toString()
            });
            this.performCleanup();
        });

        // Handle AWS Lambda context done (if running in Lambda)
        if(process.env.AWS_LAMBDA_FUNCTION_NAME) {
            process.on('beforeExit', () => {
                logger.info('Lambda function ending, performing cleanup');
                this.performCleanup();
            });
        }
    }

    /**
     * Register a custom cleanup handler
     */
    registerCleanupHandler(handler: () => void): void {
        this.cleanupHandlers.push(handler);
        logger.debug(`Registered cleanup handler, total handlers: ${this.cleanupHandlers.length}`);
    }

    /**
     * Perform cleanup of all registered handlers
     */
    private performCleanup(): void {
        if(this.isShuttingDown) {
            return; // Prevent multiple cleanup runs
        }

        this.isShuttingDown = true;
        logger.info(`Starting cleanup process with ${this.cleanupHandlers.length} handlers`);

        try {
            // Execute all cleanup handlers
            for(const handler of this.cleanupHandlers) {
                try {
                    handler();
                } catch(error) {
                    logger.error('Error in cleanup handler', { error });
                }
            }

            // Verify all services are properly destroyed
            this.verifyCleanup();

            logger.info('Cleanup process completed successfully');
        } catch(error) {
            logger.error('Error during cleanup process', { error });
        }
    }

    /**
     * Verify that all singleton instances have been properly destroyed
     */
    private verifyCleanup(): void {
        const verificationResults = {
            radarService: isRadarServiceDestroyed(),
            addressAutocompleteService: isAddressAutocompleteServiceDestroyed()
        };

        const allDestroyed = chain(verificationResults).values().every().value();

        if(allDestroyed) {
            logger.info('All singleton instances verified as properly destroyed');
        } else {
            logger.warn('Some singleton instances may not have been properly destroyed', verificationResults);
        }
    }

    /**
     * Initiate graceful shutdown
     */
    private initiateShutdown(): void {
        this.performCleanup();

        // Give some time for cleanup to complete, then force exit
        setTimeout(() => {
            logger.warn('Forcing process exit after cleanup timeout');
            logger.warn('Cleanup timeout reached, throwing error to exit');
            throw new Error('Process cleanup timeout - forcing exit');
        }, 5000);
    }

    /**
     * Manual cleanup trigger (for testing or explicit cleanup)
     */
    cleanup(): void {
        this.performCleanup();
    }

    /**
     * Get cleanup statistics
     */
    getStats(): {
        isShuttingDown: boolean
        registeredHandlers: number
        servicesDestroyed: {
            radarService: boolean
            addressAutocompleteService: boolean
        }
    } {
        return {
            isShuttingDown: this.isShuttingDown,
            registeredHandlers: this.cleanupHandlers.length,
            servicesDestroyed: {
                radarService: isRadarServiceDestroyed(),
                addressAutocompleteService: isAddressAutocompleteServiceDestroyed()
            }
        };
    }
}

// Initialize the cleanup manager singleton
const cleanupManager = CleanupManager.getInstance();

/**
 * Register a cleanup handler to be called during process shutdown
 */
export function registerCleanupHandler(handler: () => void): void {
    cleanupManager.registerCleanupHandler(handler);
}

/**
 * Manually trigger cleanup (useful for testing)
 */
export function triggerCleanup(): void {
    cleanupManager.cleanup();
}

/**
 * Get cleanup manager statistics
 */
export function getCleanupManagerStats(): ReturnType<CleanupManager['getStats']> {
    return cleanupManager.getStats();
}

/**
 * Export the singleton instance for direct access if needed
 */
export { cleanupManager };
