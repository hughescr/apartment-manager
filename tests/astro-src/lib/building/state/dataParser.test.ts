/**
 * Tests for BuildingDataParser - Critical data parsing and sanitization functionality
 * Tests JSON parsing, data validation, error handling, and security considerations
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { BuildingDataParser } from '../../../../../astro-src/lib/building/state.ts';
import {
    resetAllMocks,
    createTestBuildingData,
    createTestExtendedUnitData,
    createTestUnitTypeData,
    createMockHtmlElement
} from './test-setup';
import type { ExtendedUnitData } from '../../../../../astro-src/lib/building/types';
import { repeat, forEach } from 'lodash';
import { jest } from 'bun:test';
import { AmenityCategory } from '../../../../../src/types/index.js';

describe('BuildingDataParser', () => {
    beforeEach(() => {
        resetAllMocks();
    });

    describe('Building Data Parsing', () => {
        test('should parse valid building data from HTML element', () => {
            const testBuilding = createTestBuildingData();
            const element = createMockHtmlElement({
                buildingData: JSON.stringify(testBuilding)
            });

            const result = BuildingDataParser.parseBuildingData(element);

            expect(result).toBeDefined();
            expect(result!.buildingID).toBe(testBuilding.buildingID);
            expect(result!.buildingName).toBe(testBuilding.buildingName);
            // JSON parsing converts Date to string
            expect(result!.updatedAt as unknown as string).toBe(testBuilding.updatedAt!.toISOString());
        });

        test('should handle element with data attribute directly', () => {
            const testBuilding = createTestBuildingData();
            const mockElement = {
                hasAttribute: jest.fn().mockReturnValue(true),
                dataset:      {
                    buildingData: JSON.stringify(testBuilding)
                },
                querySelector: jest.fn()
            } as unknown as HTMLElement;

            const result = BuildingDataParser.parseBuildingData(mockElement);

            expect(result).toBeDefined();
            expect(result!.buildingID).toBe(testBuilding.buildingID);
            expect(result!.buildingName).toBe(testBuilding.buildingName);
            // JSON parsing converts Date to string
            expect(result!.updatedAt as unknown as string).toBe(testBuilding.updatedAt!.toISOString());
            expect(mockElement.hasAttribute).toHaveBeenCalledWith('data-building-data');
            expect(mockElement.querySelector).not.toHaveBeenCalled();
        });

        test('should return null when no building data element found', () => {
            const mockElement = {
                hasAttribute:  jest.fn().mockReturnValue(false),
                querySelector: jest.fn().mockReturnValue(null)
            } as unknown as HTMLElement;

            const result = BuildingDataParser.parseBuildingData(mockElement);

            expect(result).toBeNull();
        });

        test('should return null when building data is empty', () => {
            const element = createMockHtmlElement({
                buildingData: ''
            });

            const result = BuildingDataParser.parseBuildingData(element);

            expect(result).toBeNull();
        });

        test('should handle malformed JSON gracefully', () => {
            const element = createMockHtmlElement({
                buildingData: '{invalid json}'
            });

            const result = BuildingDataParser.parseBuildingData(element);

            expect(result).toBeNull();
        });

        test('should handle JSON with special characters', () => {
            const testBuilding = createTestBuildingData({
                description: 'Building with "quotes" and \\ backslashes & special chars <script>'
            });
            const element = createMockHtmlElement({
                buildingData: JSON.stringify(testBuilding)
            });

            const result = BuildingDataParser.parseBuildingData(element);

            expect(result?.description).toBe('Building with "quotes" and \\ backslashes & special chars <script>');
        });

        test('should handle extremely large JSON data', () => {
            const largeBuilding = createTestBuildingData({
                description: repeat('A', 10000) // Very large description
            });
            const element = createMockHtmlElement({
                buildingData: JSON.stringify(largeBuilding)
            });

            const result = BuildingDataParser.parseBuildingData(element);

            expect(result?.description).toHaveLength(10000);
        });
    });

    describe('Units Data Parsing', () => {
        test('should parse valid units data from HTML element', () => {
            const testUnits = [createTestExtendedUnitData(), createTestExtendedUnitData({ unitID: 'unit-2' })];
            const element = createMockHtmlElement({
                initialUnits: JSON.stringify(testUnits)
            });

            const result = BuildingDataParser.parseUnitsData(element);

            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                unitID:      testUnits[0].unitID,
                status:      expect.any(String),
                lastUpdated: expect.any(String),
                currentRent: expect.any(Number),
                editingRent: false,
                savingField: null
            });
        });

        test('should return empty array when no units element found', () => {
            const mockElement = {
                hasAttribute:  jest.fn().mockReturnValue(false),
                querySelector: jest.fn().mockReturnValue(null)
            } as unknown as HTMLElement;

            const result = BuildingDataParser.parseUnitsData(mockElement);

            expect(result).toEqual([]);
        });

        test('should return empty array when units data is empty', () => {
            const element = createMockHtmlElement({
                initialUnits: ''
            });

            const result = BuildingDataParser.parseUnitsData(element);

            expect(result).toEqual([]);
        });

        test('should handle malformed units JSON gracefully', () => {
            const element = createMockHtmlElement({
                initialUnits: '[invalid json}'
            });

            const result = BuildingDataParser.parseUnitsData(element);

            expect(result).toEqual([]);
        });

        test('should properly initialize extended properties for units', () => {
            const baseUnits = [
                {
                    unitID:       'unit-1',
                    buildingID:   'building-1',
                    modelID:      'model-1',
                    unitNumber:   '101',
                    beds:         1,
                    baths:        1,
                    sqft:         800,
                    rent:         2500,
                    vacancyClass: 'Occupied' as const
                }
            ];
            const element = createMockHtmlElement({
                initialUnits: JSON.stringify(baseUnits)
            });

            const result = BuildingDataParser.parseUnitsData(element);

            expect(result[0]).toMatchObject({
                unitID:      'unit-1',
                status:      'Occupied',
                lastUpdated: expect.any(String),
                currentRent: 2500,
                editingRent: false,
                savingField: null
            });
        });

        test('should handle units with missing optional properties', () => {
            const incompleteUnits = [
                {
                    unitID:     'unit-1',
                    buildingID: 'building-1',
                    modelID:    'model-1',
                    unitNumber: '101'
                    // Missing rent, lastUpdated, etc.
                }
            ];
            const element = createMockHtmlElement({
                initialUnits: JSON.stringify(incompleteUnits)
            });

            const result = BuildingDataParser.parseUnitsData(element);

            expect(result[0]).toMatchObject({
                unitID:      'unit-1',
                status:      expect.any(String),
                currentRent: 0,
                editingRent: false,
                savingField: null
            });
        });
    });

    describe('Unit Types Data Parsing', () => {
        test('should parse valid unit types data from HTML element', () => {
            const testUnitTypes = [createTestUnitTypeData(), createTestUnitTypeData({ modelID: 'model-2' })];
            const element = createMockHtmlElement({
                initialUnitTypes: JSON.stringify(testUnitTypes)
            });

            const result = BuildingDataParser.parseUnitTypesData(element);

            expect(result).toHaveLength(testUnitTypes.length);
            expect(result[0].modelID).toBe(testUnitTypes[0]?.modelID);
            expect(result[0].modelName).toBe(testUnitTypes[0]?.modelName);
            // JSON parsing converts Date to string
            expect(result[0].updatedAt as unknown as string).toBe(testUnitTypes[0].updatedAt!.toISOString());
        });

        test('should return empty array when no unit types element found', () => {
            const mockElement = {
                hasAttribute:  jest.fn().mockReturnValue(false),
                querySelector: jest.fn().mockReturnValue(null)
            } as unknown as HTMLElement;

            const result = BuildingDataParser.parseUnitTypesData(mockElement);

            expect(result).toEqual([]);
        });

        test('should return empty array when unit types data is empty', () => {
            const element = createMockHtmlElement({
                initialUnitTypes: ''
            });

            const result = BuildingDataParser.parseUnitTypesData(element);

            expect(result).toEqual([]);
        });

        test('should handle malformed unit types JSON gracefully', () => {
            const element = createMockHtmlElement({
                initialUnitTypes: '{invalid json array'
            });

            const result = BuildingDataParser.parseUnitTypesData(element);

            expect(result).toEqual([]);
        });
    });

    describe('Location Data Parsing', () => {
        test('should parse valid location data from HTML element', () => {
            const locationConfig = {
                lat:         40.7128,
                lng:         -74.0060,
                mapboxToken: 'test-token'
            };
            const element = createMockHtmlElement({
                locationConfig: JSON.stringify(locationConfig)
            });

            const result = BuildingDataParser.parseLocationData(element);

            expect(result).toEqual(locationConfig);
        });

        test('should return null when no location element found', () => {
            const mockElement = {
                hasAttribute:  jest.fn().mockReturnValue(false),
                querySelector: jest.fn().mockReturnValue(null)
            } as unknown as HTMLElement;

            const result = BuildingDataParser.parseLocationData(mockElement);

            expect(result).toBeNull();
        });

        test('should return null when location data is empty', () => {
            const element = createMockHtmlElement({
                locationConfig: ''
            });

            const result = BuildingDataParser.parseLocationData(element);

            expect(result).toBeNull();
        });

        test('should handle malformed location JSON gracefully', () => {
            const element = createMockHtmlElement({
                locationConfig: '{invalid: json'
            });

            const result = BuildingDataParser.parseLocationData(element);

            expect(result).toBeNull();
        });
    });

    describe('API URL Parsing', () => {
        test('should parse API URL from HTML element', () => {
            const testUrl = '/api/buildings/test-building-123';
            const element = createMockHtmlElement({
                apiUrl: testUrl
            });

            const result = BuildingDataParser.parseApiUrl(element);

            expect(result).toBe(testUrl);
        });

        test('should return empty string when no API URL element found', () => {
            const mockElement = {
                hasAttribute:  jest.fn().mockReturnValue(false),
                querySelector: jest.fn().mockReturnValue(null)
            } as unknown as HTMLElement;

            const result = BuildingDataParser.parseApiUrl(mockElement);

            expect(result).toBe('');
        });

        test('should return empty string when API URL is undefined', () => {
            const mockElement = {
                hasAttribute: jest.fn().mockReturnValue(true),
                dataset:      {}
            } as unknown as HTMLElement;

            const result = BuildingDataParser.parseApiUrl(mockElement);

            expect(result).toBe('');
        });
    });

    describe('Unit Status Mapping', () => {
        test('should map vacancy classes to correct statuses', () => {
            const testCases = [
                { vacancyClass: 'Occupied', expectedStatus: 'Occupied' },
                { vacancyClass: 'Notice', expectedStatus: 'Notice to Vacate' },
                { vacancyClass: 'Unoccupied', expectedStatus: 'Vacant' },
                { vacancyClass: 'Down', expectedStatus: 'Model Unit' },
                { vacancyClass: 'Unknown', expectedStatus: 'Unknown' },
                { vacancyClass: undefined, expectedStatus: 'Unknown' }
            ];

            forEach(testCases, ({ vacancyClass, expectedStatus }) => {
                // Create unit with only the base properties we need to test status mapping
                const baseUnit = {
                    unitID:     'test-unit',
                    buildingID: 'test-building',
                    modelID:    'test-model',
                    unitNumber: '101',
                    beds:       1,
                    baths:      1,
                    sqft:       800,
                    rent:       2500,
                    vacancyClass
                };
                const element = createMockHtmlElement({
                    initialUnits: JSON.stringify([baseUnit])
                });

                const result = BuildingDataParser.parseUnitsData(element);

                expect(result[0].status).toBe(expectedStatus);
            });
        });
    });

    describe('Timestamp Initialization', () => {
        test('should initialize timestamps for units without lastUpdated', () => {
            const unitsWithoutTimestamp = [
                createTestExtendedUnitData({ lastUpdated: undefined }),
                createTestExtendedUnitData({ lastUpdated: undefined, unitID: 'unit-2' })
            ];
            const unitsWithTimestamp = [
                createTestExtendedUnitData({ lastUpdated: '2024-01-01T10:00:00Z', unitID: 'unit-3' })
            ];
            const allUnits = [...unitsWithoutTimestamp, ...unitsWithTimestamp];

            BuildingDataParser.initializeUnitTimestamps(allUnits);

            // Units without timestamp should get one
            expect(allUnits[0].lastUpdated).toBeDefined();
            expect(allUnits[1].lastUpdated).toBeDefined();

            // Unit with existing timestamp should keep it
            expect(allUnits[2].lastUpdated).toBe('2024-01-01T10:00:00Z');
        });

        test('should handle empty units array', () => {
            const units: ExtendedUnitData[] = [];

            expect(() => {
                BuildingDataParser.initializeUnitTimestamps(units);
            }).not.toThrow();
        });
    });

    describe('Data Serialization', () => {
        test('should serialize building data to JSON string', () => {
            const building = createTestBuildingData();

            const result = BuildingDataParser.serializeBuildingData(building);

            expect(typeof result).toBe('string');
            const parsed = JSON.parse(result);
            expect(parsed.buildingID).toBe(building.buildingID);
            expect(parsed.buildingName).toBe(building.buildingName);
            // Date objects are serialized as ISO strings
            expect(parsed.updatedAt).toBe(building.updatedAt?.toISOString());
        });

        test('should serialize units data and remove runtime properties', () => {
            const units = [
                createTestExtendedUnitData({
                    editingRent: true,
                    savingField: 'rent'
                })
            ];

            const result = BuildingDataParser.serializeUnitsData(units);
            const parsedResult = JSON.parse(result);

            expect(parsedResult[0]).not.toHaveProperty('editingRent');
            expect(parsedResult[0]).not.toHaveProperty('savingField');
            expect(parsedResult[0]).toHaveProperty('unitID');
            expect(parsedResult[0]).toHaveProperty('rent');
        });

        test('should handle serialization of complex data structures', () => {
            const complexBuilding = createTestBuildingData({
                rentSpecials: [
                    { id: 1, title: 'Complex "Special"', description: 'With\nNewlines' }
                ],
                propertyAmenities: [
                    { name: 'Pool & Spa', category: AmenityCategory.PROPERTY }
                ]
            });

            const result = BuildingDataParser.serializeBuildingData(complexBuilding);
            const parsedResult = JSON.parse(result);

            expect(parsedResult.rentSpecials[0].title).toBe('Complex "Special"');
            expect(parsedResult.rentSpecials[0].description).toBe('With\nNewlines');
        });
    });

    describe('Security and Edge Cases', () => {
        test('should handle potential XSS in JSON data', () => {
            const maliciousData = {
                buildingName: '<script>alert("xss")</script>',
                description:  'javascript:alert("xss")'
            };
            const element = createMockHtmlElement({
                buildingData: JSON.stringify(maliciousData)
            });

            const result = BuildingDataParser.parseBuildingData(element);

            // Data should be parsed as-is (XSS protection happens at display time)
            expect(result?.buildingName).toBe('<script>alert("xss")</script>');
            expect(result?.description).toBe('javascript:alert("xss")');
        });

        test('should handle circular references in serialization', () => {
            const building = createTestBuildingData();
            // Create circular reference
            (building as unknown as Record<string, unknown>).circular = building;

            expect(() => {
                BuildingDataParser.serializeBuildingData(building);
            }).toThrow();
        });

        test('should handle very deeply nested JSON', () => {
            const deepObject: Record<string, unknown> = {};
            let current: Record<string, unknown> = deepObject;
            for(let i = 0; i < 100; i++) {
                current.nested = {};
                current = current.nested as Record<string, unknown>;
            }
            current.value = 'deep';

            const element = createMockHtmlElement({
                buildingData: JSON.stringify(deepObject)
            });

            const result = BuildingDataParser.parseBuildingData(element);
            expect(result).toBeDefined();
        });

        test('should handle null and undefined values in JSON', () => {
            const dataWithNulls = {
                buildingID:   'test',
                buildingName: null,
                description:  undefined,
                totalUnits:   null
            };
            const element = createMockHtmlElement({
                buildingData: JSON.stringify(dataWithNulls)
            });

            const result = BuildingDataParser.parseBuildingData(element);

            expect(result?.buildingID).toBe('test');
            expect(result?.buildingName).toBeNull();
            expect(result).not.toHaveProperty('description'); // undefined is not serialized
            expect(result?.totalUnits).toBeNull();
        });

        test('should handle numeric string values', () => {
            const mixedTypes = {
                buildingID: '123', // String ID
                totalUnits: 50, // Numeric value
                latitude:   40.7128 // Numeric value
            };
            const element = createMockHtmlElement({
                buildingData: JSON.stringify(mixedTypes)
            });

            const result = BuildingDataParser.parseBuildingData(element);

            expect(result?.buildingID).toBe('123');
            expect(result?.totalUnits).toBe(50);
            expect(result?.latitude).toBe(40.7128);
        });
    });

    describe('Error Recovery', () => {
        test('should handle corrupted HTML dataset gracefully', () => {
            const mockElement = {
                hasAttribute: jest.fn().mockImplementation(() => {
                    throw new Error('DOM access error');
                }),
                querySelector: jest.fn()
            } as unknown as HTMLElement;

            expect(() => {
                BuildingDataParser.parseBuildingData(mockElement);
            }).toThrow('DOM access error');
        });

        test('should handle missing dataset property', () => {
            const mockElement = {
                hasAttribute: jest.fn().mockReturnValue(true)
                // Missing dataset property
            } as unknown as HTMLElement;

            const result = BuildingDataParser.parseBuildingData(mockElement);

            expect(result).toBeNull();
        });

        test('should handle JSON parsing errors gracefully', () => {
            const cases = [
                '{"unclosed": "object"',
                '{"trailing": "comma",}',
                '{"duplicate": "key", "duplicate": "value"}',
                'just plain text',
                '123',
                'true',
                'null'
            ];

            forEach(cases, (invalidJson) => {
                const element = createMockHtmlElement({
                    buildingData: invalidJson
                });

                const result = BuildingDataParser.parseBuildingData(element);

                if(invalidJson === '123' || invalidJson === 'true' || invalidJson === 'null') {
                    expect(result).toBeDefined(); // Valid JSON primitives
                } else if(invalidJson === '{"duplicate": "key", "duplicate": "value"}') {
                    // JavaScript allows duplicate keys, last one wins
                    expect(result).toBeDefined();
                } else {
                    expect(result).toBeNull(); // Invalid JSON
                }
            });
        });
    });
});
