import { z } from 'zod';
import { replace } from 'lodash';

/**
 * Shared validation schema builders for common data structures.
 *
 * These builders create base schemas that can be configured for draft or published validation:
 * - Draft schemas: All fields optional, permissive for work-in-progress
 * - Published schemas: Required fields enforced for MITS compliance
 *
 * Usage:
 *   const draftSchema = createPetPolicySchema({ mode: 'draft' });
 *   const publishedSchema = createPetPolicySchema({ mode: 'published' });
 */

export type SchemaMode = 'draft' | 'published';

export interface SchemaOptions {
    mode: SchemaMode
}

/**
 * Pet Type Policy Schema Builder
 * Used within Pet Policy to define restrictions per pet type
 */
export function createPetTypePolicySchema(options: SchemaOptions) {
    const baseSchema = z.object({
        type:              z.string().min(1, 'Pet type is required'),
        weightLimit:       z.number().min(0).optional(),
        countLimit:        z.number().int().min(0).optional(),
        fee:               z.number().min(0).optional(),
        deposit:           z.number().min(0).optional(),
        breedRestrictions: z.array(z.string()).optional(),
    });

    if(options.mode === 'draft') {
        return baseSchema.partial().optional();
    }

    return baseSchema;
}

/**
 * Pet Policy Schema Builder
 * MITS Policy.Pet element
 */
export function createPetPolicySchema(options: SchemaOptions) {
    const petTypeSchema = createPetTypePolicySchema(options);

    const baseSchema = z.object({
        allowed:           z.boolean(),
        types:             z.array(z.string()).optional(),
        maxCount:          z.number().int().min(0).optional(),
        weightLimit:       z.number().min(0).optional(),
        breedRestrictions: z.array(z.string()).optional(),
        deposit:           z.number().min(0).optional(),
        monthlyFee:        z.number().min(0).optional(),
        oneTimeFee:        z.number().min(0).optional(),
        notes:             z.string().optional(),
        petTypes:          z.array(petTypeSchema).optional(),
    });

    if(options.mode === 'draft') {
        return baseSchema.partial().optional();
    }

    return baseSchema.optional();
}

/**
 * Fee Schema Builder
 * Used for one-time and monthly fees
 */
export function createFeeSchema(options: SchemaOptions) {
    const baseSchema = z.object({
        type:        z.string().min(1, 'Fee type is required'),
        amount:      z.number().min(0, 'Fee amount cannot be negative'),
        description: z.string().optional(),
        refundable:  z.boolean().optional(),
    });

    if(options.mode === 'draft') {
        return baseSchema.partial();
    }

    return baseSchema;
}

/**
 * Parking Option Schema Builder
 * MITS parking information
 */
export function createParkingOptionSchema(options: SchemaOptions) {
    const baseSchema = z.object({
        type:        z.string().min(1, 'Parking type is required'),
        included:    z.boolean(),
        fee:         z.number().min(0).optional(),
        spaces:      z.number().int().min(0).optional(),
        description: z.string().optional(),
    });

    if(options.mode === 'draft') {
        return baseSchema.partial();
    }

    return baseSchema;
}

/**
 * Storage Option Schema Builder
 * MITS storage information
 */
export function createStorageOptionSchema(options: SchemaOptions) {
    const baseSchema = z.object({
        type:        z.string().min(1, 'Storage type is required'),
        included:    z.boolean(),
        fee:         z.number().min(0).optional(),
        dimensions:  z.string().optional(),
        description: z.string().optional(),
    });

    if(options.mode === 'draft') {
        return baseSchema.partial();
    }

    return baseSchema;
}

/**
 * Amenity Schema Builder
 * MITS Amenity elements for buildings and units
 */
export function createAmenitySchema(options: SchemaOptions) {
    const baseSchema = z.object({
        name:        z.string().min(1, 'Amenity name is required'),
        category:    z.string().min(1, 'Amenity category is required'),
        description: z.string().optional(),
    });

    if(options.mode === 'draft') {
        return baseSchema.partial();
    }

    return baseSchema;
}

/**
 * Rent Special Schema Builder
 * Used for promotional offers
 */
export function createRentSpecialSchema(options: SchemaOptions) {
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

    // Published version includes date validation
    return baseSchema.refine(
        data => !(data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)),
        {
            message: 'Start date must be before end date',
            path:    ['endDate'],
        }
    );
}

/**
 * Screening Criteria Schema Builder
 * Application requirements and criteria
 */
export function createScreeningCriteriaSchema(_options: SchemaOptions) {
    const baseSchema = z.object({
        minCreditScore:          z.number().int().min(300).max(850).optional(),
        incomeRatio:             z.number().min(0).max(10).optional(),
        maxOccupantsPerBedroom:  z.number().int().min(0).max(5).optional(),
        backgroundCheckRequired: z.boolean().optional(),
        evictionHistory:         z.boolean().optional(),
        criminalHistory:         z.boolean().optional(),
        references:              z.number().optional(),
        employmentVerification:  z.boolean().optional(),
        rentalHistory:           z.boolean().optional(),
        notes:                   z.string().optional(),
    });

    // Both draft and published use partial for screening criteria
    return baseSchema.partial().optional();
}

/**
 * Income Restrictions Schema Builder
 * For affordable housing compliance
 */
export function createIncomeRestrictionsSchema(_options: SchemaOptions) {
    const baseSchema = z.object({
        amiLimit: z.union([
            z.number().min(0).max(200),
            z.null().transform(() => undefined)
        ]).optional(),
        maxIncomeByHouseholdSize: z.record(z.string(), z.number()).optional(),
    });

    return baseSchema.partial().optional();
}

/**
 * Contact Info Schema Builder (for buildings)
 * MITS Information contact requirements
 */
export function createContactInfoSchema(options: SchemaOptions) {
    if(options.mode === 'draft') {
        // Draft: all fields optional
        return z.object({
            name:  z.string().optional(),
            email: z.string().optional().refine(
                email => !email || /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email),
                { message: 'Invalid email address format' }
            ),
            phone:             z.string().optional(),
            propertyWebsite:   z.string().optional(),
            managementWebsite: z.string().optional(),
            officeHours:       z.record(z.string(), z.object({
                open:  z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
                close: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
            })).optional(),
        }).partial().optional();
    }

    // Published: email and phone required, must be valid
    return z.object({
        name:  z.string().optional(),
        email: z.email({ error: 'Valid email address is required for MITS compliance' })
            .min(1, 'Email cannot be empty for MITS publication'),
        phone: z.string()
            .regex(/^[\d\s\-().+]+$/, 'Valid phone number format is required for MITS compliance')
            .min(10, 'Phone number must contain at least 10 digits for MITS compliance')
            .refine(
                (phone) => {
                    const digitsOnly = replace(phone, /\D/g, '');
                    return digitsOnly.length >= 10;
                },
                { message: 'Phone number must contain at least 10 digits for MITS compliance' }
            ),
        propertyWebsite:   z.url({ error: 'Property website must be a valid URL' }).optional(),
        managementWebsite: z.url({ error: 'Management website must be a valid URL' }).optional(),
        officeHours:       z.record(z.string(), z.object({
            open:  z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
            close: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
        })).optional(),
    }, {
        message: 'Both email and phone are required in contactInfo for MITS'
    })
    .refine(
        contact => contact.email && contact.phone,
        {
            message: 'Both email and phone are required in contactInfo for MITS Information.Email and Information.PhoneNumber elements',
            path:    ['contactInfo']
        }
    );
}

/**
 * Tour Availability Schema Builder
 * MITS tour information
 */
export function createTourAvailabilitySchema(options: SchemaOptions) {
    const baseSchema = z.object({
        selfGuidedTours:   z.boolean().optional(),
        virtualTours:      z.boolean().optional(),
        inPersonTours:     z.boolean().optional(),
        tourSchedulingUrl: options.mode === 'draft'
            ? z.string().optional()
            : z.url({ error: 'Tour scheduling URL must be a valid URL' }).optional(),
        tourHours: z.record(z.string(), z.object({
            open:  z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
            close: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
        })).optional(),
    });

    if(options.mode === 'draft') {
        return baseSchema.partial().optional();
    }

    return baseSchema.optional();
}
