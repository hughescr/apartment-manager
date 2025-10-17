import type { MapperRegistry as IMapperRegistry, SiteMapper } from './types.js';

/**
 * Central registry for all site mappers.
 * Implements the registry pattern to allow dynamic registration
 * and retrieval of site-specific mappers.
 */
export class MapperRegistry implements IMapperRegistry {
    private readonly mappers = new Map<string, SiteMapper>();

    /**
     * Register a new site mapper.
     * @param mapper The site mapper to register
     * @throws Error if a mapper with the same siteId already exists
     */
    register(mapper: SiteMapper): void {
        if(this.mappers.has(mapper.siteId)) {
            throw new Error(`Mapper for site '${mapper.siteId}' is already registered`);
        }
        this.mappers.set(mapper.siteId, mapper);
    }

    /**
     * Get a mapper by site ID.
     * @param siteId The site ID to look up
     * @returns The mapper if found, undefined otherwise
     */
    get(siteId: string): SiteMapper | undefined {
        return this.mappers.get(siteId);
    }

    /**
     * List all registered site IDs.
     * @returns Array of registered site IDs
     */
    list(): string[] {
        return Array.from(this.mappers.keys());
    }

    /**
     * Check if a mapper is registered for a site.
     * @param siteId The site ID to check
     * @returns true if a mapper is registered, false otherwise
     */
    has(siteId: string): boolean {
        return this.mappers.has(siteId);
    }

    /**
     * Get the total number of registered mappers.
     * @returns The count of registered mappers
     */
    get size(): number {
        return this.mappers.size;
    }

    /**
     * Clear all registered mappers.
     * Useful for testing.
     */
    clear(): void {
        this.mappers.clear();
    }
}

// Global singleton instance
let globalRegistry: MapperRegistry | null = null;

/**
 * Get the global mapper registry instance.
 * Creates a new instance if it doesn't exist.
 * @returns The global mapper registry
 */
export function getMapperRegistry(): MapperRegistry {
    globalRegistry ??= new MapperRegistry();
    return globalRegistry;
}

/**
 * Reset the global mapper registry.
 * Useful for testing.
 */
export function resetMapperRegistry(): void {
    globalRegistry = null;
}
