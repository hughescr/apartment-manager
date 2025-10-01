// MITS 4.1 TypeScript Schema Definitions
// Based on MITS (Multifamily Information and Transactions Standard) 4.1

import type { BuildingData, UnitTypeData, UnitData } from '../types';

export interface MITSPhysicalProperty {
    Property_ID:  PropertyIdentification
    Information?: PropertyInformation
    Management?:  ManagementInfo
    Policy?:      PropertyPolicy
    Phase?:       Phase[]
    Building?:    BuildingInfo[]
    Floorplan?:   Floorplan[]
    ILSUnit?:     ILSUnitInfo
    Amenity?:     PropertyAmenity[]
    File?:        MediaFile[]
    LastUpdate:   string // ISO 8601 datetime
}

export interface PropertyIdentification {
    Identification: {
        PropertyID:     string
        MarketingName?: string
        WebSite?:       string
    }
    Address?:            PropertyAddress
    ILS_Identification?: ILSIdentification
    Location?: {
        Latitude?:  number
        Longitude?: number
    }
}

export interface PropertyAddress {
    Address:    string
    Address2?:  string
    City:       string
    State:      string
    PostalCode: string
    Country?:   string
}

export interface ILSIdentification {
    RentalType:  'Market Rate' | 'Affordable' | 'Student' | 'Senior'
    YearBuilt?:  number
    TotalUnits?: number
    Latitude?:   number
    Longitude?:  number
}

export interface PropertyInformation {
    StructureType?:         'Apartment' | 'Condo' | 'Townhouse' | 'Single Family' | 'House'
    YearBuilt?:             number
    NumberOfStories?:       number
    UnitCount?:             number
    ShortDescription?:      string
    LongDescription?:       string
    PhoneNumber?:           string
    Email?:                 string
    WebSite?:               string
    OfficeHours?:           OfficeHour[]
    PropertyLicenseNumber?: string
}

export interface OfficeHour {
    Day:       string
    OpenTime:  string
    CloseTime: string
}

export interface ManagementInfo {
    CompanyID?:   string
    CompanyName?: string
    Name?:        string
    Email?:       string
    Phone?:       string
    Address?:     PropertyAddress
    WebSite?:     string
    CompanyLogo?: string
}

export interface PropertyPolicy {
    Pet?:             PetPolicy
    ApplicationFee?:  number
    AdminFee?:        number
    BrokerFee?:       number
    SecurityDeposit?: DepositInfo
}

export interface PetPolicy {
    Allowed:      boolean
    Deposit?:     number
    Fee?:         number
    Rent?:        number
    MaxCount?:    number
    WeightLimit?: number
    Comment?:     string
    PetType?:     PetTypeInfo[]
}

export interface PetTypeInfo {
    Type:     string
    Allowed:  boolean
    Deposit?: number
    Fee?:     number
    Rent?:    number
}

export interface DepositInfo {
    Amount?: {
        Value?: number
        Min?:   number
        Max?:   number
    }
    Refundable?:        boolean
    PortionRefundable?: number
}

export interface Phase {
    PhaseID:           string
    PhaseName?:        string
    PhaseDescription?: string
    Building?:         BuildingInfo[]
}

export interface BuildingInfo {
    BuildingID:      string
    BuildingName?:   string
    Address?:        PropertyAddress
    BuildingFloors?: number
    BuildingUnits?:  number
}

export interface Floorplan {
    Identification: {
        FloorplanID:     string
        Name:            string
        UnitCount?:      number
        UnitsAvailable?: number
    }
    Room?:       RoomInfo[]
    SquareFeet?: {
        Min?: number
        Max?: number
        Avg?: number
    }
    MarketRent?: {
        Min?: number
        Max?: number
    }
    EffectiveRent?: {
        Min?: number
        Max?: number
    }
    Deposit?:          DepositInfo
    FloorplanAmenity?: FloorplanAmenity[]
    File?:             MediaFile[]
}

export interface RoomInfo {
    RoomType: 'bedroom' | 'bathroom' | 'den' | 'loft' | 'kitchen' | 'living'
    Count:    number
}

export interface FloorplanAmenity {
    AmenityType:         string
    AmenityDescription?: string
}

export interface ILSUnitInfo {
    Units?: {
        Unit: ILSUnit[]
    }
}

export interface ILSUnit {
    Identification: {
        UnitID:       string
        UnitNumber?:  string
        FloorplanID?: string
        PhaseID?:     string
        BuildingID?:  string
    }
    UnitBedrooms?:  number
    UnitBathrooms?: number
    MinSquareFeet?: number
    MaxSquareFeet?: number
    SquareFeet?:    number
    UnitRent?:      number
    MarketRent?:    number
    EffectiveRent?: number
    Deposit?:       DepositInfo
    Availability?: {
        VacateDate?:    string // ISO 8601 date
        VacancyClass?:  'Occupied' | 'Unoccupied' | 'Notice' | 'Down'
        MadeReadyDate?: string // ISO 8601 date
        AvailableDate?: string // ISO 8601 date
    }
    UnitAmenity?: UnitAmenity[]
    File?:        MediaFile[]
}

export interface UnitAmenity {
    AmenityType:         string
    AmenityDescription?: string
}

export interface PropertyAmenity {
    AmenityType:         string
    AmenityDescription?: string
    AmenityRank?:        number
}

export interface MediaFile {
    FileID?:      string
    Active?:      boolean
    FileType?:    'Photo' | 'Video' | 'Floorplan' | 'Document' | 'Logo'
    Name?:        string
    Caption?:     string
    Description?: string
    Format?:      string // MIME type
    Src?:         string // URL
    Width?:       number
    Height?:      number
    Rank?:        number
}

// Helper type for feed generation options
export interface MITSFeedOptions {
    building:       BuildingData // BuildingData from types/index.ts
    unitTypes:      UnitTypeData[] // UnitTypeData[] from types/index.ts
    units:          UnitData[] // UnitData[] from types/index.ts
    siteName:       'apartments_com' | 'zillow'
    includePhotos?: boolean
    updateMode?:    'full' | 'availability_only'
}

// Site-specific configuration
export interface SiteConfig {
    siteName:           string
    requiresFloorplans: boolean
    supportsPetTypes:   boolean
    supportsPhases:     boolean
    defaultRentalType:  'Market Rate' | 'Affordable' | 'Student' | 'Senior'
    xmlNamespace?:      string
}

// Validation options
export interface ValidationOptions {
    strict?:                boolean
    maxDepth?:              number
    allowExternalEntities?: boolean
    checkDates?:            boolean
    checkNumericTypes?:     boolean
}

// Feed metadata
export interface FeedMetadata {
    generatedAt:    Date
    version:        string
    siteName:       string
    propertyCount:  number
    unitCount:      number
    floorplanCount: number
}
