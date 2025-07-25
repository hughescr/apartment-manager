// Enumerations
export enum PropertyType {
    APARTMENT = 'apartment',
    CONDO = 'condo',
    TOWNHOME = 'townhome',
    SINGLE_FAMILY = 'single-family',
    HOUSE = 'house'
}

export enum UtilityType {
    WATER = 'water',
    SEWER = 'sewer',
    TRASH = 'trash',
    GAS = 'gas',
    ELECTRICITY = 'electricity',
    CABLE = 'cable',
    INTERNET = 'internet',
    HEAT = 'heat',
    AIR_CONDITIONING = 'air-conditioning'
}

export enum FeeType {
    APPLICATION = 'application',
    ADMIN = 'admin',
    SECURITY_DEPOSIT = 'security-deposit',
    PET_DEPOSIT = 'pet-deposit',
    PET_FEE = 'pet-fee',
    PARKING = 'parking',
    STORAGE = 'storage',
    MOVE_IN = 'move-in',
    KEY_DEPOSIT = 'key-deposit',
    CLEANING = 'cleaning'
}

export enum PetType {
    DOG = 'dog',
    CAT = 'cat',
    BIRD = 'bird',
    FISH = 'fish',
    SMALL_ANIMAL = 'small-animal',
    NO_PETS = 'no-pets'
}

export enum ParkingType {
    GARAGE = 'garage',
    COVERED = 'covered',
    UNCOVERED = 'uncovered',
    STREET = 'street',
    NONE = 'none'
}

export enum StorageType {
    CLOSET = 'closet',
    BASEMENT = 'basement',
    GARAGE = 'garage',
    EXTERNAL_UNIT = 'external-unit',
    NONE = 'none'
}

export enum AmenityCategory {
    UNIT = 'unit',
    PROPERTY = 'property',
    COMMUNITY = 'community'
}

export enum WebsiteStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    PENDING = 'pending',
    ERROR = 'error'
}

export enum DayOfWeek {
    MONDAY = 'monday',
    TUESDAY = 'tuesday',
    WEDNESDAY = 'wednesday',
    THURSDAY = 'thursday',
    FRIDAY = 'friday',
    SATURDAY = 'saturday',
    SUNDAY = 'sunday'
}

// Complex nested structures
export interface RentSpecial {
    title: string
    startDate?: string // ISO date string
    endDate?: string // ISO date string
    description: string
}

export interface IncomeRestriction {
    amiLimit?: number // Area Median Income percentage (e.g., 80 for 80% AMI)
    maxIncomeByHouseholdSize: Record<number, number>
}

export interface Fee {
    type: FeeType
    amount: number
    description?: string
    refundable?: boolean
}

export interface PetPolicy {
    allowed: boolean
    types?: PetType[]
    maxCount?: number
    weightLimit?: number // in pounds
    breedRestrictions?: string[]
    deposit?: number
    monthlyFee?: number
    oneTimeFee?: number
    notes?: string
}

export interface ParkingOption {
    type: ParkingType
    included: boolean
    fee?: number
    spaces?: number
    description?: string
}

export interface StorageOption {
    type: StorageType
    included: boolean
    fee?: number
    dimensions?: string // e.g., "5x10"
    description?: string
}

export interface ScreeningCriteria {
    incomeRatio?: number // e.g., 3 for 3x rent
    minCreditScore?: number
    maxOccupantsPerBedroom?: number
    backgroundCheckRequired?: boolean
    evictionHistory?: boolean
    criminalHistory?: boolean
    references?: number
    employmentVerification?: boolean
    rentalHistory?: boolean
    notes?: string
}

export interface ContactInfo {
    name?: string
    phone?: string
    email?: string
    website?: string
    officeHours?: Partial<Record<DayOfWeek, {
        open: string // HH:MM format
        close: string // HH:MM format
    }>>
}

export interface TourAvailability {
    selfGuidedTours?: boolean
    virtualTours?: boolean
    inPersonTours?: boolean
    tourSchedulingUrl?: string
    tourHours?: Partial<Record<DayOfWeek, {
        open: string // HH:MM format
        close: string // HH:MM format
    }>>
}

export interface Amenity {
    name: string
    category: AmenityCategory
    description?: string
}

// Main data interfaces
export interface BuildingData {
    // Existing fields
    buildingID: string
    street?: string
    city?: string
    state?: string
    zip?: string
    description?: string
    yearBuilt?: number
    numberStories?: number
    totalUnits?: number

    // New fields for listing sites
    propertyType?: PropertyType
    roomsForRent?: boolean
    photos?: string[] // S3 URLs
    leaseLength?: number // default lease length in months
    shortTermLeaseAllowed?: boolean
    propertyLicenseNumber?: string
    specialtyType?: string // e.g., "senior", "student", "affordable"
    specialtySubType?: string // e.g., "55+", "62+", "graduate"
    propertyDescription?: string // detailed marketing description
    rentSpecials?: RentSpecial[]
    incomeRestrictions?: IncomeRestriction
    utilitiesIncluded?: Partial<Record<UtilityType, boolean>>
    oneTimeFees?: Fee[]
    monthlyFees?: Fee[]
    parkingOptions?: ParkingOption[]
    petPolicies?: PetPolicy
    storageOptions?: StorageOption[]
    propertyAmenities?: Amenity[]
    screeningCriteria?: ScreeningCriteria
    contactInfo?: ContactInfo
    tourAvailability?: TourAvailability
    applicationFee?: number
    acceptsOnlineApplications?: boolean
}

export interface UnitTypeData {
    buildingID: string
    modelID: string
    modelName: string
    countAvailable?: number
    dateAvailable?: string // ISO date string
    beds: number
    baths: number
    maxOccupants?: number
    minRent?: number
    maxRent?: number
    perPersonRent?: number
    minSqft?: number
    maxSqft?: number
    deposit?: number
    minLeaseTerm?: number // months
    maxLeaseTerm?: number // months
    modelAmenities?: Amenity[] // default amenities for units of this type
}

export interface UnitData {
    // Existing fields
    buildingID: string
    unitID: string
    description?: string
    beds?: number
    baths?: number
    sqft?: number
    rent?: number
    occupied?: boolean
    availableDate?: string

    // New fields for listing sites
    modelID?: string // foreign key to UnitTypeData
    unitNumber?: string // display identifier (e.g., "2A", "101")
    maxOccupants?: number
    perPersonRent?: number
    deposit?: number
    minLeaseTerm?: number // months
    maxLeaseTerm?: number // months
    unitDescription?: string // unit-specific marketing description
    unitRentSpecial?: RentSpecial
    unitAmenities?: Amenity[] // overrides model amenities if specified
    photos?: string[] // S3 URLs
    websiteStatus?: Partial<Record<string, WebsiteStatus>> // siteName -> status
    listingIds?: Partial<Record<string, string>> // siteName -> external ID/URL
}

// Extended interfaces for runtime use
export interface Unit extends UnitData {
    originalUnit: UnitData
    apiURL: string
}

export type Building = BuildingData;

export type UnitType = UnitTypeData;

// DynamoDB single-table design helpers
export interface DynamoDBItem {
    partitionKey: string
    sortKey: string
    entityType: 'building' | 'unit' | 'unitType'
    gsi1pk?: string // for querying by modelID
    gsi1sk?: string
}

export interface BuildingDynamoDBItem extends BuildingData, DynamoDBItem {
    entityType: 'building'
    partitionKey: string // buildingID
    sortKey: string // 'BUILDING'
}

export interface UnitDynamoDBItem extends UnitData, DynamoDBItem {
    entityType: 'unit'
    partitionKey: string // buildingID
    sortKey: string // 'UNIT#' + unitID
}

export interface UnitTypeDynamoDBItem extends UnitTypeData, DynamoDBItem {
    entityType: 'unitType'
    partitionKey: string // buildingID
    sortKey: string // 'MODEL#' + modelID
    gsi1pk: string // 'MODEL#' + modelID (for querying units by model)
    gsi1sk: string // buildingID
}

// Helper type for partial updates
export type PartialBuildingData = Partial<Omit<BuildingData, 'buildingID'>>;
export type PartialUnitData = Partial<Omit<UnitData, 'buildingID' | 'unitID'>>;
export type PartialUnitTypeData = Partial<Omit<UnitTypeData, 'buildingID' | 'modelID'>>;

// Default values helper
export const getDefaultBuildingData = (): Partial<BuildingData> => ({
    propertyType: PropertyType.APARTMENT,
    roomsForRent: false,
    shortTermLeaseAllowed: false,
    leaseLength: 12,
    acceptsOnlineApplications: true,
    photos: [],
    rentSpecials: [],
    oneTimeFees: [],
    monthlyFees: [],
    parkingOptions: [],
    storageOptions: [],
    propertyAmenities: [],
    utilitiesIncluded: {
        [UtilityType.WATER]: false,
        [UtilityType.SEWER]: false,
        [UtilityType.TRASH]: false,
        [UtilityType.GAS]: false,
        [UtilityType.ELECTRICITY]: false,
        [UtilityType.CABLE]: false,
        [UtilityType.INTERNET]: false,
        [UtilityType.HEAT]: false,
        [UtilityType.AIR_CONDITIONING]: false
    },
    petPolicies: {
        allowed: false
    },
    screeningCriteria: {
        incomeRatio: 3,
        minCreditScore: 600,
        maxOccupantsPerBedroom: 2,
        backgroundCheckRequired: true,
        evictionHistory: true,
        criminalHistory: true,
        references: 2,
        employmentVerification: true,
        rentalHistory: true
    }
});

export const getDefaultUnitData = (): Partial<UnitData> => ({
    occupied: false,
    minLeaseTerm: 12,
    maxLeaseTerm: 12,
    photos: [],
    websiteStatus: {},
    listingIds: {}
});

export const getDefaultUnitTypeData = (): Partial<UnitTypeData> => ({
    countAvailable: 0,
    minLeaseTerm: 12,
    maxLeaseTerm: 12,
    modelAmenities: []
});
