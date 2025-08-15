import { describe, it, expect, beforeEach, spyOn } from 'bun:test';
import { generateMITSFeed } from '../../src/mits/generator';
import * as geocodingModule from '../../src/services/geocoding';
import {
    createMockBuilding,
    createMockUnitTypes,
    createMockUnits
} from './generator-fixtures';
import type { BuildingData, UnitData, UnitTypeData } from '../../src/types';

describe('MITS Coordinate Handling', () => {
    let mockBuilding: BuildingData;
    let mockUnitTypes: UnitTypeData[];
    let mockUnits: UnitData[];

    beforeEach(() => {
        mockBuilding = createMockBuilding();
        mockUnitTypes = createMockUnitTypes();
        mockUnits = createMockUnits();
    });

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
});
