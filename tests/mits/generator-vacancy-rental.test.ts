import { describe, it, expect, beforeEach } from 'bun:test';
import { filter } from 'lodash';
import { generateMITSFeed } from '../../src/mits/generator';
import {
    createMockBuilding,
    createMockUnitTypes,
    createMockUnits,
    createMockUnitsWithVacancyClass
} from './generator-fixtures';
import type { BuildingData, UnitData, UnitTypeData } from '../../src/types';

describe('MITS Vacancy Class and Rental Type Mapping', () => {
    let mockBuilding: BuildingData;
    let mockUnitTypes: UnitTypeData[];
    let mockUnits: UnitData[];

    beforeEach(() => {
        mockBuilding = createMockBuilding();
        mockUnitTypes = createMockUnitTypes();
        mockUnits = createMockUnits();
    });

    describe('VacancyClass Filtering', () => {
        it('should filter out units with vacancyClass Down', async () => {
            const mockUnitsWithVacancyClass = createMockUnitsWithVacancyClass();

            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnitsWithVacancyClass,
                siteName:  'apartments_com'
            });

            expect(xml).not.toContain('<UnitID>unit-down</UnitID>');
            expect(xml).not.toContain('<UnitNumber>104</UnitNumber>');
        });

        it('should include Occupied units when feedInclusion is true', async () => {
            const mockUnitsWithVacancyClass = createMockUnitsWithVacancyClass();

            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnitsWithVacancyClass,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<UnitID>unit-occupied</UnitID>');
            expect(xml).toContain('<VacancyClass>Occupied</VacancyClass>');
        });

        it('should include Unoccupied units', async () => {
            const mockUnitsWithVacancyClass = createMockUnitsWithVacancyClass();

            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnitsWithVacancyClass,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<UnitID>unit-unoccupied</UnitID>');
            expect(xml).toContain('<VacancyClass>Unoccupied</VacancyClass>');
        });

        it('should include Notice units', async () => {
            const mockUnitsWithVacancyClass = createMockUnitsWithVacancyClass();

            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnitsWithVacancyClass,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<UnitID>unit-notice</UnitID>');
            expect(xml).toContain('<VacancyClass>Notice</VacancyClass>');
        });

        it('should output proper VacancyClass values in XML', async () => {
            const mockUnitsWithVacancyClass = createMockUnitsWithVacancyClass();

            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnitsWithVacancyClass,
                siteName:  'apartments_com'
            });

            // Count how many units should be included (all except Down)
            const includedUnits = filter(mockUnitsWithVacancyClass, u => u.vacancyClass !== 'Down');
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
                    unitID:        'unit-legacy-vacant',
                    occupied:      false,
                    vacancyClass:  undefined,
                    feedInclusion: { apartments_com: true }
                },
                {
                    ...mockUnits[0],
                    unitID:        'unit-legacy-occupied',
                    occupied:      true,
                    vacancyClass:  undefined,
                    feedInclusion: { apartments_com: true }
                }
            ];

            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     legacyUnits,
                siteName:  'apartments_com'
            });

            // Backward compatibility: occupied: false -> Unoccupied
            expect(xml).toContain('<VacancyClass>Unoccupied</VacancyClass>');
            // occupied: true -> Occupied
            expect(xml).toContain('<VacancyClass>Occupied</VacancyClass>');
        });
    });

    describe('RentalType Mapping', () => {
        it('should map senior specialtyType to Senior RentalType', async () => {
            const seniorBuilding: BuildingData = {
                ...mockBuilding,
                specialtyType: 'senior'
            };

            const xml = await generateMITSFeed({
                building:  seniorBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<RentalType>Senior</RentalType>');
        });

        it('should map student specialtyType to Student RentalType', async () => {
            const studentBuilding: BuildingData = {
                ...mockBuilding,
                specialtyType: 'student'
            };

            const xml = await generateMITSFeed({
                building:  studentBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<RentalType>Student</RentalType>');
        });

        it('should map affordable specialtyType to Affordable RentalType', async () => {
            const affordableBuilding: BuildingData = {
                ...mockBuilding,
                specialtyType: 'affordable'
            };

            const xml = await generateMITSFeed({
                building:  affordableBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<RentalType>Affordable</RentalType>');
        });

        it('should default to Market Rate when no specialtyType', async () => {
            const regularBuilding: BuildingData = {
                ...mockBuilding,
                specialtyType: undefined
            };

            const xml = await generateMITSFeed({
                building:  regularBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<RentalType>Market Rate</RentalType>');
        });

        it('should default to Market Rate for unrecognized specialtyType', async () => {
            const customBuilding: BuildingData = {
                ...mockBuilding,
                specialtyType: 'luxury'
            };

            const xml = await generateMITSFeed({
                building:  customBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<RentalType>Market Rate</RentalType>');
        });

        it('should handle case-insensitive specialtyType matching', async () => {
            const capitalizedBuilding: BuildingData = {
                ...mockBuilding,
                specialtyType: 'SENIOR'
            };

            const xml = await generateMITSFeed({
                building:  capitalizedBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<RentalType>Senior</RentalType>');
        });
    });
});
