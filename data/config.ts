/**
 * Configuration module for data layer
 * Provides centralized configuration that can be overridden for testing
 */
import { Resource } from 'sst';

// Configuration type
export interface DataConfig {
    tableName: string
}

// Default configuration - lazily evaluated
let _config: DataConfig | null = null;

/**
 * Get the data layer configuration
 * @param overrides - Optional configuration overrides (for testing)
 */
export function getConfig(overrides?: Partial<DataConfig>): DataConfig {
    if(overrides) {
        return {
            tableName: overrides.tableName ?? Resource.BuildingsUnits.name
        };
    }

    _config ??= {
        tableName: Resource.BuildingsUnits.name
    };

    return _config;
}
