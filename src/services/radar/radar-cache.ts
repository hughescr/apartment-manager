import { logger as baseLogger } from '@hughescr/logger';
import { map, trim, toLower } from 'lodash';
import type { RadarAutocompleteResult, GeolocationResult, AutocompleteCacheEntry, IPCacheEntry } from './types';

const logger = baseLogger;

/**
 * Enhanced in-memory cache for Radar results with TTL and LRU eviction
 * Features:
 * - Time-to-live (TTL) expiration
 * - Maximum size limits with LRU eviction
 * - Passive cleanup of expired entries on access
 * - Access tracking for LRU ordering
 */
export class RadarCache {
    private autocompleteCache = new Map<string, AutocompleteCacheEntry>();
    private ipCache = new Map<string, IPCacheEntry>();
    private readonly autocompleteTtlMs = 5 * 60 * 1000; // 5 minutes
    private readonly ipTtlMs = 60 * 60 * 1000; // 1 hour
    private readonly maxAutocompleteSize = 500; // Maximum autocomplete entries
    private readonly maxIPSize = 1000; // Maximum IP cache entries
    // Constructor removed - no periodic cleanup needed

    /**
     * Enforce autocomplete cache size limit using LRU eviction
     */
    private enforceAutocompleteSize(): void {
        if(this.autocompleteCache.size <= this.maxAutocompleteSize) {
            return;
        }

        // Sort entries by last accessed time (oldest first)
        const sortedEntries = Array.from(this.autocompleteCache.entries())
            .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

        // Remove oldest entries until we're under the limit
        const toRemove = this.autocompleteCache.size - this.maxAutocompleteSize;
        let removed = 0;

        for(const [key] of sortedEntries) {
            if(removed >= toRemove) {
                break;
            }
            this.autocompleteCache.delete(key);
            removed++;
        }

        if(removed > 0) {
            logger.debug(`LRU evicted ${removed} autocomplete entries (size: ${this.autocompleteCache.size})`);
        }
    }

    /**
     * Enforce IP cache size limit using LRU eviction
     */
    private enforceIPSize(): void {
        if(this.ipCache.size <= this.maxIPSize) {
            return;
        }

        // Sort entries by last accessed time (oldest first)
        const sortedEntries = Array.from(this.ipCache.entries())
            .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

        // Remove oldest entries until we're under the limit
        const toRemove = this.ipCache.size - this.maxIPSize;
        let removed = 0;

        for(const [key] of sortedEntries) {
            if(removed >= toRemove) {
                break;
            }
            this.ipCache.delete(key);
            removed++;
        }

        if(removed > 0) {
            logger.debug(`LRU evicted ${removed} IP entries (size: ${this.ipCache.size})`);
        }
    }

    private createAutocompleteKey(query: string, coordinates?: { lat: number, lon: number }): string {
        const baseKey = trim(toLower(query));
        if(coordinates) {
            return `${baseKey}:${coordinates.lat.toFixed(4)},${coordinates.lon.toFixed(4)}`;
        }
        return baseKey;
    }

    getAutocomplete(query: string, coordinates?: { lat: number, lon: number }): RadarAutocompleteResult[] | null {
        const key = this.createAutocompleteKey(query, coordinates);
        const entry = this.autocompleteCache.get(key);

        if(!entry) {
            return null;
        }

        // Check if entry has expired
        if(Date.now() - entry.timestamp > this.autocompleteTtlMs) {
            this.autocompleteCache.delete(key);
            return null;
        }

        // Update last accessed time for LRU
        entry.lastAccessed = Date.now();
        this.autocompleteCache.set(key, entry);

        logger.debug(`Autocomplete cache hit for query: ${key}`);
        return map(entry.results, r => ({ ...r, source: 'cache' as const }));
    }

    setAutocomplete(query: string, results: RadarAutocompleteResult[], coordinates?: { lat: number, lon: number }): void {
        const key = this.createAutocompleteKey(query, coordinates);
        const now = Date.now();
        this.autocompleteCache.set(key, {
            results:      map(results, r => ({ ...r, source: 'radar' as const })),
            timestamp:    now,
            lastAccessed: now
        });

        // Check if we need to enforce size limits after adding new entry
        if(this.autocompleteCache.size > this.maxAutocompleteSize) {
            this.enforceAutocompleteSize();
        }

        logger.debug(`Cached ${results.length} autocomplete results for query: ${key}`);
    }

    getIP(clientIP: string): GeolocationResult | null {
        const entry = this.ipCache.get(clientIP);

        if(!entry) {
            return null;
        }

        // Check if entry has expired
        if(Date.now() - entry.timestamp > this.ipTtlMs) {
            this.ipCache.delete(clientIP);
            return null;
        }

        // Update last accessed time for LRU
        entry.lastAccessed = Date.now();
        this.ipCache.set(clientIP, entry);

        logger.debug(`IP cache hit for: ${clientIP}`);
        return entry.result;
    }

    setIP(clientIP: string, result: GeolocationResult): void {
        const now = Date.now();
        this.ipCache.set(clientIP, {
            result,
            timestamp:    now,
            lastAccessed: now
        });

        // Check if we need to enforce size limits after adding new entry
        if(this.ipCache.size > this.maxIPSize) {
            this.enforceIPSize();
        }

        logger.debug(`Cached IP geocoding result for: ${clientIP}`);
    }

    clear(): void {
        this.autocompleteCache.clear();
        this.ipCache.clear();
        logger.info('Radar cache cleared');
    }

    getStats(): {
        autocompleteSize:       number
        ipSize:                 number
        maxAutocompleteSize:    number
        maxIPSize:              number
        autocompleteTtlMinutes: number
        ipTtlMinutes:           number
    } {
        return {
            autocompleteSize:       this.autocompleteCache.size,
            ipSize:                 this.ipCache.size,
            maxAutocompleteSize:    this.maxAutocompleteSize,
            maxIPSize:              this.maxIPSize,
            autocompleteTtlMinutes: 5,
            ipTtlMinutes:           60
        };
    }
}
