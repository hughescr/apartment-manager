import { z } from 'zod';
import { PropertyType } from '../../../src/types';

/**
 * Draft validation schema for buildings - permissive schema for work-in-progress saves
 * Only buildingId and buildingName are required. All other fields are optional to support
 * incremental data entry and auto-save functionality.
 */

// Helper for website URLs with custom message (made optional)
const websiteUrl = (field: string) => z.string().url({ message: `${field} must start with http:// or https://` }).optional();

const ContactInfoDraftSchema = z.object({
    email: z.string().email('Invalid email address format').optional(),
    phone: z.string().regex(/^[\d\s\-().+]+$/, 'Invalid phone number format').optional(),
    propertyWebsite: websiteUrl('Website'),
    managementWebsite: websiteUrl('Management website'),
}).partial().optional();

const TourAvailabilityDraftSchema = z.object({
    tourSchedulingUrl: websiteUrl('Tour scheduling URL'),
}).partial().optional();

const RentSpecialDraftSchema = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    title: z.string().min(1, 'Rent special title is required').optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
}).optional();

const IncomeRestrictionsDraftSchema = z.object({
    amiLimit: z.number().min(0).max(200).optional(),
    maxIncomeByHouseholdSize: z.record(z.number()).optional(),
}).partial().optional();

const ScreeningCriteriaDraftSchema = z.object({
    minCreditScore: z.number().int().min(300).max(850).optional(),
    incomeRatio: z.number().min(0).max(10).optional(),
    maxOccupantsPerBedroom: z.number().int().min(0).max(5).optional(),
}).partial().optional();

export const BuildingDraftSchema = z.object({
    // Required fields for draft - only ID and name
    buildingID: z.string().min(1).max(255).regex(/^[\w-]+$/, 'buildingID can only contain letters, numbers, underscores, and hyphens'),
    buildingName: z.string().min(1, 'buildingName is required'),
    // All other fields are optional for draft state
    street: z.string().min(1, 'Street address cannot be empty').optional(),
    city: z.string().min(1, 'City cannot be empty').optional(),
    state: z.string().min(1, 'State cannot be empty').optional(),
    zip: z.string().regex(/^\d{5}(?:-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789').optional(),
    applicationFee: z.number().min(0).optional(),
    numberStories: z.number().int().min(1).max(100).optional(),
    leaseLength: z.number().int().min(1).max(36).optional(),
    contactInfo: ContactInfoDraftSchema,
    tourAvailability: TourAvailabilityDraftSchema,
    rentSpecials: z.array(RentSpecialDraftSchema).optional(),
    incomeRestrictions: IncomeRestrictionsDraftSchema,
    screeningCriteria: ScreeningCriteriaDraftSchema,
    latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional(),
    longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional(),
    coordinatesVerified: z.boolean().optional(),
    propertyType: z.nativeEnum(PropertyType).optional(),
    photos: z.array(z.string().url('Photo URLs must be valid URLs')).optional(),
    acceptsOnlineApplications: z.boolean().optional(),

    // Additional MITS compliance fields (all optional for draft)
    yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 5, 'Year built cannot be in the future').optional(),
    totalUnits: z.number().int().min(1, 'Total units must be at least 1').optional(),
    description: z.string().optional(),
    propertyDescription: z.string().optional(),
    propertyLicenseNumber: z.string().optional(),

    // MITS Structure types (optional for draft)
    structureType: z.enum(['Apartment', 'Condo', 'Townhouse', 'Single Family', 'House']).optional(),
    rentalType: z.enum(['Market Rate', 'Affordable', 'Student', 'Senior']).optional(),

    // Additional property features for MITS (optional for draft)
    roomsForRent: z.boolean().optional(),
    shortTermLeaseAllowed: z.boolean().optional(),
    specialtyType: z.string().optional(),
    specialtySubType: z.string().optional(),

    // Complex data structures (all optional for draft)
    petPolicies: z.any().optional(),
    parkingOptions: z.array(z.any()).optional(),
    storageOptions: z.array(z.any()).optional(),
    propertyAmenities: z.array(z.any()).optional(),
    oneTimeFees: z.array(z.any()).optional(),
    monthlyFees: z.array(z.any()).optional(),
    utilitiesIncluded: z.record(z.string(), z.boolean()).optional(),

    // Timestamps
    updatedAt: z.string().optional(),
}).passthrough();

export type BuildingDraftInput = z.infer<typeof BuildingDraftSchema>;
