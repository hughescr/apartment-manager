import { describe, it, expect, beforeEach } from 'bun:test';
import _ from 'lodash';
import type { BuildingData, UnitData, UnitTypeData } from '../../src/types';
import { AmenityCategory } from '../../src/types';
import { generateMITSFeed, generateMultiBuildingMITSFeed } from '../../src/mits/generator';
import { validateMITSXML } from '../../src/mits/validator';

describe('MITS Feed Generator', () => {
    let mockBuilding: BuildingData;
    let mockUnitTypes: UnitTypeData[];
    let mockUnits: UnitData[];

    beforeEach(() => {
        // Setup test data with all fields we currently have
        mockBuilding = {
            buildingID: 'test-building-1',
            buildingName: 'Sunset Apartments',
            street: '123 Main St',
            city: 'Los Angeles',
            state: 'CA',
            zip: '90001',
            description: 'Modern apartment complex',
            yearBuilt: 2020,
            numberStories: 3,
            totalUnits: 24,
            propertyDescription: 'Beautiful apartments with modern amenities',
            contactInfo: {
                name: 'John Doe',
                phone: '(555) 123-4567',
                email: 'contact@sunsetapts.com',
                website: 'https://sunsetapts.com'
            },
            propertyAmenities: [
                { name: 'Pool', category: AmenityCategory.COMMUNITY },
                { name: 'Gym', category: AmenityCategory.PROPERTY }
            ],
            petPolicies: {
                allowed: true,
                deposit: 500,
                monthlyFee: 25
            },
            applicationFee: 50,
            acceptsOnlineApplications: true
        };

        mockUnitTypes = [
            {
                buildingID: 'test-building-1',
                modelID: 'model-1',
                modelName: 'Studio Deluxe',
                beds: 0,
                baths: 1,
                minRent: 1200,
                maxRent: 1400,
                minSqft: 450,
                maxSqft: 550,
                deposit: 1200,
                countAvailable: 3
            },
            {
                buildingID: 'test-building-1',
                modelID: 'model-2',
                modelName: 'One Bedroom',
                beds: 1,
                baths: 1,
                minRent: 1600,
                maxRent: 1800,
                minSqft: 750,
                maxSqft: 850,
                deposit: 1600,
                countAvailable: 5
            }
        ];

        mockUnits = [
            {
                buildingID: 'test-building-1',
                unitID: 'unit-101',
                unitNumber: '101',
                modelID: 'model-1',
                beds: 0,
                baths: 1,
                sqft: 500,
                rent: 1300,
                occupied: false,
                availableDate: '2025-02-01',
                deposit: 1300,
                feedInclusion: {
                    apartments_com: true,
                    zillow: true
                }
            },
            {
                buildingID: 'test-building-1',
                unitID: 'unit-201',
                unitNumber: '201',
                modelID: 'model-2',
                beds: 1,
                baths: 1,
                sqft: 800,
                rent: 1700,
                occupied: false,
                availableDate: '2025-02-15',
                deposit: 1700,
                feedInclusion: {
                    apartments_com: true,
                    zillow: false
                }
            }
        ];
    });

    describe('Basic XML Generation', () => {
        it('should generate valid MITS 4.1 XML structure', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            expect(xml).toContain('<PhysicalProperty xmlns=');
            expect(xml).toContain('</PhysicalProperty>');
        });

        it('should include property identification', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<Property_ID>');
            expect(xml).toContain('<Identification>');
            expect(xml).toContain(`<PropertyID>${mockBuilding.buildingID}</PropertyID>`);
            expect(xml).toContain(`<MarketingName>${mockBuilding.buildingName}</MarketingName>`);
        });

        it('should include property address', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<Property_ID>');
            expect(xml).toContain('<Address>');
            expect(xml).toContain(`<Address>${mockBuilding.street}</Address>`);
            expect(xml).toContain(`<City>${mockBuilding.city}</City>`);
            expect(xml).toContain(`<State>${mockBuilding.state}</State>`);
            expect(xml).toContain(`<PostalCode>${mockBuilding.zip}</PostalCode>`);
        });

        it('should include contact information', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<Information>');
            expect(xml).toContain(`<PhoneNumber>${mockBuilding.contactInfo?.phone}</PhoneNumber>`);
            expect(xml).toContain(`<Email>${mockBuilding.contactInfo?.email}</Email>`);
        });
    });

    describe('Floorplan (Model) Generation', () => {
        it('should generate floorplan entries for each unit type', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<Floorplan>');
            expect(xml).toContain(`<Name>${mockUnitTypes[0].modelName}</Name>`);
            expect(xml).toContain(`<Name>${mockUnitTypes[1].modelName}</Name>`);
        });

        it('should include room configuration', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<Room>');
            expect(xml).toContain('<RoomType>bedroom</RoomType>');
            expect(xml).toContain('<RoomType>bathroom</RoomType>');
            expect(xml).toContain(`<Count>${mockUnitTypes[0].beds}</Count>`);
        });

        it('should include square footage range', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<SquareFeet>');
            expect(xml).toContain(`<Min>${mockUnitTypes[0].minSqft}</Min>`);
            expect(xml).toContain(`<Max>${mockUnitTypes[0].maxSqft}</Max>`);
        });

        it('should include rent range', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<MarketRent>');
            expect(xml).toContain(`<Min>${mockUnitTypes[0].minRent}</Min>`);
            expect(xml).toContain(`<Max>${mockUnitTypes[0].maxRent}</Max>`);
        });
    });

    describe('Unit Generation', () => {
        it('should only include units marked for the specified site', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'zillow'
            });

            // Unit 101 should be included (zillow: true)
            expect(xml).toContain('<UnitID>unit-101</UnitID>');

            // Unit 201 should NOT be included (zillow: false)
            expect(xml).not.toContain('<UnitID>unit-201</UnitID>');
        });

        it('should include unit availability information', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<ILSUnit>');
            expect(xml).toContain('<Units>');
            expect(xml).toContain(`<UnitNumber>${mockUnits[0].unitNumber}</UnitNumber>`);
            expect(xml).toContain('<UnitBedrooms>0</UnitBedrooms>');
            expect(xml).toContain('<UnitBathrooms>1</UnitBathrooms>');
        });

        it('should include unit rent and availability date', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain(`<MarketRent>${mockUnits[0].rent}</MarketRent>`);
            expect(xml).toContain(`<VacateDate>${mockUnits[0].availableDate}</VacateDate>`);
        });

        it('should link units to their floorplan', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain(`<FloorplanID>${mockUnits[0].modelID}</FloorplanID>`);
        });
    });

    describe('Amenities', () => {
        it('should include property amenities', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<Amenity>');
            expect(xml).toContain('<AmenityType>Pool</AmenityType>');
            expect(xml).toContain('<AmenityType>Gym</AmenityType>');
        });

        it('should include pet policy', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<Pet>');
            expect(xml).toContain('<Allowed>true</Allowed>');
            expect(xml).toContain(`<Deposit>${mockBuilding.petPolicies?.deposit}</Deposit>`);
            expect(xml).toContain(`<Fee>${mockBuilding.petPolicies?.monthlyFee}</Fee>`);
        });
    });

    describe('XML Special Characters', () => {
        it('should properly escape XML special characters', async () => {
            const buildingWithSpecialChars = {
                ...mockBuilding,
                buildingName: 'Smith & Jones Apartments',
                propertyDescription: 'Units < 1000 sqft with "great" views & more'
            };

            const xml = await generateMITSFeed({
                building: buildingWithSpecialChars,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('Smith &amp; Jones Apartments');
            expect(xml).toContain('Units &lt; 1000 sqft');
            expect(xml).toContain('&quot;great&quot; views &amp; more');
        });

        it('should handle missing optional fields gracefully', async () => {
            const minimalBuilding: BuildingData = {
                buildingID: 'test-min',
                buildingName: 'Minimal Building'
            };

            const xml = await generateMITSFeed({
                building: minimalBuilding,
                unitTypes: [],
                units: [],
                siteName: 'apartments_com'
            });

            // Should still generate valid XML structure
            expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            expect(xml).toContain('<PhysicalProperty xmlns=');
            expect(validateMITSXML(xml)).toBe(true);
        });
    });

    describe('Site-Specific Adaptations', () => {
        it('should generate Apartments.com specific format', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            // Apartments.com uses floorplan/model structure
            expect(xml).toContain('<Floorplan>');
            expect(xml).toContain('<FloorplanID>');
        });

        it('should generate Zillow specific format', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'zillow'
            });

            // Zillow might have different requirements
            expect(xml).toContain('<PhysicalProperty xmlns=');
            // Add Zillow-specific assertions as needed
        });
    });

    describe('Default Values', () => {
        it('should provide sensible defaults for missing MITS required fields', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            // Defaults for missing required MITS fields
            expect(xml).toContain('<ILS_Identification>');
            expect(xml).toContain('<RentalType>Market Rate</RentalType>'); // Default
            expect(xml).toContain('<LastUpdate>'); // Should include current timestamp
        });

        it('should generate valid management company defaults', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<Management>');
            expect(xml).toContain('<CompanyName>'); // Use building name as default
        });
    });

    describe('Validation', () => {
        it('should generate XML that passes MITS validation', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            const isValid = validateMITSXML(xml);
            expect(isValid).toBe(true);
        });

        it('should reject invalid building data', async () => {
            expect(async () => {
                await generateMITSFeed({
                    building: { buildingID: '' }, // Invalid: empty ID
                    unitTypes: [],
                    units: [],
                    siteName: 'apartments_com'
                });
            }).toThrow('Building ID is required');
        });
    });

    describe('Performance', () => {
        it('should handle large datasets efficiently', async () => {
            // Generate 100 units
            const largeUnits: UnitData[] = [];
            for(let i = 0; i < 100; i++) {
                largeUnits.push({
                    ...mockUnits[0],
                    unitID: `unit-${i}`,
                    unitNumber: `${i}`,
                    feedInclusion: { apartments_com: true }
                });
            }

            const startTime = Date.now();
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: largeUnits,
                siteName: 'apartments_com'
            });
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
            expect(xml).toContain('<ILSUnit>');
        });
    });

    describe('Multi-Building Feed Generation', () => {
        it('should generate feed for multiple buildings', async () => {
            const building2: BuildingData = {
                buildingID: 'test-building-2',
                buildingName: 'Sunrise Apartments',
                street: '456 Oak St',
                city: 'San Francisco',
                state: 'CA',
                zip: '94102'
            };

            const unitTypes2: UnitTypeData[] = [
                {
                    buildingID: 'test-building-2',
                    modelID: 'model-3',
                    modelName: 'Two Bedroom',
                    beds: 2,
                    baths: 2,
                    minRent: 2000,
                    maxRent: 2500
                }
            ];

            const units2: UnitData[] = [
                {
                    buildingID: 'test-building-2',
                    unitID: 'unit-301',
                    unitNumber: '301',
                    modelID: 'model-3',
                    beds: 2,
                    baths: 2,
                    rent: 2200,
                    feedInclusion: { apartments_com: true }
                }
            ];

            const xml = await generateMultiBuildingMITSFeed({
                buildings: [mockBuilding, building2],
                unitTypesByBuilding: {
                    'test-building-1': mockUnitTypes,
                    'test-building-2': unitTypes2
                },
                unitsByBuilding: {
                    'test-building-1': _.filter(mockUnits, u => u.feedInclusion?.apartments_com) as UnitData[],
                    'test-building-2': units2
                },
                siteName: 'apartments_com'
            });

            // Should have wrapper for multiple properties
            expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            expect(xml).toContain('<PhysicalProperties');
            expect(xml).toContain('</PhysicalProperties>');

            // Should contain both buildings
            expect(xml).toContain('test-building-1');
            expect(xml).toContain('Sunset Apartments');
            expect(xml).toContain('test-building-2');
            expect(xml).toContain('Sunrise Apartments');

            // Should have multiple PhysicalProperty elements
            const propertyMatches = xml.match(/<PhysicalProperty>/g);
            expect(propertyMatches?.length).toBe(2);
        });

        it('should handle empty buildings array', async () => {
            const xml = await generateMultiBuildingMITSFeed({
                buildings: [],
                unitTypesByBuilding: {},
                unitsByBuilding: {},
                siteName: 'zillow'
            });

            expect(xml).toContain('<PhysicalProperties');
            expect(xml).toContain('</PhysicalProperties>');
            expect(xml).toContain('<LastUpdate>');
        });

        it('should filter units by site correctly in multi-building feed', async () => {
            const xml = await generateMultiBuildingMITSFeed({
                buildings: [mockBuilding],
                unitTypesByBuilding: {
                    'test-building-1': mockUnitTypes
                },
                unitsByBuilding: {
                    'test-building-1': mockUnits // Has mixed feedInclusion settings
                },
                siteName: 'zillow'
            });

            // Should only include unit-101 (has zillow: true)
            expect(xml).toContain('unit-101');
            // Should NOT include unit-201 (has zillow: false)
            expect(xml).not.toContain('unit-201');
        });
    });
});
