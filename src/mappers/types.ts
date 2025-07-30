import type {
    BuildingData,
    UnitData,
    UnitTypeData,
    PropertyType,
    UtilityType,
    FeeType,
    PetType,
    ParkingType,
    StorageType,
    AmenityCategory,
    Amenity,
    Fee,
    ScreeningCriteria,
    ContactInfo,
    TourAvailability,
    RentSpecial,
    IncomeRestriction
} from '../types/index.js';

export interface ValidationResult {
    isValid: boolean
    errors?: ValidationError[]
}

export interface ValidationError {
    field: string
    message: string
    value?: unknown
}

export interface TransformationRule {
    type: 'enum' | 'format' | 'calculate' | 'merge' | 'custom'
    params?: Record<string, unknown>
}

export interface FieldMappingEntry {
    selector?: string
    transform?: TransformationRule
    defaultValue?: unknown
    required?: boolean
    validation?: {
        minValue?: number
        maxValue?: number
        pattern?: string
        allowedValues?: unknown[]
    }
}

export type FieldMappingConfig = Record<string, Record<string, string | FieldMappingEntry>>;

export type TransformerFunction<TInput = unknown, TOutput = unknown> = (value: TInput, params?: Record<string, unknown>) => TOutput;

export interface TransformerRegistry {
    get(name: string): TransformerFunction | undefined
    register(name: string, transformer: TransformerFunction): void
}

export interface MappedAddress {
    street: string
    city: string
    state: string
    zip: string
}

export interface MappedFee {
    type: string
    amount: number
    description?: string
    refundable?: boolean
}

export interface MappedPetPolicy {
    allowed: boolean
    types?: string[]
    maxCount?: number
    weightLimit?: number
    deposit?: number
    monthlyFee?: number
    restrictions?: string
}

export interface MappedParking {
    type: string
    included: boolean
    fee?: number
    description?: string
}

export interface MappedAmenity {
    name: string
    category: string
}

export interface MappedBuilding {
    externalId?: string
    name: string
    address: MappedAddress
    propertyType: string
    yearBuilt?: number
    totalUnits?: number
    description?: string
    photos?: string[]
    leaseTerms?: {
        minMonths?: number
        maxMonths?: number
        defaultMonths?: number
    }
    fees?: MappedFee[]
    utilities?: Record<string, boolean>
    parking?: MappedParking[]
    petPolicy?: MappedPetPolicy
    amenities?: MappedAmenity[]
    contactInfo?: ContactInfo
    tourOptions?: TourAvailability
    applicationFee?: number
    rentSpecials?: RentSpecial[]
    incomeRestrictions?: IncomeRestriction
    screeningCriteria?: ScreeningCriteria
}

export interface MappedUnitType {
    externalId?: string
    modelName: string
    beds: number
    baths: number
    sqft?: {
        min?: number
        max?: number
    }
    rent?: {
        min?: number
        max?: number
    }
    deposit?: number
    maxOccupants?: number
    countAvailable?: number
    dateAvailable?: string
    amenities?: MappedAmenity[]
    photos?: string[]
}

export interface MappedUnit {
    externalId?: string
    unitNumber: string
    modelName?: string
    beds: number
    baths: number
    sqft?: number
    rent: number
    deposit?: number
    dateAvailable?: string
    description?: string
    maxOccupants?: number
    leaseTerms?: {
        minMonths?: number
        maxMonths?: number
    }
    amenities?: MappedAmenity[]
    photos?: string[]
    rentSpecial?: RentSpecial
}

export interface UnitMappingContext {
    unit: UnitData
    unitType?: UnitTypeData
    building: BuildingData
    fieldMappings: FieldMappingConfig
    transformers: TransformerRegistry
}

export interface MappingContext {
    unitTypes?: UnitTypeData[]
    fieldMappings: FieldMappingConfig
    transformers: TransformerRegistry
}

export interface SiteMapper {
    readonly siteId: string
    readonly siteName: string
    mapBuilding(building: BuildingData, context?: MappingContext): MappedBuilding
    mapUnitType(unitType: UnitTypeData, building: BuildingData, context?: MappingContext): MappedUnitType
    mapUnit(unitContext: UnitMappingContext): MappedUnit
    validateBuilding(building: BuildingData): ValidationResult
    validateUnitType(unitType: UnitTypeData): ValidationResult
    validateUnit(unit: UnitData): ValidationResult
}

export interface MapperRegistry {
    register(mapper: SiteMapper): void
    get(siteId: string): SiteMapper | undefined
    list(): string[]
}

export interface InheritanceResolver {
    resolveUnitValues(
        unit: UnitData,
        unitType?: UnitTypeData,
        building?: BuildingData
    ): UnitData

    mergeAmenities(
        unitAmenities?: Amenity[],
        modelAmenities?: Amenity[],
        buildingAmenities?: Amenity[]
    ): Amenity[]

    resolveFees(
        unitFees?: Fee[],
        buildingOneTimeFees?: Fee[],
        buildingMonthlyFees?: Fee[]
    ): Fee[]
}

export interface SiteSpecificValue<T> {
    apartments_com?: T
    zillow?: T
    [siteId: string]: T | undefined
}

export interface EnumMapping<T extends string> {
    internal: T
    external: SiteSpecificValue<string>
}

export interface SiteConfiguration {
    siteId: string
    siteName: string
    requiresThreeTierHierarchy: boolean
    supportsUnitTypes: boolean
    fieldMappings?: Partial<FieldMappingConfig>
    enumMappings?: {
        propertyType?: EnumMapping<PropertyType>[]
        utilityType?: EnumMapping<UtilityType>[]
        feeType?: EnumMapping<FeeType>[]
        petType?: EnumMapping<PetType>[]
        parkingType?: EnumMapping<ParkingType>[]
        storageType?: EnumMapping<StorageType>[]
        amenityCategory?: EnumMapping<AmenityCategory>[]
    }
}
