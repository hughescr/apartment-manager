import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import _ from 'lodash';
import type { BuildingData, UnitData, UnitTypeData, VacancyClass, Deposit, PetTypePolicy, ContactInfo } from '../../src/types';
import { AmenityCategory } from '../../src/types';
import { generateMITSFeed, generateMultiBuildingMITSFeed } from '../../src/mits/generator';
import { validateMITSXML } from '../../src/mits/validator';
import * as geocodingModule from '../../src/services/geocoding';

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
            latitude: 34.0522,
            longitude: -118.2437,
            description: 'Modern apartment complex',
            yearBuilt: 2020,
            numberStories: 3,
            totalUnits: 24,
            propertyDescription: 'Beautiful apartments with modern amenities',
            contactInfo: {
                name: 'John Doe',
                phone: '(555) 123-4567',
                email: 'contact@sunsetapts.com',
                propertyWebsite: 'https://sunsetapts.com'
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
            expect(xml).toContain(`<AvailableDate>${mockUnits[0].availableDate}</AvailableDate>`);
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
                zip: '94102',
                latitude: 37.7749,  // San Francisco coordinates to prevent geocoding
                longitude: -122.4194
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

    // ===== MITS ENHANCEMENT TESTS =====
    describe('MITS Enhancement Tests', () => {
        // 1. COORDINATE HANDLING TESTS
        describe('Coordinate Handling', () => {
            it('should use building.latitude/longitude when available', async () => {
                const buildingWithCoords: BuildingData = {
                    ...mockBuilding,
                    latitude: 37.7749,
                    longitude: -122.4194
                };

                const xml = await generateMITSFeed({
                    building: buildingWithCoords,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<Latitude>37.7749</Latitude>');
                expect(xml).toContain('<Longitude>-122.4194</Longitude>');
            });

            it('should fallback to geocoding when coordinates not set', async () => {
                // Mock the geocoding service to return specific coordinates
                const mockGeocode = spyOn(geocodingModule, 'geocodeAddress').mockResolvedValue({ lat: 34.0522, lng: -118.2437 });

                const buildingWithoutCoords: BuildingData = {
                    ...mockBuilding,
                    latitude: undefined,
                    longitude: undefined,
                    street: '123 Test St',
                    city: 'Test City',
                    state: 'CA'
                };

                const xml = await generateMITSFeed({
                    building: buildingWithoutCoords,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(mockGeocode).toHaveBeenCalledWith('123 Test St', 'Test City', 'CA');
                expect(xml).toContain('<Latitude>34.0522</Latitude>');
                expect(xml).toContain('<Longitude>-118.2437</Longitude>');
            });

            it('should use LA coordinates as last resort fallback', async () => {
                // Mock geocoding service to return null (failure)
                spyOn(geocodingModule, 'geocodeAddress').mockResolvedValue(null);

                const buildingWithoutCoords: BuildingData = {
                    ...mockBuilding,
                    latitude: undefined,
                    longitude: undefined,
                    street: 'Invalid Address',
                    city: 'Unknown City',
                    state: 'XX'
                };

                const xml = await generateMITSFeed({
                    building: buildingWithoutCoords,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<Latitude>34.0522</Latitude>');
                expect(xml).toContain('<Longitude>-118.2437</Longitude>');
            });

            it('should handle coordinatesVerified flag without affecting output', async () => {
                const buildingWithVerifiedCoords: BuildingData = {
                    ...mockBuilding,
                    latitude: 40.7128,
                    longitude: -74.0060,
                    coordinatesVerified: true
                };

                const xml = await generateMITSFeed({
                    building: buildingWithVerifiedCoords,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<Latitude>40.7128</Latitude>');
                expect(xml).toContain('<Longitude>-74.006</Longitude>'); // Note: floating point precision may vary
                // coordinatesVerified doesn't appear in MITS XML - it's for UI only
                expect(xml).not.toContain('coordinatesVerified');
            });
        });

        // 2. VACANCY CLASS FILTERING TESTS
        describe('VacancyClass Filtering', () => {
            let mockUnitsWithVacancyClass: UnitData[];

            beforeEach(() => {
                mockUnitsWithVacancyClass = [
                    {
                        ...mockUnits[0],
                        unitID: 'unit-unoccupied',
                        unitNumber: '101',
                        vacancyClass: 'Unoccupied' as VacancyClass,
                        feedInclusion: { apartments_com: true, zillow: true }
                    },
                    {
                        ...mockUnits[0],
                        unitID: 'unit-occupied',
                        unitNumber: '102',
                        vacancyClass: 'Occupied' as VacancyClass,
                        feedInclusion: { apartments_com: true, zillow: true }
                    },
                    {
                        ...mockUnits[0],
                        unitID: 'unit-notice',
                        unitNumber: '103',
                        vacancyClass: 'Notice' as VacancyClass,
                        feedInclusion: { apartments_com: true, zillow: true }
                    },
                    {
                        ...mockUnits[0],
                        unitID: 'unit-down',
                        unitNumber: '104',
                        vacancyClass: 'Down' as VacancyClass,
                        feedInclusion: { apartments_com: true, zillow: true }
                    }
                ];
            });

            it('should filter out units with vacancyClass Down', async () => {
                const xml = await generateMITSFeed({
                    building: mockBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnitsWithVacancyClass,
                    siteName: 'apartments_com'
                });

                expect(xml).not.toContain('<UnitID>unit-down</UnitID>');
                expect(xml).not.toContain('<UnitNumber>104</UnitNumber>');
            });

            it('should include Occupied units when feedInclusion is true', async () => {
                const xml = await generateMITSFeed({
                    building: mockBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnitsWithVacancyClass,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<UnitID>unit-occupied</UnitID>');
                expect(xml).toContain('<VacancyClass>Occupied</VacancyClass>');
            });

            it('should include Unoccupied units', async () => {
                const xml = await generateMITSFeed({
                    building: mockBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnitsWithVacancyClass,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<UnitID>unit-unoccupied</UnitID>');
                expect(xml).toContain('<VacancyClass>Unoccupied</VacancyClass>');
            });

            it('should include Notice units', async () => {
                const xml = await generateMITSFeed({
                    building: mockBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnitsWithVacancyClass,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<UnitID>unit-notice</UnitID>');
                expect(xml).toContain('<VacancyClass>Notice</VacancyClass>');
            });

            it('should output proper VacancyClass values in XML', async () => {
                const xml = await generateMITSFeed({
                    building: mockBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnitsWithVacancyClass,
                    siteName: 'apartments_com'
                });

                // Count how many units should be included (all except Down)
                const includedUnits = _.filter(mockUnitsWithVacancyClass, u => u.vacancyClass !== 'Down');
                expect(includedUnits).toHaveLength(3);

                // Verify XML contains VacancyClass for each included unit
                expect(xml).toContain('<VacancyClass>Unoccupied</VacancyClass>');
                expect(xml).toContain('<VacancyClass>Occupied</VacancyClass>');
                expect(xml).toContain('<VacancyClass>Notice</VacancyClass>');
            });

            it('should fallback to occupied field for backward compatibility', async () => {
                const legacyUnits: UnitData[] = [
                    {
                        ...mockUnits[0],
                        unitID: 'unit-legacy-vacant',
                        occupied: false,
                        vacancyClass: undefined,
                        feedInclusion: { apartments_com: true }
                    },
                    {
                        ...mockUnits[0],
                        unitID: 'unit-legacy-occupied',
                        occupied: true,
                        vacancyClass: undefined,
                        feedInclusion: { apartments_com: true }
                    }
                ];

                const xml = await generateMITSFeed({
                    building: mockBuilding,
                    unitTypes: mockUnitTypes,
                    units: legacyUnits,
                    siteName: 'apartments_com'
                });

                // Backward compatibility: occupied: false -> Unoccupied
                expect(xml).toContain('<VacancyClass>Unoccupied</VacancyClass>');
                // occupied: true -> Occupied
                expect(xml).toContain('<VacancyClass>Occupied</VacancyClass>');
            });
        });

        // 3. RENTAL TYPE MAPPING TESTS
        describe('RentalType Mapping', () => {
            it('should map senior specialtyType to Senior RentalType', async () => {
                const seniorBuilding: BuildingData = {
                    ...mockBuilding,
                    specialtyType: 'senior'
                };

                const xml = await generateMITSFeed({
                    building: seniorBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<RentalType>Senior</RentalType>');
            });

            it('should map student specialtyType to Student RentalType', async () => {
                const studentBuilding: BuildingData = {
                    ...mockBuilding,
                    specialtyType: 'student'
                };

                const xml = await generateMITSFeed({
                    building: studentBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<RentalType>Student</RentalType>');
            });

            it('should map affordable specialtyType to Affordable RentalType', async () => {
                const affordableBuilding: BuildingData = {
                    ...mockBuilding,
                    specialtyType: 'affordable'
                };

                const xml = await generateMITSFeed({
                    building: affordableBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<RentalType>Affordable</RentalType>');
            });

            it('should default to Market Rate when no specialtyType', async () => {
                const regularBuilding: BuildingData = {
                    ...mockBuilding,
                    specialtyType: undefined
                };

                const xml = await generateMITSFeed({
                    building: regularBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<RentalType>Market Rate</RentalType>');
            });

            it('should default to Market Rate for unrecognized specialtyType', async () => {
                const customBuilding: BuildingData = {
                    ...mockBuilding,
                    specialtyType: 'luxury'
                };

                const xml = await generateMITSFeed({
                    building: customBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<RentalType>Market Rate</RentalType>');
            });

            it('should handle case-insensitive specialtyType matching', async () => {
                const capitalizedBuilding: BuildingData = {
                    ...mockBuilding,
                    specialtyType: 'SENIOR'
                };

                const xml = await generateMITSFeed({
                    building: capitalizedBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<RentalType>Senior</RentalType>');
            });
        });

        // 4. WEBSITE DIFFERENTIATION TESTS
        describe('Website Differentiation', () => {
            it('should use propertyWebsite in Property_ID section', async () => {
                const buildingWithWebsites: BuildingData = {
                    ...mockBuilding,
                    contactInfo: {
                        ...mockBuilding.contactInfo,
                        propertyWebsite: 'https://property-specific.com',
                        managementWebsite: 'https://management-company.com'
                    }
                };

                const xml = await generateMITSFeed({
                    building: buildingWithWebsites,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                // Property_ID section should use propertyWebsite
                const propertyIdMatch = xml.match(/<Property_ID>[\s\S]*?<\/Property_ID>/);
                expect(propertyIdMatch?.[0]).toContain('https://property-specific.com');
            });

            it('should use propertyWebsite in Information section', async () => {
                const buildingWithWebsites: BuildingData = {
                    ...mockBuilding,
                    contactInfo: {
                        ...mockBuilding.contactInfo,
                        propertyWebsite: 'https://property-info.com',
                        managementWebsite: 'https://mgmt-info.com'
                    }
                };

                const xml = await generateMITSFeed({
                    building: buildingWithWebsites,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                // Information section should use propertyWebsite
                const informationMatch = xml.match(/<Information>[\s\S]*?<\/Information>/);
                expect(informationMatch?.[0]).toContain('https://property-info.com');
            });

            it('should use managementWebsite in Management section', async () => {
                const buildingWithWebsites: BuildingData = {
                    ...mockBuilding,
                    contactInfo: {
                        ...mockBuilding.contactInfo,
                        propertyWebsite: 'https://property-mgmt-test.com',
                        managementWebsite: 'https://management-only.com'
                    }
                };

                const xml = await generateMITSFeed({
                    building: buildingWithWebsites,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                // Management section should use managementWebsite
                const managementMatch = xml.match(/<Management>[\s\S]*?<\/Management>/);
                expect(managementMatch?.[0]).toContain('https://management-only.com');
            });

            it('should fallback to old website field for backward compatibility', async () => {
                const legacyBuilding: BuildingData = {
                    ...mockBuilding,
                    contactInfo: {
                        ...mockBuilding.contactInfo,
                        website: 'https://legacy-website.com',
                        propertyWebsite: undefined,
                        managementWebsite: undefined
                    } as ContactInfo & { website?: string }
                };

                const xml = await generateMITSFeed({
                    building: legacyBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                // Should use legacy website in both Property_ID and Information
                const propertyIdMatch = xml.match(/<Property_ID>[\s\S]*?<\/Property_ID>/);
                const informationMatch = xml.match(/<Information>[\s\S]*?<\/Information>/);
                expect(propertyIdMatch?.[0]).toContain('https://legacy-website.com');
                expect(informationMatch?.[0]).toContain('https://legacy-website.com');
            });

            it('should prioritize propertyWebsite over legacy website', async () => {
                const buildingWithBoth: BuildingData = {
                    ...mockBuilding,
                    contactInfo: {
                        ...mockBuilding.contactInfo,
                        website: 'https://old-legacy.com',
                        propertyWebsite: 'https://new-property.com'
                    } as ContactInfo & { website?: string }
                };

                const xml = await generateMITSFeed({
                    building: buildingWithBoth,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                // Should use propertyWebsite, not legacy website
                expect(xml).toContain('https://new-property.com');
                expect(xml).not.toContain('https://old-legacy.com');
            });
        });

        // 5. DEPOSIT DETAILS TESTS
        describe('Deposit Details', () => {
            it('should handle deposit as number (backward compatibility)', async () => {
                const unitTypesWithNumberDeposit: UnitTypeData[] = [
                    {
                        ...mockUnitTypes[0],
                        deposit: 1500
                    }
                ];

                const xml = await generateMITSFeed({
                    building: mockBuilding,
                    unitTypes: unitTypesWithNumberDeposit,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<Value>1500</Value>');
                // Should not include refundable info for simple number deposits
                expect(xml).not.toContain('<Refundable>');
                expect(xml).not.toContain('<PartialRefund>');
            });

            it('should handle deposit as enhanced object with refundable flag', async () => {
                const enhancedDeposit: Deposit = {
                    amount: 2000,
                    refundable: true
                };

                const unitTypesWithEnhancedDeposit: UnitTypeData[] = [
                    {
                        ...mockUnitTypes[0],
                        deposit: enhancedDeposit
                    }
                ];

                const xml = await generateMITSFeed({
                    building: mockBuilding,
                    unitTypes: unitTypesWithEnhancedDeposit,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<Value>2000</Value>');
                expect(xml).toContain('<Refundable>true</Refundable>');
            });

            it('should handle deposit as non-refundable enhanced object', async () => {
                const nonRefundableDeposit: Deposit = {
                    amount: 1800,
                    refundable: false
                };

                const unitTypesWithNonRefundable: UnitTypeData[] = [
                    {
                        ...mockUnitTypes[0],
                        deposit: nonRefundableDeposit
                    }
                ];

                const xml = await generateMITSFeed({
                    building: mockBuilding,
                    unitTypes: unitTypesWithNonRefundable,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<Value>1800</Value>');
                expect(xml).toContain('<Refundable>false</Refundable>');
            });

            it('should handle deposit with partialRefundPercentage', async () => {
                const partialRefundDeposit: Deposit = {
                    amount: 2500,
                    refundable: false,
                    partialRefundPercentage: 75
                };

                const unitTypesWithPartialRefund: UnitTypeData[] = [
                    {
                        ...mockUnitTypes[0],
                        deposit: partialRefundDeposit
                    }
                ];

                const xml = await generateMITSFeed({
                    building: mockBuilding,
                    unitTypes: unitTypesWithPartialRefund,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<Value>2500</Value>');
                expect(xml).toContain('<Refundable>false</Refundable>');
                expect(xml).toContain('<PartialRefund>75%</PartialRefund>');
            });

            it('should extract amount from enhanced deposit object', async () => {
                const complexDeposit: Deposit = {
                    amount: 3200,
                    refundable: true,
                    partialRefundPercentage: 90
                };

                const unitTypesWithComplexDeposit: UnitTypeData[] = [
                    {
                        ...mockUnitTypes[0],
                        deposit: complexDeposit
                    }
                ];

                const xml = await generateMITSFeed({
                    building: mockBuilding,
                    unitTypes: unitTypesWithComplexDeposit,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<Value>3200</Value>');
                expect(xml).toContain('<Refundable>true</Refundable>');
                expect(xml).toContain('<PartialRefund>90%</PartialRefund>');
            });

            it('should handle missing deposit gracefully', async () => {
                const unitTypesWithoutDeposit: UnitTypeData[] = [
                    {
                        ...mockUnitTypes[0],
                        deposit: undefined
                    },
                    {
                        ...mockUnitTypes[1],
                        deposit: undefined
                    }
                ];

                const buildingWithoutPetDeposit: BuildingData = {
                    ...mockBuilding,
                    petPolicies: {
                        allowed: false  // No pet deposit/fees
                    }
                };

                const xml = await generateMITSFeed({
                    building: buildingWithoutPetDeposit,
                    unitTypes: unitTypesWithoutDeposit,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                // Should not include any deposit section when unit type deposits are undefined
                // and pet policies don't have deposits
                expect(xml).not.toContain('<Deposit>');
                expect(xml).not.toContain('<Value>');
                expect(xml).not.toContain('<Refundable>');
            });
        });

        // 6. PET POLICY ENHANCEMENT TESTS
        describe('Pet Policy Enhancement', () => {
            it('should handle basic pet policy without per-type details', async () => {
                const basicPetBuilding: BuildingData = {
                    ...mockBuilding,
                    petPolicies: {
                        allowed: true,
                        deposit: 300,
                        monthlyFee: 25
                    }
                };

                const xml = await generateMITSFeed({
                    building: basicPetBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<Pet>');
                expect(xml).toContain('<Allowed>true</Allowed>');
                expect(xml).toContain('<Deposit>300</Deposit>');
                expect(xml).toContain('<Fee>25</Fee>');
            });

            it('should handle per-pet-type policies in MITS format', async () => {
                const petTypes: PetTypePolicy[] = [
                    {
                        type: 'dog',
                        weightLimit: 50,
                        countLimit: 2,
                        fee: 35,
                        deposit: 400,
                        breedRestrictions: ['Pit Bull', 'Rottweiler']
                    },
                    {
                        type: 'cat',
                        countLimit: 3,
                        fee: 20,
                        deposit: 200
                    }
                ];

                const enhancedPetBuilding: BuildingData = {
                    ...mockBuilding,
                    petPolicies: {
                        allowed: true,
                        petTypes: petTypes,
                        notes: 'Detailed per-type policies apply'
                    }
                };

                const xml = await generateMITSFeed({
                    building: enhancedPetBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                // Basic pet policy structure should still be present
                expect(xml).toContain('<Pet>');
                expect(xml).toContain('<Allowed>true</Allowed>');
                expect(xml).toContain('<Comment>Detailed per-type policies apply</Comment>');

                // Note: MITS 4.1 doesn't have per-pet-type fields natively,
                // so we test that the basic structure works for now
                // Future enhancement could add custom extensions
            });

            it('should handle pet policy with breed restrictions', async () => {
                const restrictivePetBuilding: BuildingData = {
                    ...mockBuilding,
                    petPolicies: {
                        allowed: true,
                        weightLimit: 30,
                        breedRestrictions: ['Pit Bull', 'German Shepherd', 'Rottweiler'],
                        deposit: 500,
                        monthlyFee: 40,
                        notes: 'Weight and breed restrictions apply. Contact office for full list.'
                    }
                };

                const xml = await generateMITSFeed({
                    building: restrictivePetBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<Pet>');
                expect(xml).toContain('<Allowed>true</Allowed>');
                expect(xml).toContain('<Deposit>500</Deposit>');
                expect(xml).toContain('<Fee>40</Fee>');
                expect(xml).toContain('<Comment>Weight and breed restrictions apply. Contact office for full list.</Comment>');
            });

            it('should handle no pets allowed policy', async () => {
                const noPetBuilding: BuildingData = {
                    ...mockBuilding,
                    petPolicies: {
                        allowed: false,
                        notes: 'Sorry, no pets allowed'
                    }
                };

                const xml = await generateMITSFeed({
                    building: noPetBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<Pet>');
                expect(xml).toContain('<Allowed>false</Allowed>');
                expect(xml).toContain('<Comment>Sorry, no pets allowed</Comment>');

                // Should not include deposit/fee in the Pet policy section for no-pets policy
                // Check that the Pet section specifically doesn't contain deposit/fee
                const petMatch = xml.match(/<Pet>[\s\S]*?<\/Pet>/);
                expect(petMatch?.[0]).not.toContain('<Deposit>');
                expect(petMatch?.[0]).not.toContain('<Fee>');
            });

            it('should handle missing pet policy gracefully', async () => {
                const noPolicyBuilding: BuildingData = {
                    ...mockBuilding,
                    petPolicies: undefined
                };

                const xml = await generateMITSFeed({
                    building: noPolicyBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                // Should not include Pet section if no policy defined
                expect(xml).not.toContain('<Pet>');
            });

            it('should handle complex per-pet-type fee structures', async () => {
                const complexPetTypes: PetTypePolicy[] = [
                    {
                        type: 'dog',
                        weightLimit: 75,
                        countLimit: 1,
                        fee: 50,
                        deposit: 600,
                        breedRestrictions: ['Pit Bull', 'Rottweiler', 'Doberman']
                    },
                    {
                        type: 'cat',
                        countLimit: 2,
                        fee: 25,
                        deposit: 300
                    },
                    {
                        type: 'bird',
                        countLimit: 3,
                        fee: 15,
                        deposit: 100
                    }
                ];

                const complexPetBuilding: BuildingData = {
                    ...mockBuilding,
                    petPolicies: {
                        allowed: true,
                        petTypes: complexPetTypes,
                        notes: 'Different policies apply per pet type. Contact office for details.'
                    }
                };

                const xml = await generateMITSFeed({
                    building: complexPetBuilding,
                    unitTypes: mockUnitTypes,
                    units: mockUnits,
                    siteName: 'apartments_com'
                });

                expect(xml).toContain('<Pet>');
                expect(xml).toContain('<Allowed>true</Allowed>');
                expect(xml).toContain('<Comment>Different policies apply per pet type. Contact office for details.</Comment>');

                // Test validates basic structure - per-type details would need MITS extension
                // or custom XML extensions for full support
            });
        });
    });
});
