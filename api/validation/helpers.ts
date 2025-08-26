/**
 * Validation Helper Functions
 *
 * DEPRECATED: This file has been refactored into domain-specific modules.
 * All exports are now re-exported from the modular structure for backward compatibility.
 *
 * New structure:
 * - ./types.ts - Common types and interfaces
 * - ./security-validator.ts - Security validations and sanitization
 * - ./building-validator.ts - Building-specific validation
 * - ./unit-validator.ts - Unit and unit type validation
 * - ./mits-validator.ts - MITS compliance and site requirements
 * - ./index.ts - Unified exports
 */

// Re-export everything from the modular structure for backward compatibility
export * from './index';
