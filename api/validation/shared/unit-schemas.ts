import { z } from 'zod';
import type { SchemaOptions } from './common-schemas';

/**
 * Unit-specific schema builders
 * These differ slightly from building-level schemas
 */

/**
 * Deposit Schema Builder (for Units)
 * Supports both simple number and complex object formats
 */
export function createDepositSchema(options: SchemaOptions) {
    const complexDepositSchema = z.object({
        amount:                  z.number().min(0, 'Deposit amount is required and cannot be negative'),
        refundable:              z.boolean().optional(),
        partialRefundPercentage: z.number().min(0).max(100, 'Partial refund percentage must be between 0 and 100').optional(),
        notes:                   z.string().optional()
    });

    if(options.mode === 'draft') {
        return z.union([
            z.number().min(0, 'Deposit amount cannot be negative'),
            complexDepositSchema.partial()
        ]).optional();
    }

    // Published version with stricter validation
    return z.union([
        z.number()
            .min(0, 'Deposit amount cannot be negative for MITS Deposit element')
            .max(50000, 'Deposit amount seems unusually high - please verify'),
        z.object({
            amount: z.number()
                .min(0, 'Deposit amount cannot be negative for MITS Deposit element')
                .max(50000, 'Deposit amount seems unusually high - please verify'),
            refundable:              z.boolean().optional(),
            partialRefundPercentage: z.number()
                .min(0, 'Partial refund percentage cannot be negative')
                .max(100, 'Partial refund percentage cannot exceed 100%')
                .optional(),
            notes: z.string()
                .max(500, 'Deposit notes must be 500 characters or less')
                .optional()
        })
    ]).optional();
}

/**
 * Unit Amenity Schema Builder
 * Different structure from building amenities (uses 'type' instead of 'name')
 */
export function createUnitAmenitySchema(options: SchemaOptions) {
    if(options.mode === 'draft') {
        return z.object({
            type:        z.string().min(1, 'Amenity type is required').optional(),
            description: z.string().optional(),
            category:    z.string().optional()
        }).optional();
    }

    return z.object({
        type: z.string()
            .min(1, 'Amenity type is required for MITS UnitAmenity.AmenityType')
            .max(100, 'Amenity type must be 100 characters or less'),
        description: z.string()
            .max(500, 'Amenity description must be 500 characters or less for MITS UnitAmenity.AmenityDescription')
            .optional(),
        category: z.string()
            .max(50, 'Amenity category must be 50 characters or less')
            .optional()
    });
}

/**
 * Unit Rent Special Schema Builder
 * Similar to building rent specials but used at unit level
 */
export function createUnitRentSpecialSchema(options: SchemaOptions) {
    const baseSchema = z.object({
        id:          z.union([z.string(), z.number()]).optional(),
        title:       z.string().min(1, 'Rent special title is required'),
        startDate:   z.string().optional(),
        endDate:     z.string().optional(),
        description: z.string().optional(),
    });

    if(options.mode === 'draft') {
        return baseSchema.optional();
    }

    // Published version doesn't need date validation for unit-level specials
    return baseSchema.optional();
}

/**
 * Date validation helper for MITS date fields
 */
export function createDateStringSchema(fieldName: string, options: SchemaOptions) {
    if(options.mode === 'draft') {
        return z.string().optional().refine(
            (date) => {
                if(!date) {
                    return true; // Empty strings are valid for optional dates
                }
                const parsed = new Date(date);
                return !isNaN(parsed.getTime());
            },
            { message: 'Invalid date format' }
        );
    }

    return z.string()
        .refine(
            (date) => {
                if(!date) {
                    return true; // Optional dates are valid
                }
                const parsed = new Date(date);
                return !isNaN(parsed.getTime());
            },
            { message: `${fieldName} must be a valid date format (ISO 8601 recommended for MITS compliance)` }
        )
        .optional();
}
