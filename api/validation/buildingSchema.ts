import { z } from 'zod';
import { PropertyType } from '../../src/types';

// Helper for website URLs with custom message
const websiteUrl = (field: string) => z.string().url({ message: `${field} must start with http:// or https://` });

const ContactInfoSchema = z.object({
    email: z.string().email('Invalid email address format').optional(),
    phone: z.string().regex(/^[\d\s\-().+]+$/, 'Invalid phone number format').optional(),
    propertyWebsite: websiteUrl('Website').optional(),
    managementWebsite: websiteUrl('Management website').optional(),
}).partial();

const TourAvailabilitySchema = z.object({
    tourSchedulingUrl: websiteUrl('Tour scheduling URL').optional(),
}).partial();

const RentSpecialSchema = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    title: z.string().min(1, 'Rent special title is required'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
}).refine(data => !(data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)), {
    message: 'Start date must be before end date',
    path: ['endDate'],
});

const IncomeRestrictionsSchema = z.object({
    amiLimit: z.number().min(0).max(200).optional(),
    maxIncomeByHouseholdSize: z.record(z.number()).optional(),
}).partial();

const ScreeningCriteriaSchema = z.object({
    minCreditScore: z.number().int().min(300).max(850).optional(),
    incomeRatio: z.number().min(0).max(10).optional(),
    maxOccupantsPerBedroom: z.number().int().min(0).max(5).optional(),
}).partial();

export const BuildingSchema = z.object({
    buildingID: z.string().min(1).max(255).regex(/^[\w-]+$/),
    buildingName: z.string().min(1, 'buildingName is required').optional(),
    street: z.string().min(1, 'Street address cannot be empty').optional(),
    city: z.string().min(1, 'City cannot be empty').optional(),
    state: z.string().min(1, 'State cannot be empty').optional(),
    zip: z.string().regex(/^\d{5}(?:-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789').optional(),
    applicationFee: z.number().min(0).optional(),
    numberStories: z.number().int().min(1).max(100).optional(),
    leaseLength: z.number().int().min(1).max(36).optional(),
    contactInfo: ContactInfoSchema.optional(),
    tourAvailability: TourAvailabilitySchema.optional(),
    rentSpecials: z.array(RentSpecialSchema).optional(),
    incomeRestrictions: IncomeRestrictionsSchema.optional(),
    screeningCriteria: ScreeningCriteriaSchema.optional(),
    latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90').optional(),
    longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180').optional(),
    coordinatesVerified: z.boolean().optional(),
    propertyType: z.nativeEnum(PropertyType).optional(),
    photos: z.array(z.string().url('Photo URLs must be valid URLs')).optional(),
    acceptsOnlineApplications: z.boolean().optional(),

    // Additional MITS compliance fields
    yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 5, 'Year built cannot be in the future').optional(),
    totalUnits: z.number().int().min(1, 'Total units must be at least 1').optional(),
    description: z.string().optional(),
    propertyDescription: z.string().optional(),
    propertyLicenseNumber: z.string().optional(),

    // MITS Structure types
    structureType: z.enum(['Apartment', 'Condo', 'Townhouse', 'Single Family', 'House']).optional(),
    rentalType: z.enum(['Market Rate', 'Affordable', 'Student', 'Senior']).optional(),

    // Additional property features for MITS
    roomsForRent: z.boolean().optional(),
    shortTermLeaseAllowed: z.boolean().optional(),
    specialtyType: z.string().optional(),
    specialtySubType: z.string().optional(),

    // Complex data structures
    petPolicies: z.any().optional(), // Complex pet policy structure
    parkingOptions: z.array(z.any()).optional(),
    storageOptions: z.array(z.any()).optional(),
    propertyAmenities: z.array(z.any()).optional(),
    oneTimeFees: z.array(z.any()).optional(),
    monthlyFees: z.array(z.any()).optional(),
    utilitiesIncluded: z.record(z.string(), z.boolean()).optional(),

    // Timestamps
    updatedAt: z.string().optional(),
}).passthrough();

export type BuildingInput = z.infer<typeof BuildingSchema>;

// MITS Publication Schema - extends base schema with stricter requirements
export const BuildingMITSSchema = BuildingSchema.extend({
    // Required fields for MITS compliance
    buildingName: z.string().min(1, 'Building name is required for MITS compliance'),
    street: z.string().min(1, 'Street address is required for MITS compliance'),
    city: z.string().min(1, 'City is required for MITS compliance'),
    state: z.string().min(1, 'State is required for MITS compliance'),
    zip: z.string().regex(/^\d{5}(?:-\d{4})?$/, 'Valid ZIP code is required for MITS compliance'),

    // Coordinates required for MITS
    latitude: z.number().min(-90).max(90, 'Valid latitude is required for MITS compliance'),
    longitude: z.number().min(-180).max(180, 'Valid longitude is required for MITS compliance'),

    // Property classification required
    propertyType: z.nativeEnum(PropertyType, { required_error: 'Property type is required for MITS compliance' }),
    structureType: z.enum(['Apartment', 'Condo', 'Townhouse', 'Single Family', 'House'], { required_error: 'Structure type is required for MITS compliance' }),
    rentalType: z.enum(['Market Rate', 'Affordable', 'Student', 'Senior'], { required_error: 'Rental type is required for MITS compliance' }),

    // Contact info required for listings
    contactInfo: ContactInfoSchema.extend({
        email: z.string().email('Valid email is required for MITS compliance'),
        phone: z.string().regex(/^[\d\s\-().+]+$/, 'Valid phone number is required for MITS compliance')
    })
});

export type BuildingMITSInput = z.infer<typeof BuildingMITSSchema>;
