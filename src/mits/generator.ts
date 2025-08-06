import type { BuildingData, UnitData, UnitTypeData } from '../types';
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
            unitType.deposit
                ? `
        <Deposit>
            <Amount>
                <Value>${unitType.deposit}</Value>
            </Amount>
        </Deposit>`
                : ''
        }
    </Floorplan>`;
}

// Generate unit information
function generateUnit(unit: UnitData): string {
    const availableDate = unit.availableDate || _.split(new Date().toISOString(), 'T')[0];
    const vacancyClass = unit.occupied ? 'Occupied' : 'Unoccupied';

    return `
            <Unit>
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
                </Identification>${
                    unit.beds !== undefined
                        ? `
                <UnitBedrooms>${unit.beds}</UnitBedrooms>`
                        : ''
                }${
                    unit.baths !== undefined
                        ? `
                <UnitBathrooms>${unit.baths}</UnitBathrooms>`
                        : ''
                }${
                    unit.sqft
                        ? `
                <MinSquareFeet>${unit.sqft}</MinSquareFeet>
                <MaxSquareFeet>${unit.sqft}</MaxSquareFeet>`
                        : ''
                }${
                    unit.rent
                        ? `
                <MarketRent>${unit.rent}</MarketRent>`
                        : ''
                }
                <Availability>
                    <VacateDate>${availableDate}</VacateDate>
                    <VacancyClass>${vacancyClass}</VacancyClass>
                    <MadeReadyDate>${availableDate}</MadeReadyDate>
                </Availability>
            </Unit>`;
}

// Generate MITS feed for a single building
// Helper function to generate property identification XML
function generatePropertyIdentification(building: BuildingData, escapeXML: (str: string | undefined | null) => string): string {
    return `
        <Identification>
            <PropertyID>${escapeXML(building.buildingID)}</PropertyID>${
                building.buildingName
                    ? `
            <MarketingName>${escapeXML(building.buildingName)}</MarketingName>`
                    : ''
            }${
                building.contactInfo?.website
                    ? `
            <WebSite>${escapeXML(building.contactInfo.website)}</WebSite>`
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

// Helper function to generate information section XML
function generateInformationXML(building: BuildingData, escapeXML: (str: string | undefined | null) => string): string {
    if(!building.buildingName && !building.yearBuilt && !building.description) {
        return '';
    }

    return `
    
    <Information>
        <StructureType>Apartment</StructureType>${
            building.yearBuilt
                ? `
        <YearBuilt>${building.yearBuilt}</YearBuilt>`
                : ''
        }${
            building.description
                ? `
        <ShortDescription>${escapeXML(building.description)}</ShortDescription>`
                : ''
        }${
            building.propertyDescription
                ? `
        <LongDescription>${escapeXML(building.propertyDescription)}</LongDescription>`
                : ''
        }${
            building.contactInfo?.phone
                ? `
        <PhoneNumber>${escapeXML(building.contactInfo.phone)}</PhoneNumber>`
                : ''
        }${
            building.contactInfo?.email
                ? `
        <Email>${escapeXML(building.contactInfo.email)}</Email>`
                : ''
        }${
            building.contactInfo?.website
                ? `
        <WebSite>${escapeXML(building.contactInfo.website)}</WebSite>`
                : ''
        }
    </Information>`;
}

// Helper function to generate management section XML
function generateManagementXML(building: BuildingData, escapeXML: (str: string | undefined | null) => string): string {
    const managementName = building.contactInfo?.name || building.buildingName || 'Property Management';
    const managementEmail = building.contactInfo?.email || '';
    const managementPhone = building.contactInfo?.phone || '';

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

    // Filter units for the specified site
    const siteUnits = _.filter(units, (unit) => {
        return unit.feedInclusion && unit.feedInclusion[siteName] === true;
    }) as UnitData[];

    // Get current timestamp
    const lastUpdate = formatDate(new Date());

    // Build the XML document
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<PhysicalProperty xmlns="${MITS_NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <Property_ID>`;

    // Add property identification
    xml += generatePropertyIdentification(building, escapeXML);

    // Add address
    xml += generateAddressXML(building, escapeXML);

    // Add ILS identification
    xml += `
        <ILS_Identification>
            <RentalType>Market Rate</RentalType>
            <Latitude>34.0522</Latitude>
            <Longitude>-118.2437</Longitude>
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

// Generate MITS feed for multiple buildings
export async function generateMultiBuildingMITSFeed(options: MultiBuildingFeedOptions): Promise<string> {
    const { buildings, unitTypesByBuilding, unitsByBuilding, siteName } = options;

    // Generate current timestamp
    const lastUpdate = formatDate(new Date());

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
        if(match && match[1]) {
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
