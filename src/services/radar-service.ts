/**
 * Backward-compatible exports for the Radar service
 *
 * This file now acts as a re-export module that maintains backward compatibility
 * while the actual implementation has been modularized into separate focused files.
 */

// Re-export everything from the modular structure
export * from './radar/index';

// This ensures that any existing imports like:
// import { RadarService, radarService, getAddressSuggestions, getUserLocation } from './radar-service'
// continue to work exactly as before without any code changes required.
