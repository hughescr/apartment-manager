/**
 * Common types and interfaces used across validation modules
 */

/**
 * Validation result interface for consistent error handling
 */
export interface ValidationResult {
    success: boolean
    data?: unknown
    errors: ValidationError[]
}

/**
 * Detailed validation error with context
 */
export interface ValidationError {
    field: string
    message: string
    code?: string
    context?: string
}

/**
 * MITS missing field information
 */
export interface MissingMITSField {
    field: string
    displayName: string
    description: string
    entityType: 'building' | 'unitType' | 'unit'
    required: boolean
    mitsElement?: string
}

/**
 * Site publishing requirements
 */
export interface SiteRequirements {
    site: string
    canPublish: boolean
    missingFields: MissingMITSField[]
    errors: ValidationError[]
}
