import type { TransformerRegistry as ITransformerRegistry, TransformerFunction } from '../types.js';

/**
 * Registry for transformation functions used in field mapping.
 * Allows registration and retrieval of custom transformers.
 */
export class TransformerRegistry implements ITransformerRegistry {
    private readonly transformers = new Map<string, TransformerFunction>();

    /**
     * Register a new transformer function.
     * @param name The name of the transformer
     * @param transformer The transformer function
     */
    register(name: string, transformer: TransformerFunction): void {
        this.transformers.set(name, transformer);
    }

    /**
     * Get a transformer by name.
     * @param name The name of the transformer
     * @returns The transformer function if found, undefined otherwise
     */
    get(name: string): TransformerFunction | undefined {
        return this.transformers.get(name);
    }

    /**
     * Check if a transformer is registered.
     * @param name The name of the transformer
     * @returns true if the transformer is registered
     */
    has(name: string): boolean {
        return this.transformers.has(name);
    }

    /**
     * Get all registered transformer names.
     * @returns Array of transformer names
     */
    list(): string[] {
        return Array.from(this.transformers.keys());
    }

    /**
     * Clear all registered transformers.
     * Useful for testing.
     */
    clear(): void {
        this.transformers.clear();
    }
}

/**
 * Create a new transformer registry with default transformers.
 * @returns A new transformer registry with standard transformers
 */
export function createTransformerRegistry(): TransformerRegistry {
    const registry = new TransformerRegistry();

    // Register default transformers here
    // These will be implemented in separate files
    // Note: Actual transformer registration will be done by each mapper
    // to avoid circular dependencies

    return registry;
}
