import type { BuildingData, UnitData, UnitTypeData } from '../types/index';

// Type aliases for enhanced data structures (future-proofing)
type EnhancedBuildingData = BuildingData & {
    latitude?: number
    longitude?: number
    specialtyType?: string
    contactInfo?: {
        propertyWebsite?: string
        managementWebsite?: string
        website?: string
        name?: string
        phone?: string
        email?: string
    }
};

type EnhancedUnitData = UnitData & {
    vacancyClass?: 'Occupied' | 'Unoccupied' | 'Notice' | 'Down'
    vacateDate?: string
    madeReadyDate?: string
};

interface EnhancedDeposit {
    amount: number
    refundable?: boolean
    partialRefundPercentage?: number
}

type EnhancedUnitTypeData = UnitTypeData & {
    deposit?: number | EnhancedDeposit
};

// Extended types with updatedAt for proper typing
interface UnitTypeWithUpdate extends UnitTypeData {
    updatedAt: Date
}

interface UnitWithUpdate extends UnitData {
    updatedAt: Date
}
import _ from 'lodash';
import type {
    MITSPhysicalProperty as _MITSPhysicalProperty,
    MITSFeedOptions,
    Floorplan as _Floorplan,
    ILSUnit as _ILSUnit,
    PropertyAmenity as _PropertyAmenity,
    PetPolicy as _PetPolicy
} from './schema';

export interface MultiBuildingFeedOptions {
    buildings: BuildingData[]
    unitTypesByBuilding: Record<string, UnitTypeData[]>
    unitsByBuilding: Record<string, UnitData[]>
    siteName: 'apartments_com' | 'zillow'
}

const MITS_NAMESPACE = 'http://www.mitsproject.org/namespace';

// XML escape function for security
function escapeXML(str: string | undefined | null): string {
    if(!str) {
        return '';
    }
    let result = str.toString();
    result = _.replace(result, /&/g, '&amp;');
    result = _.replace(result, /</g, '&lt;');
    result = _.replace(result, />/g, '&gt;');
    result = _.replace(result, /"/g, '&quot;');
    result = _.replace(result, /'/g, '&apos;');
    return result;
}

// Format date to ISO 8601
function formatDate(date: Date | string | undefined): string {
    if(!date) {
        return new Date().toISOString();
    }
    if(_.isString(date)) {
        // If already ISO format, return as-is
        if(date.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(.\d{3})?Z?)?$/)) {
            return date.includes('T') ? date : `${date}T00:00:00Z`;
        }
        const newDate = new Date(date);
        return newDate.toISOString();
    }
    return date.toISOString();
}

// Import the geocoding service
import { geocodeAddress } from '../services/geocoding';

// Get coordinates for a building with fallback strategy
async function getBuildingCoordinates(building: BuildingData): Promise<{ latitude: number, longitude: number }> {
    const enhancedBuilding = building as EnhancedBuildingData;

    // Use real coordinates if available
    if(enhancedBuilding.latitude && enhancedBuilding.longitude) {
        return { latitude: enhancedBuilding.latitude, longitude: enhancedBuilding.longitude };
    }

    // Try geocoding if we have address info
    if(building.street && building.city && building.state) {
        // Note: fullAddress would be used for geocoding API call
        const coords = await geocodeAddress(building.street, building.city, building.state);
        if(coords) {
            return { latitude: coords.lat, longitude: coords.lng };
        }
    }

    // Fall back to LA coordinates as last resort
    return { latitude: 34.0522, longitude: -118.2437 };
}

// Map specialtyType to MITS RentalType
function mapSpecialtyTypeToRentalType(building: BuildingData): string {
    const enhancedBuilding = building as EnhancedBuildingData;
    const specialtyType = enhancedBuilding.specialtyType;

    switch(_.toLower(specialtyType)) {
        case 'senior':
            return 'Senior';
        case 'student':
            return 'Student';
        case 'affordable':
            return 'Affordable';
        default:
            return 'Market Rate';
    }
}

// Extract deposit amount with backward compatibility
function extractDepositAmount(deposit: number | EnhancedDeposit | undefined): number | undefined {
    if(deposit === undefined || deposit === null) {
        return undefined;
    }
    if(_.isNumber(deposit)) {
        return deposit;
    }
    return deposit.amount;
}

// Check if deposit is refundable (enhanced deposits only)
function isDepositRefundable(deposit: number | EnhancedDeposit | undefined): boolean | undefined {
    if(deposit === undefined || deposit === null || _.isNumber(deposit)) {
        return undefined;
    }
    return deposit.refundable;
}

// Get partial refund percentage (enhanced deposits only)
function getPartialRefundPercentage(deposit: number | EnhancedDeposit | undefined): number | undefined {
    if(deposit === undefined || deposit === null || _.isNumber(deposit)) {
        return undefined;
    }
    return deposit.partialRefundPercentage;
}

// Convert bedroom count to room configuration
function generateRoomInfo(beds: number, baths: number): string {
    let rooms = '';

    // Bedrooms (0 beds = studio)
    rooms += `
        <Room>
            <RoomType>bedroom</RoomType>
            <Count>${beds}</Count>
        </Room>`;

    // Bathrooms
    if(baths > 0) {
        rooms += `
        <Room>
            <RoomType>bathroom</RoomType>
            <Count>${Math.floor(baths)}</Count>
        </Room>`;
    }

    return rooms;
}

// Generate property amenities
function generateAmenities(building: BuildingData): string {
    if(!building.propertyAmenities || building.propertyAmenities.length === 0) {
        return '';
    }

    let amenities = '';
    for(const amenity of building.propertyAmenities) {
        amenities += `
        <AmenityType>${escapeXML(amenity.name)}</AmenityType>`;
    }

    return `
    <Amenity>${amenities}
    </Amenity>`;
}

// Generate pet policy
function generatePetPolicy(petPolicies: BuildingData['petPolicies']): string {
    if(!petPolicies) {
        return '';
    }

    return `
        <Pet>
            <Allowed>${petPolicies.allowed || false}</Allowed>${
                petPolicies.deposit
                    ? `
            <Deposit>${petPolicies.deposit}</Deposit>`
                    : ''
            }${
                petPolicies.monthlyFee
                    ? `
            <Fee>${petPolicies.monthlyFee}</Fee>`
                    : ''
            }${
                petPolicies.notes
                    ? `
            <Comment>${escapeXML(petPolicies.notes)}</Comment>`
                    : ''
            }
        </Pet>`;
}

// Generate floorplan from unit type
function generateFloorplan(unitType: UnitTypeData): string {
    const enhancedUnitType = unitType as EnhancedUnitTypeData;
    return `
    <Floorplan>
        <Identification>
            <FloorplanID>${escapeXML(unitType.modelID)}</FloorplanID>
            <Name>${escapeXML(unitType.modelName)}</Name>${
                unitType.countAvailable
                    ? `
            <UnitsAvailable>${unitType.countAvailable}</UnitsAvailable>`
                    : ''
            }
        </Identification>${generateRoomInfo(unitType.beds, unitType.baths)}${
            (unitType.minSqft || unitType.maxSqft)
                ? `
        <SquareFeet>${
            unitType.minSqft
                ? `
            <Min>${unitType.minSqft}</Min>`
                : ''
        }${
            unitType.maxSqft
                ? `
            <Max>${unitType.maxSqft}</Max>`
                : ''
        }
        </SquareFeet>`
                : ''
        }${
            (unitType.minRent || unitType.maxRent)
                ? `
        <MarketRent>${
            unitType.minRent
                ? `
            <Min>${unitType.minRent}</Min>`
                : ''
        }${
            unitType.maxRent
                ? `
            <Max>${unitType.maxRent}</Max>`
                : ''
        }
        </MarketRent>`
                : ''
        }${
            extractDepositAmount(enhancedUnitType.deposit)
                ? `
        <Deposit>
            <Amount>
                <Value>${extractDepositAmount(enhancedUnitType.deposit)}</Value>
            </Amount>${
                isDepositRefundable(enhancedUnitType.deposit) !== undefined
                    ? `
            <Refundable>${isDepositRefundable(enhancedUnitType.deposit)}</Refundable>`
                    : ''
            }${
                getPartialRefundPercentage(enhancedUnitType.deposit)
                    ? `
            <PartialRefund>${getPartialRefundPercentage(enhancedUnitType.deposit)}%</PartialRefund>`
                    : ''
            }
        </Deposit>`
                : ''
        }
    </Floorplan>`;
}

// Helper function to generate unit identification XML
function generateUnitIdentificationXML(unit: UnitData): string {
    return `
                <Identification>
                    <UnitID>${escapeXML(unit.unitID)}</UnitID>${
                        unit.unitNumber
                            ? `
                    <UnitNumber>${escapeXML(unit.unitNumber)}</UnitNumber>`
                            : ''
                    }${
                        unit.modelID
                            ? `
                    <FloorplanID>${escapeXML(unit.modelID)}</FloorplanID>`
                            : ''
                    }
                </Identification>`;
}

// Helper function to generate unit details XML (beds, baths, sqft, rent)
function generateUnitDetailsXML(unit: UnitData): string {
    const bedsXML = unit.beds !== undefined
        ? `
                <UnitBedrooms>${unit.beds}</UnitBedrooms>`
        : '';

    const bathsXML = unit.baths !== undefined
        ? `
                <UnitBathrooms>${unit.baths}</UnitBathrooms>`
        : '';

    const sqftXML = unit.sqft
        ? `
                <MinSquareFeet>${unit.sqft}</MinSquareFeet>
                <MaxSquareFeet>${unit.sqft}</MaxSquareFeet>`
        : '';

    const rentXML = unit.rent
        ? `
                <MarketRent>${unit.rent}</MarketRent>`
        : '';

    return bedsXML + bathsXML + sqftXML + rentXML;
}

// Helper function to generate unit availability XML
function generateUnitAvailabilityXML(unit: UnitData): string {
    const enhancedUnit = unit as EnhancedUnitData;

    // Use new vacancy date fields with fallbacks
    const vacateDate = enhancedUnit.vacateDate || unit.availableDate || _.split(new Date().toISOString(), 'T')[0];
    const madeReadyDate = enhancedUnit.madeReadyDate || unit.availableDate || vacateDate;
    const availableDate = unit.availableDate || madeReadyDate;

    // Use new vacancyClass field with backward compatibility
    const vacancyClass = enhancedUnit.vacancyClass || (unit.occupied ? 'Occupied' : 'Unoccupied');

    return `
                <Availability>${
                    enhancedUnit.vacateDate
                        ? `
                    <VacateDate>${vacateDate}</VacateDate>`
                        : ''
                }
                    <VacancyClass>${vacancyClass}</VacancyClass>${
                        enhancedUnit.madeReadyDate
                            ? `
                    <MadeReadyDate>${madeReadyDate}</MadeReadyDate>`
                            : ''
                    }${
                        unit.availableDate
                            ? `
                    <AvailableDate>${availableDate}</AvailableDate>`
                            : ''
                    }
                </Availability>`;
}

// Generate unit information
function generateUnit(unit: UnitData): string {
    return `
            <Unit>${generateUnitIdentificationXML(unit)}${generateUnitDetailsXML(unit)}${generateUnitAvailabilityXML(unit)}
            </Unit>`;
}

// Generate MITS feed for a single building
// Helper function to generate property identification XML
function generatePropertyIdentification(building: BuildingData, escapeXML: (str: string | undefined | null) => string): string {
    const enhancedBuilding = building as EnhancedBuildingData;

    return `
        <Identification>
            <PropertyID>${escapeXML(building.buildingID)}</PropertyID>${
                building.buildingName
                    ? `
            <MarketingName>${escapeXML(building.buildingName)}</MarketingName>`
                    : ''
            }${
                (enhancedBuilding.contactInfo?.propertyWebsite || enhancedBuilding.contactInfo?.website)
                    ? `
            <WebSite>${escapeXML(enhancedBuilding.contactInfo.propertyWebsite || enhancedBuilding.contactInfo.website)}</WebSite>`
                    : ''
            }
        </Identification>`;
}

// Helper function to generate address XML
function generateAddressXML(building: BuildingData, escapeXML: (str: string | undefined | null) => string): string {
    const address = building.street || 'TBD';
    const city = building.city || 'TBD';
    const state = building.state || 'CA';
    const zip = building.zip || '00000';

    return `
        <Address>
            <Address>${escapeXML(address)}</Address>
            <City>${escapeXML(city)}</City>
            <State>${escapeXML(state)}</State>
            <PostalCode>${escapeXML(zip)}</PostalCode>
            <Country>US</Country>
        </Address>`;
}

// Helper function to generate information fields XML
function generateInformationFieldsXML(building: BuildingData, escapeXML: (str: string | undefined | null) => string): string {
    const enhancedBuilding = building as EnhancedBuildingData;
    const yearBuiltXML = building.yearBuilt
        ? `
        <YearBuilt>${building.yearBuilt}</YearBuilt>`
        : '';

    const shortDescriptionXML = building.description
        ? `
        <ShortDescription>${escapeXML(building.description)}</ShortDescription>`
        : '';

    const longDescriptionXML = building.propertyDescription
        ? `
        <LongDescription>${escapeXML(building.propertyDescription)}</LongDescription>`
        : '';

    const phoneXML = building.contactInfo?.phone
        ? `
        <PhoneNumber>${escapeXML(building.contactInfo.phone)}</PhoneNumber>`
        : '';

    const emailXML = building.contactInfo?.email
        ? `
        <Email>${escapeXML(building.contactInfo.email)}</Email>`
        : '';

    const websiteXML = (enhancedBuilding.contactInfo?.propertyWebsite || enhancedBuilding.contactInfo?.website)
        ? `
        <WebSite>${escapeXML(enhancedBuilding.contactInfo.propertyWebsite || enhancedBuilding.contactInfo.website)}</WebSite>`
        : '';

    return yearBuiltXML + shortDescriptionXML + longDescriptionXML + phoneXML + emailXML + websiteXML;
}

// Helper function to generate information section XML
function generateInformationXML(building: BuildingData, escapeXML: (str: string | undefined | null) => string): string {
    if(!building.buildingName && !building.yearBuilt && !building.description) {
        return '';
    }

    return `
    
    <Information>
        <StructureType>Apartment</StructureType>${generateInformationFieldsXML(building, escapeXML)}
    </Information>`;
}

// Helper function to generate management section XML
function generateManagementXML(building: BuildingData, escapeXML: (str: string | undefined | null) => string): string {
    const enhancedBuilding = building as EnhancedBuildingData;

    const managementName = enhancedBuilding.contactInfo?.name || building.buildingName || 'Property Management';
    const managementEmail = enhancedBuilding.contactInfo?.email || '';
    const managementPhone = enhancedBuilding.contactInfo?.phone || '';
    const managementWebsite = enhancedBuilding.contactInfo?.managementWebsite;

    return `
    
    <Management>
        <CompanyName>${escapeXML(managementName)}</CompanyName>${
            managementName
                ? `
        <Name>${escapeXML(managementName)}</Name>`
                : ''
        }${
            managementEmail
                ? `
        <Email>${escapeXML(managementEmail)}</Email>`
                : ''
        }${
            managementPhone
                ? `
        <Phone>${escapeXML(managementPhone)}</Phone>`
                : ''
        }${
            managementWebsite
                ? `
        <WebSite>${escapeXML(managementWebsite)}</WebSite>`
                : ''
        }
    </Management>`;
}

// Helper function to generate policy section XML
function generatePolicyXML(building: BuildingData): string {
    if(!building.petPolicies && !building.applicationFee) {
        return '';
    }

    return `
    
    <Policy>${generatePetPolicy(building.petPolicies)}${
        building.applicationFee
            ? `
        <ApplicationFee>${building.applicationFee}</ApplicationFee>`
            : ''
    }
    </Policy>`;
}

// Helper function to generate units section XML
function generateUnitsXML(siteUnits: UnitData[]): string {
    if(siteUnits.length === 0) {
        return '';
    }

    let xml = `
    
    <ILSUnit>
        <Units>`;

    for(const unit of siteUnits) {
        xml += generateUnit(unit);
    }

    xml += `
        </Units>
    </ILSUnit>`;

    return xml;
}

// Generate MITS feed for a single building
export async function generateMITSFeedForBuilding(options: MITSFeedOptions): Promise<string> {
    const { building, unitTypes, units, siteName } = options;

    // Validate required fields
    if(!building.buildingID) {
        throw new Error('Building ID is required');
    }

    // Filter units for the specified site and vacancy class
    const siteUnits = _.filter(units, (unit) => {
        // Check if unit is included in feed for this site
        const includedInFeed = unit.feedInclusion && unit.feedInclusion[siteName] === true;
        if(!includedInFeed) {
            return false;
        }

        // Filter out units with 'Down' vacancy class
        const enhancedUnit = unit as EnhancedUnitData;
        if(enhancedUnit.vacancyClass === 'Down') {
            return false;
        }

        // Note: 'Notice' units are included in feeds by default
        // Future enhancement: make this configurable per site

        return true;
    }) as UnitData[];

    // Find the most recent updatedAt timestamp from all data
    let mostRecentUpdate: Date | undefined;

    // Check building updatedAt
    if(building.updatedAt) {
        mostRecentUpdate = building.updatedAt;
    }

    // Check unitTypes updatedAt
    const unitTypesWithUpdates = _.filter(unitTypes, (ut): ut is UnitTypeWithUpdate => 'updatedAt' in ut && ut.updatedAt != null);
    const mostRecentUnitType = _.maxBy(unitTypesWithUpdates, 'updatedAt');
    if(mostRecentUnitType && (!mostRecentUpdate || mostRecentUnitType.updatedAt > mostRecentUpdate)) {
        mostRecentUpdate = mostRecentUnitType.updatedAt;
    }

    // Check units updatedAt
    const unitsWithUpdates = _.filter(siteUnits, (unit): unit is UnitWithUpdate => 'updatedAt' in unit && unit.updatedAt != null);
    const mostRecentUnit = _.maxBy(unitsWithUpdates, 'updatedAt');
    if(mostRecentUnit && (!mostRecentUpdate || mostRecentUnit.updatedAt > mostRecentUpdate)) {
        mostRecentUpdate = mostRecentUnit.updatedAt;
    }

    // Use most recent update if found, otherwise use current timestamp
    const lastUpdate = formatDate(mostRecentUpdate || new Date());

    // Build the XML document
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<PhysicalProperty xmlns="${MITS_NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <Property_ID>`;

    // Add property identification
    xml += generatePropertyIdentification(building, escapeXML);

    // Add address
    xml += generateAddressXML(building, escapeXML);

    // Get coordinates and rental type
    const coords = await getBuildingCoordinates(building);
    const rentalType = mapSpecialtyTypeToRentalType(building);

    // Add ILS identification
    xml += `
        <ILS_Identification>
            <RentalType>${rentalType}</RentalType>
            <Latitude>${coords.latitude}</Latitude>
            <Longitude>${coords.longitude}</Longitude>
        </ILS_Identification>
    </Property_ID>`;

    // Add property information
    xml += generateInformationXML(building, escapeXML);

    // Add management section
    xml += generateManagementXML(building, escapeXML);

    // Add policies
    xml += generatePolicyXML(building);

    // Add amenities
    xml += generateAmenities(building);

    // Add floorplans
    for(const unitType of unitTypes) {
        xml += generateFloorplan(unitType);
    }

    // Add units
    xml += generateUnitsXML(siteUnits);

    // Close the document
    xml += `
    
    <LastUpdate>${lastUpdate}</LastUpdate>
</PhysicalProperty>`;

    return xml;
}

// Wrapper for backward compatibility
export async function generateMITSFeed(options: MITSFeedOptions): Promise<string> {
    return generateMITSFeedForBuilding(options);
}

// Helper function to find the most recent updatedAt timestamp
function findMostRecentUpdate(buildings: BuildingData[], unitTypesByBuilding: Record<string, UnitTypeData[]>, unitsByBuilding: Record<string, UnitData[]>): Date | undefined {
    const allDatesWithUpdates: Date[] = [];

    // Collect all updatedAt dates from buildings
    const buildingsWithUpdates = _.filter(buildings, 'updatedAt');
    allDatesWithUpdates.push(..._.map(buildingsWithUpdates, 'updatedAt') as Date[]);

    // Collect all updatedAt dates from unit types
    const allUnitTypes = _(unitTypesByBuilding).values().flatten().value();
    const allUnitTypesWithUpdates = _.filter(allUnitTypes, (ut): ut is UnitTypeWithUpdate => 'updatedAt' in ut && ut.updatedAt != null);
    allDatesWithUpdates.push(..._.map(allUnitTypesWithUpdates, 'updatedAt'));

    // Collect all updatedAt dates from units
    const allUnits = _(unitsByBuilding).values().flatten().value();
    const allUnitsWithUpdates = _.filter(allUnits, (unit): unit is UnitWithUpdate => 'updatedAt' in unit && unit.updatedAt != null);
    allDatesWithUpdates.push(..._.map(allUnitsWithUpdates, 'updatedAt'));

    return allDatesWithUpdates.length > 0 ? _.max(allDatesWithUpdates) : undefined;
}

// Generate MITS feed for multiple buildings
export async function generateMultiBuildingMITSFeed(options: MultiBuildingFeedOptions): Promise<string> {
    const { buildings, unitTypesByBuilding, unitsByBuilding, siteName } = options;

    // Find the most recent updatedAt timestamp from all data across all buildings
    const mostRecentUpdate = findMostRecentUpdate(buildings, unitTypesByBuilding, unitsByBuilding);
    const lastUpdate = formatDate(mostRecentUpdate || new Date());

    // Start the aggregated XML document
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<PhysicalProperties xmlns="${MITS_NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`;

    // Generate XML for each building
    for(const building of buildings) {
        const unitTypes = unitTypesByBuilding[building.buildingID] || [];
        const units = unitsByBuilding[building.buildingID] || [];

        // Generate individual building XML
        const buildingXML = await generateMITSFeedForBuilding({
            building,
            unitTypes,
            units,
            siteName
        });

        // Extract just the PhysicalProperty content (remove XML declaration and wrapper)
        const match = buildingXML.match(/<PhysicalProperty[^>]*>([\s\S]*)<\/PhysicalProperty>/);
        if(match?.[1]) {
            xml += `
    <PhysicalProperty>${match[1]}</PhysicalProperty>`;
        }
    }

    // Close the document
    xml += `
    <LastUpdate>${lastUpdate}</LastUpdate>
</PhysicalProperties>`;

    return xml;
}
